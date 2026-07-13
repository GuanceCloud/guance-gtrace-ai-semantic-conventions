# AI Trace Semantic Conventions

本文档定义 AI Agent 场景下的公共 Trace 语义规范，覆盖 Span 结构、Resource Attributes、Span tag 和状态口径。

实现方应优先使用 OpenTelemetry GenAI semantic conventions；当官方语义尚未覆盖时，可使用本文定义的扩展字段。

## 适用范围

本规范适用于采集命令行 Agent 或类似 AI Agent 的一次用户请求、一次模型调用、一次工具调用和一次 Skill 资源使用。

公共约束：

- Trace 是语义事实来源，Metrics 应从同一批 span 派生，避免口径漂移。
- 高基数字段、长文本、用户输入、工具参数全文、工具结果全文应保留在 Trace。
- 只上报可确认的终态请求，避免同一个请求同时形成中间态和终态两条链路。
- 空白 turn 不应产生 Trace。空白 turn 指没有真实用户输入、模型输出、工具调用或 token usage 的启动上下文。

## Resource Attributes

Trace 使用统一的 Agent 级 Resource Attributes，字段定义、推荐值和禁用项以 [agent-semantic-conventions.md](/home/liurui/code/gtrace-ai-semantic-conventions/docs/zh/agent-semantic-conventions.md) 为准。

Trace 侧补充约束：

- 同一条 trace 内的所有 spans 应共享同一组 Resource Attributes。
- `invoke_agent`、`llm`、`tool:*`、`skill:*`、`assistant` 不应各自派生不同的 resource 维度。

## Trace 结构

一次 Agent turn 应生成一棵 trace tree：

```text
invoke_agent
├── llm
├── tool:exec_command
│   └── skill:plugin-creator
├── llm
└── assistant
```

Span 语义：

| Span name | 父节点 | `gen_ai.operation.name` | 含义 |
| --- | --- | --- | --- |
| `invoke_agent` | 无 | `invoke_agent` | 一次完整 Agent turn 的根 span |
| `llm` | `invoke_agent` | `chat` | 一次模型调用 |
| `assistant` | `invoke_agent` | 不要求 | 一次助手消息输出 |
| `tool:<name>` | `invoke_agent` | `execute_tool` | 一次工具调用 |
| `skill:<name>` | `tool:<name>` | `skill` | 一次可确认的 Skill 资源使用 |

关系规则：

- `invoke_agent` 是 trace root，表示一次用户请求或 Agent turn。
- `llm` 表示单次模型调用，父节点是 `invoke_agent`。
- `llm` 应表示一次真实的模型 API 调用，其 duration 只覆盖该次模型请求本身，不应包住后续的工具调用或助手输出。
- `assistant` 表示助手输出，父节点是 `invoke_agent`，不携带 token usage。
- `tool:<name>` 表示单次工具调用，父节点是 `invoke_agent`。
- `skill:<name>` 只在可以高置信度识别 Skill 资源使用时生成。
- `skill:<name>` 的父节点必须是对应的 `tool:<name>`，表示这次 Skill 使用直接归属于该 tool 调用。
- `llm` 不直接调用 skill，因此不应出现 `llm -> skill` 的父子关系。
- `llm`、`tool:*`、`assistant` 之间的先后关系应通过时间戳、调用 ID 或关联字段体现，而不是通过让 `llm` 覆盖后续 span 的 duration 来表达。

Skill 识别规则：

- 工具参数直接包含 `.../SKILL.md` 路径时，可以生成对应 `skill:<name>`。
- 同一个工具调用内，如果后续访问持续落在同一个 Skill 目录下，可以继续归并到该 tool 对应的同一个 `skill:<name>` span。
- 如果多个不同 tool 都命中同一个 Skill 目录，则每个 tool 都应保留自己独立的 `skill:<name>` span。
- 如果仅在文本中提到 Skill 名称、只列出 Skills，或无法稳定映射到具体 Skill 目录，则不应生成 `skill:<name>`。

## Span tag

### 通用 tag

稳定的 Agent 身份与部署维度应优先放在 Resource Attributes 中，不建议在每个 span 上重复展开同一语义。

