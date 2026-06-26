# Metric 语义规范

本规范定义 GTrace AI metrics 的标准指标、扩展指标、单位和 tag 规则。OpenTelemetry GenAI 已定义的 metric 必须按官方名称和单位输出；GTrace 产品指标必须显式标注为 extension。

## 标准指标

| 指标 | 类型 | 单位 | 边界 | 说明 |
| --- | --- | --- | --- | --- |
| `gen_ai.client.operation.duration` | Histogram | `s` | 标准 | 一次 GenAI client operation 耗时。 |
| `gen_ai.client.token.usage` | Histogram | `{token}` | 标准 | 模型 input/output token 用量。 |
| `gen_ai.client.operation.time_to_first_chunk` | Histogram | `s` | 标准 | 流式请求首 chunk 延迟。 |
| `gen_ai.client.operation.time_per_output_chunk` | Histogram | `s` | 标准 | 流式输出 chunk 间隔。 |
| `gen_ai.server.request.duration` | Histogram | `s` | 标准 | 模型服务端请求耗时；客户端插件通常不输出。 |
| `gen_ai.server.time_to_first_token` | Histogram | `s` | 标准 | 模型服务端首 token 延迟；客户端插件通常不输出。 |
| `gen_ai.server.time_per_output_token` | Histogram | `s` | 标准 | 模型服务端输出 token 间隔；客户端插件通常不输出。 |
| `gen_ai.workflow.duration` | Histogram | `s` | 标准 | 一次 workflow 耗时。 |
| `gen_ai.invoke_agent.duration` | Histogram | `s` | 标准 | 一次 Agent invocation 耗时。 |
| `gen_ai.execute_tool.duration` | Histogram | `s` | 标准 | 一次 tool execution 耗时。 |

标准指标的 duration 单位必须是秒。历史插件中的毫秒指标不得复用标准 metric name。

## 标准 Metric Tags

`gen_ai.client.operation.duration` 推荐 tags：

- `gen_ai.operation.name`
- `gen_ai.provider.name`
- `gen_ai.request.model`
- `gen_ai.response.model`
- `gen_ai.conversation.id`
- `server.address`
- `server.port`
- `error.type`

`gen_ai.client.token.usage` 必选 tags：

- `gen_ai.operation.name`
- `gen_ai.provider.name`
- `gen_ai.token.type`

`gen_ai.client.token.usage` 推荐 tags：

- `gen_ai.request.model`
- `gen_ai.response.model`
- `gen_ai.conversation.id`
- `server.address`
- `server.port`

`gen_ai.token.type` 只允许：

- `input`
- `output`

不得在标准 token metric 中使用 `total`、`cache_read`、`cache_total`、`cache_creation`、`reasoning`。这些值只保留为 trace attributes。

## GTrace 扩展指标

以下指标属于 GTrace extension，可用于产品看板、监控器和 DQL，但不能声明为 OpenTelemetry 标准：

| 指标 | 类型 | 单位 | 说明 |
| --- | --- | --- | --- |
| `gen_ai.agent.request.count` | Counter | `1` | Agent request 计数。 |
| `gen_ai.agent.request.duration` | Histogram | `ms` 或 `s` | Agent request 总耗时。新实现推荐 `s`，若保留 `ms` 必须在 registry 明示。 |
| `gen_ai.agent.operation.count` | Counter | `1` | Agent 侧 model/tool/skill/subagent 操作计数。 |
| `gen_ai.agent.operation.duration` | Histogram | `ms` 或 `s` | Agent 侧操作耗时。新实现推荐 `s`。 |
| `gen_ai.agent.token.usage` | Histogram | `{token}` | Agent 侧兼容 token 指标；新实现优先查询标准 `gen_ai.client.token.usage`。 |
| `gen_ai.agent.session.token.input` | Counter | `{token}` | Session 级输入 token 聚合。 |
| `gen_ai.agent.session.token.output` | Counter | `{token}` | Session 级输出 token 聚合。 |
| `gen_ai.agent.session.token.total` | Counter | `{token}` | Session 级总 token 聚合。 |
| `gen_ai.agent.session.trace.count` | Counter | `1` | Session 级 trace 计数。 |
| `gen_ai.agent.skill.activation.count` | Counter | `1` | Skill 激活次数。 |
| `gen_ai.runtime.*` | Counter / Histogram | 见 registry | Runtime hook、队列、工具、webhook、session 状态等过程指标。 |

## GTrace 扩展 Tags

扩展指标可使用以下低基数 tags：

- `agent_runtime`
- `runtime_environment`
- `platform`
- `operation_name`
- `outcome`
- `request_type`
- `review_category`
- `session_state`
- `channel`
- `queue_name`
- `webhook_name`
- `tool_name`
- `tool_result_status`
- `skill.name`
- `skill.source.type`
- `subagent_role`

兼容短 tag 如 `session_id`、`provider_name`、`request_model`、`response_model`、`model_name`、`token_type` 可以在迁移期保留，但新看板应优先使用对应标准字段：

| 兼容短 tag | 首选字段 |
| --- | --- |
| `session_id` | `gen_ai.conversation.id` |
| `provider_name` | `gen_ai.provider.name` |
| `request_model` | `gen_ai.request.model` |
| `response_model` | `gen_ai.response.model` |
| `tool_name` | `gen_ai.tool.name` |
| `token_type` | `gen_ai.token.type` |

## 禁止作为默认 Metric Tag 的字段

以下字段不得进入默认 metric tags：

- `gen_ai.input.messages`
- `gen_ai.output.messages`
- `gen_ai.system_instructions`
- `gen_ai.tool.definitions`
- `gen_ai.tool.call.arguments`
- `gen_ai.tool.call.result`
- `skill.description`
- `skill.path`
- `run_id`
- `run_ids`
- 任意 prompt、用户输入、模型输出全文或长 preview
