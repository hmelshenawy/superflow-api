# Feature Specification: [FEATURE NAME]

**Feature Branch**: `[###-feature-name]`

**Created**: [DATE]

**Status**: Draft

**Input**: User description: "$ARGUMENTS"

## Problem Statement *(mandatory)*

[Clear description of the workshop problem this feature solves. Reference Constitution Principle I.]

## Target User *(mandatory)*

[Specific workshop role: Service Advisor, Workshop Controller, Manager, or Admin. Reference Constitution Principle VI.]

---

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - [Brief Title] (Priority: P1)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently - e.g., "Can be fully tested by [specific action] and delivers [specific value]"]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]
2. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### User Story 2 - [Brief Title] (Priority: P2)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### User Story 3 - [Brief Title] (Priority: P3)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

[Add more user stories as needed, each with an assigned priority]

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: System MUST [specific capability, e.g., "allow users to create accounts"]
- **FR-002**: System MUST [specific capability, e.g., "validate email addresses"]
- **FR-003**: Users MUST be able to [key interaction, e.g., "reset their password"]
- **FR-004**: System MUST [data requirement, e.g., "persist user preferences"]
- **FR-005**: System MUST [behavior, e.g., "log all security events"]

*Example of marking unclear requirements:*

- **FR-006**: System MUST authenticate users via [NEEDS CLARIFICATION: auth method not specified - email/password, SSO, OAuth?]
- **FR-007**: System MUST retain user data for [NEEDS CLARIFICATION: retention period not specified]

### Key Entities *(include if feature involves data)*

- **[Entity 1]**: [What it represents, key attributes without implementation]
- **[Entity 2]**: [What it represents, relationships to other entities]

### Data Requirements *(mandatory if feature involves data)*

- **DR-001**: System MUST persist [data entity] with [key fields]
- **DR-002**: [Relationship/constraint requirement, e.g., "Each job MUST belong to exactly one workshop"]
- **DR-003**: [Data lifecycle requirement, e.g., "Soft deletes MUST retain created_at and deleted_at timestamps"]
- **DR-004**: [Tenant scoping requirement per Constitution Principle XI, e.g., "All queries MUST be scoped to the requesting workshop_id"]

### API Requirements *(mandatory if feature exposes endpoints)*

- **API-001**: Endpoint `METHOD /path` MUST [capability, e.g., "return paginated results"]
- **API-002**: Request/response shape MUST [schema requirement, e.g., "include total_count in meta object"]
- **API-003**: [Auth/permission requirement, e.g., "Endpoint MUST reject requests without valid JWT"]
- **API-004**: [API-first requirement per Constitution Principle XIII, e.g., "API contract MUST be stable and versionable; frontend MUST NOT bypass backend business rules"]

### UI Requirements *(mandatory if feature has UI)*

- **UI-001**: Screen MUST [layout requirement, e.g., "show priority indicator above job details"]
- **UI-002**: Interaction MUST [behavior requirement, e.g., "require confirmation before destructive action"]
- **UI-003**: [Accessibility/responsiveness requirement, e.g., "Tables MUST be scrollable on mobile viewports"]

---

## Edge Cases *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right edge cases.
-->

- What happens when [boundary condition]?
- How does system handle [error scenario]?
- What happens if [concurrent access race condition]?
- How is [invalid/missing input] handled?

---

## Permission Rules *(mandatory if feature enforces access control)*

<!--
  ACTION REQUIRED: Define which permissions or roles are required.
  Reference the permissions system documented in docs/permissions-reference.md.
-->

- **PERM-001**: [Role/permission] MUST be able to [action]
- **PERM-002**: [Role/permission] MUST NOT be able to [action]
- **PERM-003**: [Feature gate or plan requirement, e.g., "Feature requires plan tier X"]

---

## Risk to Existing System *(mandatory)*

<!--
  ACTION REQUIRED: Identify how this feature could break or complicate existing flows.
  Reference Constitution Principle V (Current Version Safety).
-->

- **RISK-001**: [Potential regression, e.g., "Changes to job status model may affect state machine transitions"]
- **RISK-002**: [Performance risk, e.g., "New aggregate query may slow job board load time"]
- **RISK-003**: [Migration or compatibility risk, e.g., "New required field breaks existing job creation API contract"]
- **MITIGATION**: [How each risk will be prevented or detected]

---

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: [Measurable metric, e.g., "Users can complete account creation in under 2 minutes"]
- **SC-002**: [Measurable metric, e.g., "System handles 1000 concurrent users without degradation"]
- **SC-003**: [User satisfaction metric, e.g., "90% of users successfully complete primary task on first attempt"]
- **SC-004**: [Business metric, e.g., "Reduce support tickets related to [X] by 50%"]

## Assumptions

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right assumptions based on reasonable defaults
  chosen when the feature description did not specify certain details.
-->

- [Assumption about target users, e.g., "Users have stable internet connectivity"]
- [Assumption about scope boundaries, e.g., "Mobile support is out of scope for v1"]
- [Assumption about data/environment, e.g., "Existing authentication system will be reused"]
- [Dependency on existing system/service, e.g., "Requires access to the existing user profile API"]
