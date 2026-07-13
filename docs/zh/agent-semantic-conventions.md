# AI Agent Semantic Conventions

本文档定义 AI Agent 场景下的公共 Agent 语义规范，作为 Trace 与 Metric 规范的上层补充，统一 Agent 基本身份、运行时属性、请求范围和状态口径。

## 适用范围

本规范适用于命令行 Agent、IDE Agent、Workflow Agent 及其他具备用户输入、模型调用、工具调用和结果输出能力的 AI Agent 实现。

本规范关注：

- Agent 的基础身份标识
- Agent 的运行时与来源属性
- 一次完整 Agent 请求的边界
- Agent 级状态口径

本规范不替代：

- [trace-semantic-conventions.md](/home/liurui/code/gtrace-ai-semantic-conventions/docs/zh/trace-semantic-conventions.md)
- [metric-semantic-conventions.md](/home/liurui/code/gtrace-ai-semantic-conventions/docs/zh/metric-semantic-conventions.md)

## Agent 定义

Agent 是指能够接收输入、执行推理、发起模型调用、按需调用工具，并生成输出结果的执行主体。

公共语义中，Agent 应满足以下最小模型：

- 一次用户请求对应一次 `invoke_agent` 级别的处理过程
- 一次处理过程内可以包含 0 次或多次 `llm` 调用
- 一次处理过程内可以包含 0 次或多次 `tool:*` 调用
- `skill:*` 仅作为 `tool:*` 的附属语义存在
- 最终可以产生 0 次或多次 `assistant` 输出事件

## Agent 身份字段

推荐统一字段：

| 字段 | 含义 |
| --- | --- |
| `gen_ai.agent.name` | Agent 名称，同 `agent_name` |
| `gen_ai.agent.version` | Agent 版本，同 `agent_version` |
| `agent_runtime` | Agent 运行时类型，例如 `codex`、`claude`、`openclaw` |
| `agent_id` | 应用或 Agent 应用 ID |
| `agent_name` | 应用展示名 |
| `agent_version` | Agent 版本 |

说明：

- `gen_ai.agent.name` 和 `gen_ai.agent.version` 作为跨 Trace 和 Metric 的主字段。

## Resource Attributes

Agent 级 Resource Attributes 用于描述一个相对稳定的 Agent 实例或部署环境。

默认字段：

| 字段 | 含义 | 示例 |
| --- | --- | --- |
| `service.name` | 采集服务名 | `gtrace-codex` |
| `telemetry.sdk.language` | 采集器语言 | `nodejs` |
| `telemetry.sdk.name` | 采集 SDK 名称 | `gtrace` |
| `telemetry.sdk.version` | 采集器版本 | `0.1.5` |
| `host` | 当前宿主机名 | `dev-host-01` |
| `env` | 环境维度 | `prod`、`test`、`dev` |
| `agent_id` | 应用或 Agent 应用 ID | `agent_3cbf63207e8211f18f6f11f2bceed110` |
| `agent_name` | 应用展示名 | `coding ai` |
| `agent_runtime` | Agent 运行时类型 | `codex`、`claude`、`openclaw` |
| `agent_version` | Agent 运行时版本 | `1.0.0` |

不应放入 Resource Attributes：

- `run_id`
- `turn_id`
- `session_id`
- 用户输入和输出全文
- 工具参数全文和工具结果全文
- 高基数路径、命令、URL、错误堆栈

## Agent 请求边界

一次完整 Agent 请求建议以 `invoke_agent` 作为统一边界。

边界规则：

- 从一次明确用户输入或一次明确系统触发开始
- 到本次请求进入终态为止
- 终态前的中间状态默认不应独立上报为完整请求

一个 Agent 请求通常包含：

- 输入消息
- 模型调用
- 工具调用
- 输出消息
- 状态和错误信息

## Agent 状态口径

Trace 原始状态字段：

| 字段 | 含义 |
| --- | --- |
| `status` | span 级业务状态，通常为 `ok` 或 `error` |
| `final_status` | 请求级终态 |
| `tool_result_status` | 工具调用结果状态 |
| `gen_ai.skill.result.status` | Skill 执行结果状态 |

推荐 `final_status` 取值：

| 值 | 含义 |
| --- | --- |
| `completed` | 请求已完成 |
| `cancelled` | 请求被中断或取消 |
| `unset` | 无法确认请求终态 |

Metric 聚合状态字段：

| 字段 | 固定取值 |
| --- | --- |
| `status` | `completed`、`ok`、`error` |

映射建议：

- 请求成功完成：`final_status=completed`，聚合 `status=completed`
- span 或操作成功：聚合 `status=ok`
- span、工具或请求失败：聚合 `status=error`

说明：

- `cancelled` 作为 Trace 原始终态保留。
- 当前 Metric 结果维度固定使用 `completed`、`ok`、`error`，不直接使用 `cancelled`。

## 实现约束

- 公共规范不强制要求 `step` 或其他中间编排容器。
- `llm` 应表示一次真实模型 API 调用，duration 只覆盖该次调用本身。
- `tool:*` 应表示一次真实工具调用。
- `skill:*` 只能作为 `tool:*` 的子语义存在。
- `assistant` 表示输出事件，不应并入前一个 `llm` span 的 duration。

## 文档关系

- Agent 级公共身份、边界和状态定义见本文档
- Trace 层级、span 关系和字段定义见 [trace-semantic-conventions.md](/home/liurui/code/gtrace-ai-semantic-conventions/docs/zh/trace-semantic-conventions.md)
- Metric 指标、tag 和聚合口径见 [metric-semantic-conventions.md](/home/liurui/code/gtrace-ai-semantic-conventions/docs/zh/metric-semantic-conventions.md)
