# AI Trace Semantic Conventions

This document defines shared Trace semantics for AI Agent observability, including span structure, resource-attribute usage, span tags, and trace-side status rules.

## Scope

This specification applies to one user request, one model call, one tool call, and one skill usage within a CLI-style or similar AI agent.

Key constraints:

- Trace is the source of truth. Metrics should be derived from the same spans.
- High-cardinality fields, long text, full user input, and full tool arguments or results should stay in Trace.
- Only terminal requests should be uploaded.
- Blank turns should not produce Trace output.

## Resource Attributes

Trace uses the shared agent-level resource attributes defined in [agent-semantic-conventions.md](/home/liurui/code/gtrace-ai-semantic-conventions/docs/en/agent-semantic-conventions.md).

Trace-specific additions:

- all spans in the same trace should share the same resource attributes
- `invoke_agent`, `llm`, `tool:*`, `skill:*`, and `assistant` should not derive inconsistent resource dimensions

## Trace Structure

One agent turn should produce a trace tree like this:

```text
invoke_agent
├── llm
├── tool:exec_command
│   └── skill:plugin-creator
├── llm
└── assistant
```

Span meanings:

| Span name | Parent | `gen_ai.operation.name` | Meaning |
| --- | --- | --- | --- |
| `invoke_agent` | none | `invoke_agent` | root span for one complete agent turn |
| `llm` | `invoke_agent` | `chat` | one model call |
| `assistant` | `invoke_agent` | not required | one assistant output event |
| `tool:<name>` | `invoke_agent` | `execute_tool` | one tool call |
| `skill:<name>` | `tool:<name>` | `skill` | one confirmed skill usage |

Relationship rules:

- `invoke_agent` is the root span for one user request or agent turn
- `llm` represents one real model API call and must only cover that request duration
- `assistant` is an output event and does not carry token usage
- `tool:<name>` represents one real tool call
- `skill:<name>` is created only when skill usage can be identified with high confidence
- `skill:<name>` must be a child of the corresponding `tool:<name>`
- `llm` does not call `skill` directly, so `llm -> skill` is invalid
- ordering between `llm`, `tool:*`, and `assistant` should be expressed via timestamps, call IDs, or link fields, not by stretching `llm` duration

Skill detection rules:

- create `skill:<name>` when tool arguments directly contain a `.../SKILL.md` path
- continue merging accesses to the same skill directory within the same tool call into the same `skill:<name>` span
- if different tools hit the same skill directory, keep separate `skill:<name>` spans under each tool
- do not create `skill:<name>` from plain text mentions or unstable directory matches

## Span Tags

### Common tags

Stable agent identity and deployment dimensions should live in Resource Attributes whenever possible instead of being repeated on every span.

| Field | Meaning | Typical spans |
| --- | --- | --- |
| `gen_ai.conversation.id` | conversation ID | all |
| `session_id` | compatibility alias of `gen_ai.conversation.id` | all |
| `gen_ai.operation.name` | operation name | `invoke_agent`, `llm`, `skill:*`, `tool:*` |
| `status` | span-level business status, usually `ok` or `error` | all |
| `error.type` | OpenTelemetry error type | `invoke_agent`, `tool:*` |

### `invoke_agent`

Recommended fields:

- `gen_ai.input.messages`
- `gen_ai.output.messages`
- `gen_ai.output.type`
- `gen_ai.provider.name`
- `gen_ai.request.model`
- `gen_ai.response.model`
- `gen_ai.response.finish_reasons`
- `gen_ai.usage.input_tokens`
- `gen_ai.usage.output_tokens`
- `gen_ai.usage.cache_read.input_tokens`
- `gen_ai.usage.reasoning.output_tokens`
- `session_create_at`
- `session_updated_at`
- `session_channel`
- `tool_count`
- `final_status`
- `input_preview` / `input_length`
- `output_preview` / `output_length`

### `llm`

Recommended fields:

- `gen_ai.input.messages`
- `gen_ai.output.messages`
- `gen_ai.output.type`
- `gen_ai.provider.name`
- `gen_ai.request.model`
- `gen_ai.response.model`
- `gen_ai.response.finish_reasons`
- `gen_ai.request.choice.count`
- `gen_ai.request.seed`
- `gen_ai.request.temperature`
- `gen_ai.request.top_p`
- `gen_ai.request.max_tokens`
- `gen_ai.request.presence_penalty`
- `gen_ai.request.frequency_penalty`
- `gen_ai.request.stop_sequences`
- `gen_ai.system_instructions`
- `gen_ai.tool.definitions`
- `gen_ai.usage.input_tokens`
- `gen_ai.usage.output_tokens`
- `gen_ai.usage.cache_read.input_tokens`
- `gen_ai.usage.reasoning.output_tokens`
- `ttft`
- `input_preview` / `input_length`
- `output_preview` / `output_length`
- `output_kind`

Message mapping:

- the first `llm.gen_ai.input.messages` usually represents user input
- later `llm.gen_ai.input.messages` may represent previous tool results
- `llm.gen_ai.output.messages` carries model output such as `text`, `reasoning`, or `tool_call`

### `assistant`

Recommended fields:

- `gen_ai.output.type`
- `gen_ai.provider.name`
- `gen_ai.request.model`
- `gen_ai.response.model`
- `output_preview` / `output_length`
- `output_kind`

Constraints:

- `assistant` does not carry token usage
- `assistant` must not be merged into the duration of the preceding `llm`

### `tool:*`

Recommended fields:

- `gen_ai.tool.name`
- `gen_ai.tool.call.id`
- `gen_ai.tool.call.arguments`
- `gen_ai.tool.call.result`
- `tool_command`
- `tool_result_status`
- `reason`
- `triggered_by.llm_span_id`

Optional skill-related fields when applicable:

- `gen_ai.skill.name`
- `gen_ai.skill.path`
- `gen_ai.skill.source.type`
- `gen_ai.skill.result.status`
- `gen_ai.skill.description`
- `gen_ai.skill.version`
- `skill.name`
- `skill.description`
- `skill.path`
- `skill_call_id`

Constraints:

- derive `tool_command` from `args.cmd` or `args.command` when available
- clip oversized tool arguments and results
- keep `tool_result_status` as a trace troubleshooting field; map it to Metric `status` instead of exporting it as a default metric tag

### `skill:*`

Recommended fields:

- `gen_ai.skill.name`
- `gen_ai.skill.path`
- `gen_ai.skill.source.type`
- `gen_ai.skill.result.status`
- `gen_ai.skill.description`
- `gen_ai.skill.version`
- `skill.name`
- `skill.description`
- `skill.path`
- `skill_call_id`

Generation rules:

- prefer `description` from `SKILL.md` frontmatter
- prefer version from `SKILL.md` frontmatter, then `package.json.version`
- omit unstable values instead of guessing

## Status

Shared status semantics and aggregated Metric `status` are defined in [agent-semantic-conventions.md](/home/liurui/code/gtrace-ai-semantic-conventions/docs/en/agent-semantic-conventions.md).

Trace-specific focus:

- define `invoke_agent.final_status`
- define upload rules for terminal turns

Recommended `final_status` values:

| Value | Meaning | Uploaded |
| --- | --- | --- |
| `completed` | turn completed | yes |
| `cancelled` | turn interrupted or cancelled | yes |
| `unset` | terminal state cannot be confirmed | no |

Rules:

- only `completed` and `cancelled` should be uploaded by default
- infer `completed` only when the implementation has enough evidence
- deduplicate terminal turns by stable turn identity
