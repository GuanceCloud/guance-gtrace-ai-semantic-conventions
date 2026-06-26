# Trace 语义规范

本规范描述 GTrace AI trace 的 span 结构、标准字段、扩展字段和禁止事项。规范基线是 OpenTelemetry GenAI semantic conventions，GTrace 只补充标准尚未覆盖但产品分析需要稳定使用的字段。

## Span 结构

推荐的 Agent trace 结构如下：

```text
invoke_agent
├── chat <model>
│   ├── execute_tool <tool>
│   │   └── skill <name>
│   └── assistant
└── chat <model>
```

实现可以保留历史 span name，例如 `llm`、`tool:<name>`、`skill:<name>`、`hermes_request`，但必须用 `gen_ai.operation.name` 表达标准语义：

| 场景 | `gen_ai.operation.name` | 说明 |
| --- | --- | --- |
| 一次用户请求触发的完整工作流 | `invoke_workflow` | 适用于 Hermes/OpenClaw request 根 span。 |
| 一次 Agent 主执行窗口 | `invoke_agent` | 适用于 Codex/Claude turn 或 Hermes/OpenClaw agent span。 |
| 一次模型调用 | `chat` | 适用于 chat/completion 类 LLM 调用。 |
| 一次工具执行 | `execute_tool` | 适用于 tool span，也适用于由 tool 承载的 skill 调用。 |
| Agent 规划阶段 | `plan` | 仅在宿主能稳定观察 planning 阶段时输出。 |
| 检索或记忆操作 | `retrieval` / `create_memory` / `search_memory` / `update_memory` / `upsert_memory` / `delete_memory` | 仅在宿主能稳定观察 retrieval 或 memory 生命周期时输出。 |

不得使用 `gen_ai.operation.name=skill`。Skill 是 GTrace 扩展语义，应通过 `skill.*` 字段表达。

## 标准字段

以下字段优先使用 OpenTelemetry GenAI 标准字段。

| 字段 | 要求 | 常见 span | 说明 |
| --- | --- | --- | --- |
| `gen_ai.operation.name` | 必选 | 全部 GenAI span | 使用官方 well-known value。 |
| `gen_ai.provider.name` | 条件必选 | `chat`、`invoke_agent` | 模型或托管 Agent provider。 |
| `gen_ai.conversation.id` | 条件必选 | 全部可关联会话的 span | 只有宿主真实提供会话 ID 时输出，不能用 trace id 或内容 hash 伪造。 |
| `gen_ai.agent.name` | 推荐 | Agent / tool span | Agent 可读名称，例如 `codex`、`claude-code`、`hermes`、`openclaw`。 |
| `gen_ai.agent.version` | 推荐 | Agent / tool span 或 resource | Agent 或 CLI 版本。 |
| `gen_ai.request.model` | 条件必选 | `chat`、`invoke_agent` | 请求模型名。 |
| `gen_ai.response.model` | 推荐 | `chat`、`invoke_agent` | 实际响应模型名。 |
| `gen_ai.output.type` | 条件必选 | `chat`、`invoke_agent` | 仅在请求明确输出类型时输出，例如 `text`、`json`、`image`。 |
| `gen_ai.response.finish_reasons` | 推荐 | `chat`、`invoke_agent` | 数组，例如 `["stop"]`。 |
| `gen_ai.response.id` | 推荐 | `chat` | provider response id。 |
| `error.type` | 条件必选 | 错误 span | 低基数错误类型，未知错误用 `_OTHER`。 |
| `server.address` / `server.port` | 推荐 | 远程 provider client span | 可观测到 provider 端地址时输出。 |

请求参数字段在宿主能稳定观测到时输出：

- `gen_ai.request.choice.count`
- `gen_ai.request.frequency_penalty`
- `gen_ai.request.max_tokens`
- `gen_ai.request.presence_penalty`
- `gen_ai.request.reasoning.level`
- `gen_ai.request.seed`
- `gen_ai.request.stop_sequences`
- `gen_ai.request.stream`
- `gen_ai.request.temperature`
- `gen_ai.request.top_k`
- `gen_ai.request.top_p`

## 内容字段

以下字段是 opt-in 内容字段，可能包含敏感信息，必须支持脱敏、截断或关闭：

- `gen_ai.input.messages`
- `gen_ai.output.messages`
- `gen_ai.system_instructions`
- `gen_ai.tool.definitions`
- `gen_ai.prompt.variable.<name>`

