# AI Metric Semantic Conventions

本文档定义 AI Agent 场景下的公共 Metric 语义规范，覆盖指标列表、派生规则、Tag 设计、使用场景和 OTLP 编码建议。

Metrics 应从同一批 Trace span 派生，不应绕开 Trace 独立重算。

## 适用范围

本规范适用于从 Agent turn 的 `invoke_agent`、`llm`、`tool:*`、`skill:*` 等 span 派生 OTLP Metrics。

公共约束：

- 大字段如 `gen_ai.input.messages`、`gen_ai.output.messages`、`gen_ai.system_instructions`、`gen_ai.tool.definitions` 只保留在 Trace，不复制到 Metric tag。
- 高基数字段、长文本、绝对路径、完整命令、完整错误堆栈默认不应进入 Metric tag。
- 如果一次请求没有生成有效 span，则不应生成对应 metrics。
- `assistant` span 默认不生成独立 metrics。
- 未完成或空白的 turn 默认不生成 metrics。
- `status` 是默认统一结果维度；`tool_result_status` 只保留在 Trace，不进入默认 metric tag。

Agent 公共身份字段、Resource Attributes 和统一状态口径以 [agent-semantic-conventions.md](/home/liurui/code/gtrace-ai-semantic-conventions/docs/zh/agent-semantic-conventions.md) 为准。本文档只描述 Metric 专属规则。

## Metric List

| 指标 | 类型 | 单位 | 来源 | 说明 |
| --- | --- | --- | --- | --- |
| `gen_ai.workflow.duration` | Histogram | `s` | `invoke_agent` duration | 一次 Agent turn 总耗时 |
| `gen_ai.agent.operation.count` | Sum | `-` | `llm`、`skill:*`、`tool:*` | Agent 操作次数 |
| `gen_ai.agent.operation.duration` | Histogram | `ms` | `llm`、`skill:*`、`tool:*` duration | Agent 操作耗时 |
| `gen_ai.client.token.usage` | Histogram | `{token}` | `llm` token usage | 模型调用输入/输出 token |

指标覆盖范围：

- `invoke_agent` 只生成 `gen_ai.workflow.duration`
- `llm` 生成 operation count、operation duration 和 token usage
- `tool:*` 生成 operation count 和 operation duration
- `skill:*` 生成 operation count 和 operation duration
- `assistant` 不生成 operation 或 token 指标

当前不默认生成的指标：

- `gen_ai.client.operation.time_to_first_chunk`
- `gen_ai.client.operation.time_per_output_chunk`
- `gen_ai.server.*`
- `gen_ai.client.operation.duration`

原因：

- transcript 通常不提供稳定的 first-chunk 时间戳。
- Stop hook 类采集点通常发生在完成后，无法稳定刻画流式 chunk 时间。
- 当前观测重点是客户端侧 Agent 行为，不是模型服务端内部行为。
- `gen_ai.agent.operation.duration` 已承担兼容操作耗时语义。

## Metric Details

### gen_ai.workflow.duration

定义：

- 表示一次完整 Agent turn 的总耗时。
- 来源于 `invoke_agent` span 的 duration。

类型与单位：

- OTLP 类型：`Histogram`
- 单位：`s`

推荐 tags：

| Tag | 含义 |
| --- | --- |
| `gen_ai.conversation.id` | 会话 ID |
| `session_id` | 兼容会话 ID |
| `final_status` | 请求终态，例如 `completed`、`cancelled`、`error` |
| `status` | 统一结果维度，固定使用 `completed`、`ok`、`error` |

使用场景：

- 观察整个 Agent 请求链路的整体时延。
- 统计不同环境、不同应用、不同 Agent 类型下的请求响应时间。
- 区分 `completed`、`ok`、`error` 等结果的耗时分布。

注意事项：

- 默认不应对 `final_status=unset` 生成该指标。
- 单次请求排查应结合 Trace，不依赖该指标承载高基数定位信息。

### gen_ai.agent.operation.count

定义：

- 表示 Agent 侧操作次数。
- 来源于 `llm`、`tool:*`、`skill:*` span。

