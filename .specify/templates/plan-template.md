# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]

**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]

**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]

**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]

**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]

**Project Type**: [e.g., library/cli/web-service/mobile-app/compiler/desktop-app or NEEDS CLARIFICATION]

**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]

**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]

**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify the feature aligns with the PrioraFlow Constitution principles:

1. **Workshop-First Design (I)**: Does this solve a real workshop problem (attention, delay, follow-up, blocker, next action)?
2. **Priority Over Data Display (II)**: Does it help users understand what needs action first, not just show data?
3. **Simple for Daily Users (III)**: Is the UI/UX clear, fast, and minimal-clutter for service advisors?
4. **Operational Accuracy (IV)**: Are job status, data integrity, and calculation explainability preserved?
5. **Current Version Safety (V)**: Will this break existing flows? Is the change small and backward-compatible?
6. **Role-Based Thinking (VI)**: Which workshop role (Advisor, Controller, Manager, Admin) benefits?
7. **Explainable Intelligence (VII)**: Are any scores, priorities, or recommendations explainable (no black boxes)?
8. **Performance Matters (VIII)**: Will pages/APIs remain fast? Are N+1 queries avoided?
9. **Clean Technical Structure (IX)**: Is the module boundary clean (Controller/Service/Repository separation)?
10. **Feature Specification Standard (X)**: Does `spec.md` include problem statement, target user, user story, acceptance criteria, data requirements, API requirements, UI requirements, edge cases, permission rules, success metric, and risk to existing system?

11. **Multi-Tenant First (XI)**: Are all queries, caches, and reports workshop-scoped? Is tenant isolation enforced?
12. **Observability & Auditability (XII)**: Are create/update/modify actions traceable? Are important workflow transitions auditable?
13. **API-First Development (XIII)**: Is the API contract designed before UI? Is business logic centralized in backend?
14. **AI Must Assist, Not Control (XIV)**: If AI is involved, are recommendations reviewable? Are destructive actions blocked from automation?
15. **Revenue Before Features (XV)**: Does the feature identify measurable business value? Is it prioritized above nice-to-haves?

If any gate fails, document the justification before proceeding.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
