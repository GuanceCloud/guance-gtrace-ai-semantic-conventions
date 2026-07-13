# AI Metric Semantic Conventions

This document defines shared Metric semantics for AI Agent observability, including metric definitions, derivation rules, tags, use cases, and OTLP encoding guidance.

## Scope

This specification applies to OTLP Metrics derived from `invoke_agent`, `llm`, `tool:*`, and `skill:*` spans.

Shared constraints:

- large fields such as structured messages, system instructions, and tool definitions stay in Trace
- high-cardinality paths, commands, long text, and full stacks should not become default metric tags
- no metrics should be emitted when no valid spans exist
- `assistant` does not emit standalone metrics by default
- blank or unfinished turns do not emit metrics by default
- `status` is the default normalized result dimension; `tool_result_status` stays in Trace only

Shared agent identity, resource attributes, and normalized status semantics are defined in [agent-semantic-conventions.md](/home/liurui/code/gtrace-ai-semantic-conventions/docs/en/agent-semantic-conventions.md).

## Metric List

| Metric | Type | Unit | Source | Description |
| --- | --- | --- | --- | --- |
| `gen_ai.workflow.duration` | Histogram | `s` | `invoke_agent` duration | total duration of one agent turn |
| `gen_ai.agent.operation.count` | Sum | `-` | `llm`, `skill:*`, `tool:*` | number of agent operations |
| `gen_ai.agent.operation.duration` | Histogram | `ms` | `llm`, `skill:*`, `tool:*` duration | duration of agent operations |
| `gen_ai.client.token.usage` | Histogram | `{token}` | `llm` token usage | model input and output token usage |

Coverage:

- `invoke_agent` emits only `gen_ai.workflow.duration`
- `llm` emits operation count, operation duration, and token usage
- `tool:*` emits operation count and operation duration
- `skill:*` emits operation count and operation duration
- `assistant` does not emit operation or token metrics

Metrics not emitted by default:

- `gen_ai.client.operation.time_to_first_chunk`
- `gen_ai.client.operation.time_per_output_chunk`
- `gen_ai.server.*`
- `gen_ai.client.operation.duration`

## Metric Details

### `gen_ai.workflow.duration`

- source: `invoke_agent` duration
- type: `Histogram`
- unit: `s`

Recommended tags:

- `gen_ai.conversation.id`
- `session_id`
- `final_status`
- `status`

Use cases:

- end-to-end request latency
- latency distributions across environments or agent types
- comparing completed and failed request behavior

### `gen_ai.agent.operation.count`

- source: `llm`, `tool:*`, `skill:*`
- type: `Sum`
- unit: `-`

Operation mapping:

| Span | `gen_ai.operation.name` |
| --- | --- |
| `llm` | `chat` |
| `tool:*` | `execute_tool` |
| `skill:*` | `skill` |

Recommended tags:

- `chat`: `gen_ai.operation.name`, `gen_ai.provider.name`, `gen_ai.request.model`, `gen_ai.response.model`, `status`
- `execute_tool`: `gen_ai.operation.name`, `gen_ai.tool.name`, `status`
- `skill`: `gen_ai.operation.name`, `gen_ai.skill.name`, `status`

Use cases:

- model, tool, and skill call frequency
- abnormal operation amplification inside a workflow

Rules:

- one point per `llm`, `tool:*`, or `skill:*` span
- every point carries value `1`
- repeated calls are counted through downstream summation

### `gen_ai.agent.operation.duration`

- source: `llm`, `tool:*`, `skill:*` durations
- type: `Histogram`
- unit: `ms`

Recommended tags:

- `gen_ai.conversation.id`
- `session_id`
- `gen_ai.operation.name`
- `gen_ai.provider.name`
- `gen_ai.request.model`
- `gen_ai.response.model`
- `gen_ai.tool.name`
- `gen_ai.skill.name`
- `status`
- `error.type`

Use cases:

- latency distributions for model calls, tool calls, and skill usage
- identifying slow tools, slow models, or expensive skills
- distinguishing "too many operations" from "operations too slow"

Rule:

- keep tags richer than count when needed, but still avoid high-cardinality text fields

### `gen_ai.client.token.usage`

- source: `llm` token usage only
- type: `Histogram`
- unit: `{token}`

Field mapping:

| `llm` span field | `gen_ai.token.type` |
| --- | --- |
| `gen_ai.usage.input_tokens` | `input` |
| `gen_ai.usage.output_tokens` | `output` |

Recommended tags:

- `gen_ai.conversation.id`
- `session_id`
- `gen_ai.token.type`
- `gen_ai.provider.name`
- `gen_ai.request.model`
- `gen_ai.response.model`

Use cases:

- model token distribution analysis
- cost estimation
- prompt and output size analysis

Rule:

- do not derive token metrics from aggregated `invoke_agent` token fields

## Resource Attributes

Metric uses the shared agent-level resource attributes defined in [agent-semantic-conventions.md](/home/liurui/code/gtrace-ai-semantic-conventions/docs/en/agent-semantic-conventions.md).

Metric-side additions:

- all metrics derived from one `invoke_agent` should inherit the same resource attributes
- different metric names should not invent inconsistent resource dimensions

## Tag Normalization

Shared status semantics live in [agent-semantic-conventions.md](/home/liurui/code/gtrace-ai-semantic-conventions/docs/en/agent-semantic-conventions.md).

Metric-specific normalization:

| Field | Rule |
| --- | --- |
| `status` | generated by default for `workflow`, `operation.count`, and `operation.duration` |
| `final_status` | generated by default only for `gen_ai.workflow.duration` |
| `tool_result_status` | Trace only, not a default Metric tag |
| `error.type` | generated only for error scenarios |

Recommended mapping:

- `invoke_agent.final_status=completed` -> `status=completed`
- span-level `status=ok` or `tool_result_status=completed` -> `status=ok`
- error states -> `status=error`

## OTLP Shape

Recommended OTLP encoding:

- `gen_ai.agent.operation.count` -> `Sum`
- `gen_ai.workflow.duration` -> `Histogram`
- `gen_ai.agent.operation.duration` -> `Histogram`
- `gen_ai.client.token.usage` -> `Histogram`
- `aggregationTemporality` -> `AGGREGATION_TEMPORALITY_DELTA`

Recommended buckets:

`gen_ai.agent.operation.duration` in milliseconds:

```text
10, 20, 40, 80, 160, 320, 640, 1280, 2560, 5120, 10240, 20480, 40960, 81920
```

`gen_ai.workflow.duration` in seconds:

```text
1, 5, 10, 30, 60, 120, 300, 600, 1800, 3600, 7200
```

`gen_ai.client.token.usage` in tokens:

```text
1, 4, 16, 64, 256, 1024, 4096, 16384, 65536, 262144, 1048576, 4194304, 16777216, 67108864
```

## Query Guidance

- use `gen_ai.workflow.duration` for end-to-end request latency
- use `gen_ai.agent.operation.count` for model, tool, and skill call counts
- use `gen_ai.agent.operation.duration` for operation latency
- use `gen_ai.client.token.usage` for token consumption
- jump to Trace for single-request investigation instead of overloading Metric tags with request-specific IDs
