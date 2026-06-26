# 字段迁移矩阵

本页描述历史字段到新规范字段的迁移关系。新实现应直接写首选字段；兼容字段只用于过渡查询。

## Trace 字段

| 历史字段 | 首选字段 | 迁移策略 |
| --- | --- | --- |
| `session_id` | `gen_ai.conversation.id` | 历史兼容可双写，新看板用首选字段。 |
| `session_agent` | `gen_ai.agent.name` | 停止新增。 |
| `agent_version` | `gen_ai.agent.version` | 可作为 resource 兼容字段保留。 |
| `provider_name` / `model_provider` | `gen_ai.provider.name` | 新实现只依赖首选字段。 |
| `model_name` / `request_model` | `gen_ai.request.model` | 请求模型写首选字段。 |
| `response_model` | `gen_ai.response.model` | 响应模型写首选字段。 |
| `operation_name=model` | `gen_ai.operation.name=chat` | `operation_name` 仅作扩展 metric 分类。 |
| `operation_name=tool` | `gen_ai.operation.name=execute_tool` | 同上。 |
| `operation_name=skill` | `gen_ai.operation.name=execute_tool` + `skill.*` | 不再输出 `gen_ai.operation.name=skill`。 |
| `input_preview` | `gen_ai.input.messages` | 内容字段 opt-in，必须脱敏和截断。 |
| `output_preview` / `output_summary` | `gen_ai.output.messages` | 内容字段 opt-in，必须脱敏和截断。 |
| `tool_name` | `gen_ai.tool.name` | 短字段只作兼容。 |
| `tool_call_id` | `gen_ai.tool.call.id` | 短字段只作兼容。 |
| `tool_args_preview` | `gen_ai.tool.call.arguments` | 内容字段 opt-in。 |
| `tool_result_preview` | `gen_ai.tool.call.result` | 内容字段 opt-in。 |
| `usage_input_tokens` | `gen_ai.usage.input_tokens` | 首选字段必须包含缓存输入 token。 |
| `usage_output_tokens` | `gen_ai.usage.output_tokens` | 首选字段必须包含 reasoning output token。 |
| `usage_total_tokens` | 无 | 停止新增，由 input + output 推导。 |
| `usage_cache_read_input_tokens` | `gen_ai.usage.cache_read.input_tokens` | 只写首选字段。 |
| `usage_cache_write_input_tokens` | `gen_ai.usage.cache_creation.input_tokens` | 只写首选字段。 |
| `usage_reasoning_tokens` | `gen_ai.usage.reasoning.output_tokens` | 只写首选字段。 |

## Skill 字段

| 历史字段 | 首选字段 | 迁移策略 |
| --- | --- | --- |
| `skill_name` | `skill.name` | 短字段只作兼容。 |
| `skill_call_id` | `skill.call.id` | 统一为点分字段。 |
| `skill_result_status` | `skill.result.status` | 统一为点分字段。 |
| `skill.description` | `skill.description` | 保留。 |
| `skill.path` | `skill.path` | 保留。 |
| `skill.source.type` | `skill.source.type` | 保留。 |
| `skill.result_status` | `skill.result.status` | 废弃下划线变体。 |
| `gen_ai.skill1.name` | `skill.name` | 废弃。 |
| `gen_ai.skill1.description` | `skill.description` | 废弃。 |
| `gen_ai.skill1.path` | `skill.path` | 废弃。 |
| `gen_ai.skill1.source.type` | `skill.source.type` | 废弃。 |
| `gen_ai.skill1.result_status` | `skill.result.status` | 废弃。 |
| `gen_ai.skill1.version` | `skill.version` | 废弃。 |
| `gen_ai.skill.name` | `skill.name` | 仅允许作为实验兼容镜像。 |
| `gen_ai.skill.result_status` | `skill.result.status` | 仅允许作为实验兼容镜像。 |

## Metrics

| 历史指标 / tag | 首选指标 / tag | 迁移策略 |
| --- | --- | --- |
| `gen_ai.agent.token.usage` | `gen_ai.client.token.usage` | 模型调用 token 优先迁移到标准指标。 |
| `gen_ai.agent.operation.duration` for model | `gen_ai.client.operation.duration` | 标准指标单位必须为 `s`。 |
| `gen_ai.agent.request.duration` | `gen_ai.workflow.duration` 或 GTrace extension | 工作流耗时优先用标准 workflow。 |
| `token_type=input|output` | `gen_ai.token.type=input|output` | 新看板用首选 tag。 |
| `token_type=total` | 无 | 标准 token metric 禁止使用。 |
| `token_type=cache_read` | 无 | 保留 trace attributes，不做默认 metric。 |
| `token_type=cache_total` | 无 | 停止新增。 |
| `token_type=reasoning` | 无 | 保留 trace attributes，不做默认 metric。 |
| duration unit `ms` on standard metric | duration unit `s` | 标准 metric 必须修正。 |

## 插件优先修正项

| 插件 | 优先项 |
| --- | --- |
| Codex | 去掉 `gen_ai.operation.name=skill`；统一 `skill.result.status`；标准 duration 使用秒。 |
| Claude | 统一 `skill.result.status`；保留标准 client/workflow 指标。 |
| Hermes | 将新看板切到标准字段；旧 `usage_total_tokens`、旧 cache 字段降级为兼容说明。 |
| OpenClaw | 删除 `gen_ai.skill1.*`；标准 token metric 不再使用 `total`；拆清 client 与 agent/runtime 边界。 |