类型与单位：

- OTLP 类型：`Sum`
- 单位：`-`

操作映射：

| Span | `gen_ai.operation.name` |
| --- | --- |
| `llm` | `chat` |
| `tool:*` | `execute_tool` |
| `skill:*` | `skill` |

推荐 tags：

| 操作 | 推荐 tags |
| --- | --- |
| `chat` | `gen_ai.operation.name`、`gen_ai.provider.name`、`gen_ai.request.model`、`gen_ai.response.model`、`status` |
| `execute_tool` | `gen_ai.operation.name`、`gen_ai.tool.name`、`status` |
| `skill` | `gen_ai.operation.name`、`gen_ai.skill.name`、`status` |

使用场景：

- 统计单次请求平均调用多少次模型、多少次工具、多少次 Skill。
- 分析某个模型、某个工具、某个 Skill 的调用频率。
- 观察工作流编排是否出现异常膨胀，例如工具调用次数异常升高。

注意事项：

- 每个 `llm`、`tool:*`、`skill:*` span 生成一个 data point。
- 每个 data point 的值固定为 `1`。
- 重复次数由下游查询聚合求和。
- Count tag 应保持精简，不要引入长文本和高基数字段。
- `status` 应在所有 operation count 点上统一生成，避免同一指标存在“有结果维度”和“无结果维度”两套口径。

### gen_ai.agent.operation.duration

定义：

- 表示 Agent 侧操作耗时。
- 来源于 `llm`、`tool:*`、`skill:*` span 的 duration。

类型与单位：

- OTLP 类型：`Histogram`
- 单位：`ms`

操作映射：

| Span | `gen_ai.operation.name` |
| --- | --- |
| `llm` | `chat` |
| `tool:*` | `execute_tool` |
| `skill:*` | `skill` |

推荐 tags：

| Tag | 含义 |
| --- | --- |
| `gen_ai.conversation.id` | 会话 ID |
| `session_id` | 兼容会话 ID |
| `gen_ai.operation.name` | 操作名 |
| `gen_ai.provider.name` | 模型提供方，适用于 `chat` |
| `gen_ai.request.model` | 请求模型，适用于 `chat` |
| `gen_ai.response.model` | 响应模型，适用于 `chat` |
| `gen_ai.tool.name` | 工具名，适用于 `execute_tool` |
| `gen_ai.skill.name` | Skill 名称，适用于 `skill` |
| `status` | 统一结果维度，固定使用 `completed`、`ok`、`error` |
| `error.type` | 错误类型 |

使用场景：

- 观察模型调用、工具调用、Skill 执行的耗时分布。
- 分析哪个工具最慢、哪个 Skill 最重、哪个模型响应最慢。
- 配合 operation count 识别“调用次数高”还是“单次耗时高”的瓶颈。

注意事项：

- Duration tag 可以比 count 稍丰富，但仍应避免高基数字段和长文本字段。
- 对 `chat` 操作，duration 通常包含 TTFT 对整体耗时的贡献；更细的 TTFT 明细建议保留在 Trace。
- `tool_result_status` 不应作为默认 operation duration tag。工具成败统一折叠到 `status`，更细的工具结果状态保留在 Trace。

### gen_ai.client.token.usage

定义：

- 表示模型调用的输入和输出 token 用量。
- 只从 `llm` span 派生。

类型与单位：

- OTLP 类型：`Histogram`
- 单位：`{token}`

字段映射：

| `llm` span 字段 | `gen_ai.token.type` |
| --- | --- |
| `gen_ai.usage.input_tokens` | `input` |
| `gen_ai.usage.output_tokens` | `output` |

推荐 tags：

| Tag | 含义 |
| --- | --- |
| `gen_ai.conversation.id` | 会话 ID |
| `session_id` | 兼容会话 ID |
| `gen_ai.token.type` | `input` 或 `output` |
| `gen_ai.provider.name` | 模型提供方 |
| `gen_ai.request.model` | 请求模型 |
| `gen_ai.response.model` | 响应模型 |

使用场景：