| 字段 | 含义 | 典型 span |
| --- | --- | --- |
| `gen_ai.conversation.id` | 会话 ID | all |
| `session_id` | 兼容字段，值同 `gen_ai.conversation.id` | all |
| `gen_ai.operation.name` | 操作名 | `invoke_agent`、`llm`、`skill:*`、`tool:*` |
| `status` | 业务状态，通常为 `ok` 或 `error` | all |
| `error.type` | OpenTelemetry 错误类型 | `invoke_agent`、`tool:*` |

### `invoke_agent` span

`invoke_agent` 用于表示一次完整 Agent turn，建议携带以下字段：

| 字段 | 含义 |
| --- | --- |
| `gen_ai.input.messages` | 当前 turn 的结构化用户输入 |
| `gen_ai.output.messages` | 当前 turn 的最终结构化助手输出 |
| `gen_ai.output.type` | 输出类型，例如 `text`、`json` |
| `gen_ai.provider.name` | 模型提供方 |
| `gen_ai.request.model` | 请求模型 |
| `gen_ai.response.model` | 响应模型 |
| `gen_ai.response.finish_reasons` | 生成结束原因数组 |
| `gen_ai.usage.input_tokens` | turn 汇总输入 token |
| `gen_ai.usage.output_tokens` | turn 汇总输出 token |
| `gen_ai.usage.cache_read.input_tokens` | turn 汇总 cache-hit 输入 token |
| `gen_ai.usage.reasoning.output_tokens` | turn 汇总 reasoning 输出 token |
| `session_create_at` | 会话创建时间 |
| `session_updated_at` | 当前 turn 的会话更新时间 |
| `session_channel` | 会话来源渠道 |
| `tool_count` | 当前 turn 工具调用数 |
| `final_status` | turn 终态 |
| `input_preview / input_length` | 输入预览和长度 |
| `output_preview / output_length` | 输出预览和长度 |

### `llm` span

`llm` 用于表示单次模型调用，建议携带以下字段：

| 字段 | 含义 |
| --- | --- |
| `gen_ai.input.messages` | 当前模型调用的结构化输入 |
| `gen_ai.output.messages` | 当前模型调用的结构化输出 |
| `gen_ai.output.type` | 输出类型，例如 `text`、`json` |
| `gen_ai.provider.name` | 模型提供方 |
| `gen_ai.request.model` | 请求模型 |
| `gen_ai.response.model` | 响应模型 |
| `gen_ai.response.finish_reasons` | 生成结束原因数组 |
| `gen_ai.request.choice.count` | 请求候选数量 |
| `gen_ai.request.seed` | 请求 seed |
| `gen_ai.request.temperature` | temperature |
| `gen_ai.request.top_p` | top_p |
| `gen_ai.request.max_tokens` | 最大输出 token 数 |
| `gen_ai.request.presence_penalty` | presence penalty |
| `gen_ai.request.frequency_penalty` | frequency penalty |
| `gen_ai.request.stop_sequences` | stop sequences |
| `gen_ai.system_instructions` | 系统指令 |
| `gen_ai.tool.definitions` | 可用工具定义 |
| `gen_ai.usage.input_tokens` | 单次模型调用输入 token |
| `gen_ai.usage.output_tokens` | 单次模型调用输出 token |
| `gen_ai.usage.cache_read.input_tokens` | 单次模型调用 cache-hit 输入 token |
| `gen_ai.usage.reasoning.output_tokens` | 单次模型调用 reasoning 输出 token |
| `ttft` | 首 token 等待时间，单位毫秒 |
| `input_preview / input_length` | 输入预览和长度 |
| `output_preview / output_length` | 输出预览和长度 |
| `output_kind` | 输出类型，例如 `text`、`tool_call` |

消息映射建议：

- 第一个 `llm.gen_ai.input.messages` 表示用户输入。
- 后续 `llm.gen_ai.input.messages` 可表示前序工具结果，使用 `role=tool` 和 `tool_call_response` parts。
- `llm.gen_ai.output.messages` 表示当前模型输出；文本用 `text`，推理内容用 `reasoning`，工具请求用 `tool_call`。
- `gen_ai.response.finish_reasons` 推荐值为 `stop`、`tool_call`、`cancelled`。

### `assistant` span

`assistant` 用于表示一次助手消息输出，建议携带以下字段：

| 字段 | 含义 |
| --- | --- |
| `gen_ai.output.type` | 输出类型，例如 `text`、`json` |
| `gen_ai.provider.name` | 模型提供方 |
| `gen_ai.request.model` | 请求模型 |
| `gen_ai.response.model` | 响应模型 |
| `output_preview / output_length` | 输出预览和长度 |
| `output_kind` | 输出类型，例如 `text`、`tool_call` |

