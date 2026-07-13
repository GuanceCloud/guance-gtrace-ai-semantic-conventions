# AI Agent Semantic Conventions

This document defines shared agent-level semantics for AI Agent observability. It complements the Trace and Metric documents and standardizes agent identity, runtime attributes, request boundaries, and status semantics.

## Scope

This specification applies to CLI agents, IDE agents, workflow agents, and other AI agents that accept input, call models, use tools, and produce outputs.

It focuses on:

- agent identity
- runtime and source attributes
- request boundaries
- agent-level status semantics

This document does not replace:

- [trace-semantic-conventions.md](/home/liurui/code/gtrace-ai-semantic-conventions/docs/en/trace-semantic-conventions.md)
- [metric-semantic-conventions.md](/home/liurui/code/gtrace-ai-semantic-conventions/docs/en/metric-semantic-conventions.md)

## Agent Model

An agent is an execution entity that can receive input, perform reasoning, call models, invoke tools when needed, and generate outputs.

The minimum shared model is:

- one user request maps to one `invoke_agent` process
- one process may contain zero or more `llm` calls
- one process may contain zero or more `tool:*` calls
- `skill:*` exists only as a child semantic of `tool:*`
- one process may produce zero or more `assistant` output events

## Identity Fields

Recommended shared fields:

| Field | Meaning |
| --- | --- |
| `gen_ai.agent.name` | agent name, aligned with `agent_name` |
| `gen_ai.agent.version` | agent version, aligned with `agent_version` |
| `agent_runtime` | runtime type such as `codex`, `claude`, `openclaw` |
| `agent_id` | application or agent application ID |
| `agent_name` | display name |
| `agent_version` | runtime version |

`gen_ai.agent.name` and `gen_ai.agent.version` are the primary shared fields across Trace and Metric.

## Resource Attributes

Agent-level resource attributes describe a relatively stable agent instance or deployment environment.

Default fields:

| Field | Meaning | Example |
| --- | --- | --- |
| `service.name` | collector service name | `gtrace-codex` |
| `telemetry.sdk.language` | collector language | `nodejs` |
| `telemetry.sdk.name` | collector SDK name | `gtrace` |
| `telemetry.sdk.version` | collector version | `0.1.5` |
| `host` | current hostname | `dev-host-01` |
| `env` | environment | `prod`, `test`, `dev` |
| `agent_id` | application or agent application ID | `agent_3cbf63207e8211f18f6f11f2bceed110` |
| `agent_name` | display name | `coding ai` |
| `agent_runtime` | runtime type | `codex`, `claude`, `openclaw` |
| `agent_version` | runtime version | `1.0.0` |

Do not place these fields in resource attributes:

- `run_id`
- `turn_id`
- `session_id`
- full user input or output
- full tool arguments or results
- high-cardinality paths, commands, URLs, or error stacks

## Request Boundary

A full agent request should use `invoke_agent` as the shared boundary.

Boundary rules:

- starts from an explicit user input or explicit system trigger
- ends when the request reaches a terminal state
- intermediate states should not be uploaded as completed requests

## Status Semantics

Raw Trace status fields:

| Field | Meaning |
| --- | --- |
| `status` | span-level business status, typically `ok` or `error` |
| `final_status` | request terminal status |
| `tool_result_status` | tool call result status |
| `gen_ai.skill.result.status` | skill execution result status |

Recommended `final_status` values:

| Value | Meaning |
| --- | --- |
| `completed` | request completed |
| `cancelled` | request interrupted or cancelled |
| `unset` | terminal status cannot be confirmed |

Metric aggregation status:

| Field | Allowed values |
| --- | --- |
| `status` | `completed`, `ok`, `error` |

Recommended mapping:

- successful request completion: `final_status=completed` -> aggregated `status=completed`
- successful span or operation: aggregated `status=ok`
- failed span, tool, or request: aggregated `status=error`

`cancelled` remains a raw Trace terminal state and is not used directly as the default Metric status dimension.

## Implementation Constraints

- the public spec does not require `step` or other intermediate orchestration containers
- `llm` must represent one real model API call, and its duration must cover only that call
- `tool:*` must represent one real tool invocation
- `skill:*` can only exist as a child semantic of `tool:*`
- `assistant` represents an output event and must not be merged into the preceding `llm` duration

## Document Relationship

- shared identity, boundary, and status semantics live in this document
- trace hierarchy, span relationships, and trace fields live in [trace-semantic-conventions.md](/home/liurui/code/gtrace-ai-semantic-conventions/docs/en/trace-semantic-conventions.md)
- metric definitions, tags, and aggregation rules live in [metric-semantic-conventions.md](/home/liurui/code/gtrace-ai-semantic-conventions/docs/en/metric-semantic-conventions.md)