- 统计不同模型的输入 token 和输出 token 分布。
- 估算请求成本和上下文规模。
- 观察提示词膨胀、输出过长或模型切换后的 token 变化。

注意事项：

- 该指标只从 `llm` span 派生，避免与 `invoke_agent` 汇总值重复计算。
- 不默认生成 `gen_ai.usage.cache_read.input_tokens` 和 `gen_ai.usage.reasoning.output_tokens` 的独立 token 指标。
- 如果 token 值缺失、非数字或小于等于 0，不生成对应 data point。

## Resource Attributes

Metric 使用统一的 Agent 级 Resource Attributes，字段定义、推荐值和禁用项以 [agent-semantic-conventions.md](/home/liurui/code/gtrace-ai-semantic-conventions/docs/zh/agent-semantic-conventions.md) 为准。

Metric 侧补充约束：

- 同一批由同一次 `invoke_agent` 派生的 metrics，应继承同一组 Resource Attributes。
- 不应为不同 metric 名称额外派生互不一致的 resource 维度。

## Tag Normalization

Agent 级状态字段定义与基础映射以 [agent-semantic-conventions.md](/home/liurui/code/gtrace-ai-semantic-conventions/docs/zh/agent-semantic-conventions.md) 为准。

为避免 `gen_ai.agent.operation.*` 出现同一指标多套结果口径，Metric 侧补充规则如下：

| 字段 | 规则 |
| --- | --- |
| `status` | `workflow`、`operation.count`、`operation.duration` 默认都生成 |
| `final_status` | 仅 `gen_ai.workflow.duration` 默认生成 |
| `tool_result_status` | 仅 Trace 保留，不进入默认 Metric tag |
| `error.type` | 仅在 error 场景生成 |

映射建议：

- `invoke_agent.final_status=completed` -> `status=completed`
- span 级 `status=ok` 或 `tool_result_status=completed` -> `status=ok`
- span 级存在错误状态时 -> `status=error`
- `tool_result_status` 如有 `completed`、`error` 等值，应先映射为统一 `status`，不要直接作为 metric tag 发出

## OTLP Shape

推荐 OTLP Metrics 编码形态：

- `gen_ai.agent.operation.count` 使用 OTLP `Sum`
- `gen_ai.workflow.duration`、`gen_ai.agent.operation.duration`、`gen_ai.client.token.usage` 使用 OTLP `Histogram`
- `aggregationTemporality` 使用 `AGGREGATION_TEMPORALITY_DELTA`
- Histogram data point 使用 `count=1`
- Histogram 的 `sum`、`min`、`max` 为当前观测值

推荐 buckets：

`gen_ai.agent.operation.duration`，单位毫秒：

```text
10, 20, 40, 80, 160, 320, 640, 1280, 2560, 5120, 10240, 20480, 40960, 81920
```

`gen_ai.workflow.duration`，单位秒：

```text
1, 5, 10, 30, 60, 120, 300, 600, 1800, 3600, 7200
```

`gen_ai.client.token.usage`，单位 token：

```text
1, 4, 16, 64, 256, 1024, 4096, 16384, 65536, 262144, 1048576, 4194304, 16777216, 67108864
```

## Query Guidance

推荐查询口径：

- 请求总耗时使用 `gen_ai.workflow.duration`
- 模型、工具、Skill 调用次数使用 `gen_ai.agent.operation.count`
- 模型、工具、Skill 耗时使用 `gen_ai.agent.operation.duration`
- Token 用量使用 `gen_ai.client.token.usage`，按 `gen_ai.token.type` 区分输入和输出
- 单次请求排查优先跳转 Trace，不依赖 Metric tag 携带 `run_id`

## Implementation Checklist

- Metrics 是否从同一批 Trace span 派生
- `assistant` 是否未生成 operation 或 token metrics
- `invoke_agent` 是否只生成 workflow duration
- Token metric 是否只从 `llm` span 派生
- Count tag 是否保持精简
- Duration tag 是否避免长文本和高基数字段
- `final_status=unset` 是否未默认上报
- 无有效 span 的 turn 是否未生成 metrics