在 span attribute 只能保存字符串的后端中，可以保存 JSON string；在支持结构化 attribute 的后端中应保存结构化值。内容字段不得复制到默认 metric tags。

## Token 字段

Token 字段只写在模型调用 span 和必要的 Agent 汇总 span 上。`assistant` 展示 span 不携带 token，避免重复计数。

| 字段 | 说明 |
| --- | --- |
| `gen_ai.usage.input_tokens` | 输入 token 总量，必须包含 cache read / cache creation input tokens。 |
| `gen_ai.usage.output_tokens` | 输出 token 总量，必须包含 reasoning output tokens。 |
| `gen_ai.usage.cache_read.input_tokens` | provider-managed cache 命中的输入 token。 |
| `gen_ai.usage.cache_creation.input_tokens` | 写入 provider-managed cache 的输入 token。 |
| `gen_ai.usage.reasoning.output_tokens` | reasoning / thinking 输出 token。 |

不得输出新的 `gen_ai.usage.total_tokens`。总量需要时由 `input + output` 推导。

## Tool 字段

Tool span 必须使用 `gen_ai.operation.name=execute_tool`。

| 字段 | 要求 | 说明 |
| --- | --- | --- |
| `gen_ai.tool.name` | 必选 | 工具名称。 |
| `gen_ai.tool.call.id` | 推荐 | 工具调用 ID。 |
| `gen_ai.tool.description` | 推荐 | 工具描述。 |
| `gen_ai.tool.type` | 推荐 | `function`、`extension`、`datastore` 等。 |
| `gen_ai.tool.call.arguments` | Opt-in | 工具参数，必须脱敏和截断。 |
| `gen_ai.tool.call.result` | Opt-in | 工具结果，必须脱敏和截断。 |

GTrace 允许保留 `tool_command`、`tool_target`、`tool_result_status` 作为低基数或展示用扩展字段，但它们不是 OTel 标准字段。

## Skill 扩展

OpenTelemetry GenAI 当前没有正式的一等 skill 语义。GTrace 统一使用 `skill.*` 作为扩展主字段：

| 字段 | 要求 | 说明 |
| --- | --- | --- |
| `skill.name` | 必选 | Skill 名称。 |
| `skill.call.id` | 推荐 | Skill 调用 ID，用于关联 tool span。 |
| `skill.description` | 推荐 | Skill 描述，优先来自 `SKILL.md` frontmatter。 |
| `skill.path` | 推荐 | Skill 入口路径，通常为 `SKILL.md`。 |
| `skill.source.type` | 推荐 | `system`、`user`、`workspace`。 |
| `skill.result.status` | 推荐 | `completed`、`error`、`cancelled`。 |
| `skill.version` | 推荐 | Skill 版本。 |

兼容规则：

- `gen_ai.skill1.*` 废弃，必须迁移到 `skill.*`。
- `gen_ai.skill.*` 只允许作为实验兼容镜像，不作为新规范必选字段。
- `skill_result_status`、`skill_call_id`、`skill_name` 等短字段只作为迁移兼容字段。

## GTrace 运行时扩展字段

以下字段可作为 GTrace extension 输出，但必须保持低基数：

| 字段 | 说明 |
| --- | --- |
| `agent_runtime` | `codex`、`claude`、`hermes`、`openclaw` 等运行时。 |
| `runtime_environment` | `prod`、`test`、`dev` 等环境。 |
| `span_kind` | `request`、`agent`、`llm`、`tool`、`skill`、`subagent`。 |
| `request_type` | `user_request`、`auto_review` 等请求分类。 |
| `final_status` | 根 span 或 Agent span 的最终业务状态。 |
| `status` | 单个 span 的技术状态。 |
| `outcome` | metric/tag 使用的归一结果。 |
| `tool_result_status` | 工具返回体中的显式状态，不等同于 `outcome`。 |
| `tool_command` | 命令类工具的展示命令。 |

## Resource Attributes

Resource attributes 用于一个进程、实例或部署周期内稳定的筛选维度：

- `service.name`
- `telemetry.sdk.language`
- `telemetry.sdk.name`
- `telemetry.sdk.version`
- `host.name`
- `deployment.environment`
- `agent_runtime`
- `runtime_environment`
- `app_id`
- `app_name`
- `agent_type`
- `agent_source`

不要把 `run_id`、真实用户输入、prompt、tool result 或一次性高基数字段写入 resource attributes。
