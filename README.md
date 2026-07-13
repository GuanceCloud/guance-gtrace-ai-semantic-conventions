# gtrace-ai-semantic-conventions

This repository maintains semantic-convention documents for AI Agent observability.

## Structure

- `docs/zh`: Simplified Chinese documents
- `docs/en`: English documents

Each language directory contains:

- `agent-semantic-conventions.md`
- `trace-semantic-conventions.md`
- `metric-semantic-conventions.md`

## Document Model

- `agent`: shared concepts such as agent identity, request boundary, resource attributes, and status semantics
- `trace`: trace structure, span relationships, and trace-only fields
- `metric`: metric definitions, tags, aggregation rules, and OTLP encoding guidance

## Editing Principles

- Keep cross-document field semantics aligned.
- Keep public conventions implementation-neutral.
- Put shared rules in the agent document instead of duplicating them in trace and metric documents.