约束：

- `assistant` span 不携带 token usage，避免重复统计。
- `assistant` span 表示本地侧的助手输出事件，不应并入前一个 `llm` span 的 duration。

### `tool:*` span

`tool:*` 用于表示单次工具调用，建议携带以下字段：

| 字段 | 含义 |
| --- | --- |
| `gen_ai.tool.name` | 工具名 |
| `gen_ai.tool.call.id` | 工具调用 ID |
| `gen_ai.tool.call.arguments` | 截断后的工具参数预览 |
| `gen_ai.tool.call.result` | 截断后的工具结果预览 |
| `tool_command` | 工具命令或目标命令 |
| `tool_result_status` | 工具结果状态 |
| `reason` | 错误或取消原因 |
| `triggered_by.llm_span_id` | 触发本次工具调用的 llm span ID |

如果工具调用可归属到某个 Skill，还可补充：

| 字段 | 含义 |
| --- | --- |
| `gen_ai.skill.name` | Skill 名称 |
| `gen_ai.skill.path` | Skill 入口文件绝对路径 |
| `gen_ai.skill.source.type` | Skill 来源类型 |
| `gen_ai.skill.result.status` | Skill 结果状态 |
| `gen_ai.skill.description` | Skill 描述 |
| `gen_ai.skill.version` | Skill 版本 |
| `skill.name` | 兼容字段 |
| `skill.description` | 兼容字段 |
| `skill.path` | 兼容字段 |
| `skill_call_id` | 触发 Skill 关联的 call id |

约束：

- `tool_command` 可从 `args.cmd` 或 `args.command` 提取。
- 工具参数和结果必须做长度裁剪。
- `tool_result_status` 是工具级细粒度结果字段，主要用于 Trace 排查；做 Metric 聚合时应优先映射到统一的 `status`，而不是直接作为默认 metric tag。

### `skill:*` span

`skill:*` 用于表示一次可确认的 Skill 资源使用，建议携带以下字段：

| 字段 | 含义 |
| --- | --- |
| `gen_ai.skill.name` | Skill 名称 |
| `gen_ai.skill.path` | Skill 入口文件绝对路径 |
| `gen_ai.skill.source.type` | Skill 来源类型，例如 `system`、`user`、`workspace` |
| `gen_ai.skill.result.status` | Skill 结果状态，例如 `completed`、`error` |
| `gen_ai.skill.description` | Skill 描述 |
| `gen_ai.skill.version` | Skill 版本 |
| `skill.name` | 兼容字段，值同 `gen_ai.skill.name` |
| `skill.description` | 兼容字段，值同 `gen_ai.skill.description` |
| `skill.path` | 兼容字段，值同 `gen_ai.skill.path` |
| `skill_call_id` | 与触发工具调用关联的 call id |

字段生成规则：

- `gen_ai.skill.description` 优先来自 `SKILL.md` frontmatter 的 `description`，否则回退到首个稳定描述段落。
- `gen_ai.skill.version` 优先来自 `SKILL.md` frontmatter，其次可使用同目录 `package.json.version`。
- 无法稳定提取 `description` 或 `version` 时应省略，不要猜测。

## 状态介绍

Agent 级通用状态字段和聚合 `status` 口径以 [agent-semantic-conventions.md](/home/liurui/code/gtrace-ai-semantic-conventions/docs/zh/agent-semantic-conventions.md) 为准。

Trace 侧重点定义 `invoke_agent.final_status` 和上报规则。

`final_status` 推荐值：

| 值 | 含义 | 是否上报 |
| --- | --- | --- |
| `completed` | turn 已完成 | 是 |
| `cancelled` | turn 被中断或取消 | 是 |
| `unset` | 无法确认完成状态 | 否，默认仅内部使用 |

状态规则：

- 正常只上报 `completed` 或 `cancelled`。
- 如果采集器在终态事件写入前触发，但已存在 assistant 最终输出、文本 step 或等价完成信号，可以推断为 `completed`。
- 一旦终态 turn 成功上报，应基于稳定 turn ID 去重，后续重解析不应重复上报。

补充说明：

- `status` 通常表示 span 级业务状态，例如 `ok` 或 `error`。
- `reason` 用于记录错误或取消原因，适用于 `invoke_agent`、`tool:*` 等 span。
