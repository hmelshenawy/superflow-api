# Appointments Frontend Specification

## Existing PrioraFlow Workshop navigation
- PrioraFlow Workshop already exposes an `Appointments` sidebar item through `superflow-web/src/lib/product-modes.ts` under `MODULES.APPOINTMENTS`.
- Today that nav item points to `/jobs`; reuse this existing product tab instead of creating a duplicate sidebar entry.
- When the React implementation starts, add the Appointments page under the existing dashboard structure and repoint the existing `Appointments` nav item to the final route, e.g. `/appointments`, only after the page exists.

## AppointmentBoard
- Full-width day calendar grid.
- Header row has one fixed `Advisor` column (`120px`) and one column per generated schedule slot.
- Slot column width: `max(72px, containerWidth / slotCount)`.
- One row per active staff member returned by `GET /staff?is_active=true`.
- Navigation: `Prev day`, `Today`, `Next day`.
  - Previous is disabled for today.
  - Next is disabled when selected date reaches today + 14 days.
  - Header date format: `Mon, 2 Jun 2025`.
- Data required:
  - `GET /schedule/slots?date=YYYY-MM-DD` for slot structure.
  - `GET /staff?is_active=true` for rows.
  - `GET /appointments?date=YYYY-MM-DD` for appointment blocks.
  - `GET /job-types` for type colors/durations.
- Appointment blocks:
  - Rendered inside the staff row.
  - Span columns by `duration_min / slot_duration_min`.
  - Use `job_type.color_hex` as accent/left border when available.
- Status colors:
  - `scheduled`: bg `#E6F1FB`, text `#0C447C`.
  - `waiting`: bg `#E6F1FB`, text `#0C447C`.
  - `in_progress`: bg `#EAF3DE`, text `#27500A`.
  - `on_hold`: bg `#FAEEDA`, text `#633806`.
  - `done`: bg `#F1EFE8`, text `#444441`.
  - `cancelled`: muted red styling with strikethrough.
- Empty available slot click opens `BookingModal` pre-filled with staff and time.
- Existing appointment click opens `AppointmentDetailDrawer`.
- Current time column highlighted with a blue marker for today only.
- Closed/break/unavailable slots use a diagonal stripe pattern.
- Horizontal scroll is enabled when slots exceed viewport width.

## BookingModal
- Opens from empty slot click.
- Fields:
  - Job type select from `GET /job-types`; show duration badge and color dot.
  - Duration, pre-filled from job type and editable in 15-minute increments.
  - Staff select, pre-selected from clicked row.
  - Date + start time, pre-filled from clicked slot.
  - Customer searchable select; optional; uses `/customers/search?q=`.
  - Work order searchable select, filtered by customer; optional/future.
  - Title auto-filled from job type name and editable.
  - Notes textarea.
- Submit calls `POST /appointments`.
- Conflict handling: show inline warning `Slot conflict: [API message]`.

## AppointmentDetailDrawer
- Slide-in drawer from the right; calendar board remains visible.
- Shows appointment title, job type, staff, customer, work order, start/end, duration, status, notes.
- Status badge has dropdown calling `PATCH /appointments/:id/status`.
- Edit button switches drawer into inline edit mode and saves with `PATCH /appointments/:id`.
- Delete button only shown for `scheduled` or `cancelled`; calls `DELETE /appointments/:id`.
- Link to customer profile when `customer_id` exists.
- Link to work order when `work_order_id` exists.

## ScheduleSettings page `/settings/schedule`
### Working hours
- 7-row table: Sun–Sat.
- Each row: day name, `is_open` toggle, `open_time`, `close_time`, slot duration select (`15/30/60`).
- `Add break` per row creates break form.
- Break blocks displayed as tags with start/end and delete action.
- Save changed rows via `PUT /schedule/days/:dayOfWeek`.

### Holidays
- Month picker and date selector.
- Existing holidays list with label, date, and delete button.
- Add holiday form: date picker, label input, full-day toggle.
- Calls `POST /schedule/holidays` and `DELETE /schedule/holidays/:id`.

### Staff
- Staff table: name, role badge, working day chips, max concurrent jobs, active toggle, edit/delete.
- Add staff opens inline form/modal using `POST /staff`.
- Manage leaves opens leave list with add/delete using `/staff/:id/leaves`.

## JobTypesSettings page `/settings/job-types`
### Template library
- Grid of template cards grouped by category from `GET /job-types/templates`.
- Each card: color dot, name, duration badge.
- Import button per card; disabled if already imported.
- Import all in category uses `POST /job-types/import` with template IDs.

### Your job types
- Table: color dot, name, category/template, duration, active toggle, edit/delete.
- Add custom type form: name, duration_min, color_hex color picker, description.
- Inline edit mode with save/cancel.
