# SuperFlow Mobile App — Technician Flutter App
## Claude Code Implementation Plan

> **Target**: Flutter mobile application for workshop technicians  
> **Platform**: Android-first (GCC/Egypt market), iOS-ready  
> **API**: SuperFlow NestJS backend (MariaDB + Redis, JWT auth)  
> **Notifications**: n8n → WhatsApp / push  
> **State**: Riverpod  
> **Auth**: JWT (stored in flutter_secure_storage)

---

## 1. Project Context & Constraints

### Backend Already Exists
- 14 NestJS domain modules fully written
- MariaDB with 28 tables, Prisma ORM
- Redis for caching/sessions
- JWT-based authentication
- n8n wired for WhatsApp notifications
- Running on Hostinger VPS (no public HTTPS yet — use IP + port during dev)

### App's Role in the System
The technician app is the **field tool** in the job lifecycle. Technicians do NOT check in vehicles or talk to customers — they receive assigned jobs, log inspection findings per customer concern, flag parts needs, update job status, and trigger QC handoff. Everything they do feeds the live customer portal in real time.

### What the App Does NOT Handle
- Customer check-in (Advisor web app)
- Customer-facing portal (separate Next.js app)
- Billing/invoicing
- Workshop-level settings or user management

---

## 2. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Flutter 3.x (stable) | Cross-platform, already decided |
| State | Riverpod 2.x (code gen) | Scalable, testable, composable |
| Navigation | go_router | Declarative, deep-link ready |
| HTTP | dio + retrofit | Typed API client, interceptors |
| Auth tokens | flutter_secure_storage | Secure JWT persistence |
| Local cache | hive or isar | Offline-resilient job queue |
| Images | image_picker + cached_network_image | Photo capture for findings |
| Realtime | socket.io_client or polling | Job assignment push updates |
| DI | riverpod providers | Replaces get_it in this stack |
| Linting | flutter_lints + very_good_analysis | Code quality |
| Testing | mocktail + flutter_test | Unit + widget tests |

---

## 3. Project Structure

```
superflow_tech/
├── lib/
│   ├── main.dart
│   ├── app.dart                        # MaterialApp + router setup
│   ├── core/
│   │   ├── api/
│   │   │   ├── dio_client.dart         # Base Dio + interceptors
│   │   │   ├── api_constants.dart      # Base URL, endpoints
│   │   │   └── auth_interceptor.dart   # JWT inject + refresh
│   │   ├── auth/
│   │   │   ├── auth_service.dart       # Login, logout, token store
│   │   │   ├── auth_provider.dart      # Riverpod notifier
│   │   │   └── auth_state.dart
│   │   ├── errors/
│   │   │   ├── app_exception.dart
│   │   │   └── error_handler.dart
│   │   ├── theme/
│   │   │   ├── app_theme.dart
│   │   │   └── app_colors.dart
│   │   └── utils/
│   │       ├── priority_utils.dart     # Priority/risk color + label
│   │       └── date_utils.dart
│   ├── features/
│   │   ├── auth/
│   │   │   ├── data/
│   │   │   │   └── auth_repository.dart
│   │   │   └── presentation/
│   │   │       ├── login_screen.dart
│   │   │       └── login_provider.dart
│   │   ├── jobs/
│   │   │   ├── data/
│   │   │   │   ├── job_repository.dart
│   │   │   │   └── models/
│   │   │   │       ├── job.dart
│   │   │   │       ├── job_status.dart
│   │   │   │       └── priority_level.dart
│   │   │   └── presentation/
│   │   │       ├── job_list_screen.dart
│   │   │       ├── job_list_provider.dart
│   │   │       ├── job_detail_screen.dart
│   │   │       └── job_detail_provider.dart
│   │   ├── inspection/
│   │   │   ├── data/
│   │   │   │   ├── inspection_repository.dart
│   │   │   │   └── models/
│   │   │   │       ├── concern.dart
│   │   │   │       ├── finding.dart
│   │   │   │       └── finding_status.dart
│   │   │   └── presentation/
│   │   │       ├── concern_list_screen.dart
│   │   │       ├── finding_form_screen.dart
│   │   │       ├── finding_form_provider.dart
│   │   │       └── photo_capture_widget.dart
│   │   ├── parts/
│   │   │   ├── data/
│   │   │   │   └── parts_repository.dart
│   │   │   └── presentation/
│   │   │       ├── parts_request_screen.dart
│   │   │       └── parts_status_widget.dart
│   │   └── profile/
│   │       └── presentation/
│   │           └── profile_screen.dart
│   └── router/
│       └── app_router.dart
├── test/
│   ├── unit/
│   └── widget/
├── pubspec.yaml
└── .env.example
```

---

## 4. API Integration Map

Map each screen to the backend endpoints Claude Code should implement against. All endpoints are under `/api/v1`.

### Auth
| Action | Method | Endpoint |
|---|---|---|
| Technician login | POST | `/auth/login` |
| Refresh token | POST | `/auth/refresh` |
| Get current user | GET | `/auth/me` |

### Jobs (assigned to technician)
| Action | Method | Endpoint |
|---|---|---|
| List my assigned jobs | GET | `/jobs?technicianId=me&status=...` |
| Get job detail | GET | `/jobs/:jobId` |
| Update job status | PATCH | `/jobs/:jobId/status` |
| Mark inspection complete | POST | `/jobs/:jobId/inspection-complete` |

### Concerns & Findings
| Action | Method | Endpoint |
|---|---|---|
| List concerns for job | GET | `/jobs/:jobId/concerns` |
| Get concern detail | GET | `/concerns/:concernId` |
| Log finding for concern | POST | `/concerns/:concernId/findings` |
| Update finding | PATCH | `/findings/:findingId` |
| Upload finding photo | POST | `/findings/:findingId/photos` |

### Parts
| Action | Method | Endpoint |
|---|---|---|
| Request part for finding | POST | `/findings/:findingId/parts-request` |
| Get parts status for job | GET | `/jobs/:jobId/parts` |

> **Note for Claude Code**: Confirm exact endpoint paths against the NestJS controllers before wiring. Use `GET /` or Swagger if available on the VPS.

---

## 5. Screen-by-Screen Specification

### Screen 1 — Login
- Phone number + PIN login (or username + password — match backend's auth strategy)
- Remember session (JWT in secure storage)
- Arabic + English locale toggle (persist in shared_preferences)
- No "forgot password" in v1

**State**: `LoginNotifier extends AsyncNotifier<void>`  
**Validation**: non-empty fields, min PIN length  
**On success**: navigate to Job List, store accessToken + refreshToken

---

### Screen 2 — Job List (Home)
- Shows jobs assigned to the authenticated technician
- Each card shows: plate number, make/model, bay number, job status badge, **priority chip** (Low / Normal / High / Critical with color), promise time countdown
- Filter tabs: All / In Progress / Awaiting Parts / Pending QC
- Pull-to-refresh
- Real-time badge count update (polling every 60s or socket if available)
- Tap → Job Detail

**Priority Colors** (match backend scoring engine):
- Low → grey
- Normal → blue
- High → amber
- Critical → red (pulsing indicator)

**State**: `AsyncNotifierProvider<JobListNotifier, List<Job>>`  
**Empty state**: "No jobs assigned" illustration  
**Error state**: retry button + error message

---

### Screen 3 — Job Detail
- Vehicle info header: plate, make/model/year, color, VIN (if available)
- Customer name (no phone — privacy), sensitivity badge if flagged
- Current phase indicator: 6-phase progress bar (Received → Checked In → Under Inspection → Awaiting Approval → In Progress → Completed)
- Promise time + overdue indicator
- **Concern list** with status per concern (tap → Finding Form)
- Parts summary widget: requested / approved / arrived counts
- CTA button changes by status:
  - `Start Inspection` when status = checked_in
  - `Submit for Approval` when all findings logged
  - `Mark Complete` when approved + work done
  - `Hand to QC` when ready

---

### Screen 4 — Concern List (within a job)
- Each concern logged by the advisor at check-in
- Shows: concern description, category, current finding status (not inspected / flagged / ok / deferred)
- Tap → Finding Form for that concern
- Progress: X of Y concerns inspected

---

### Screen 5 — Finding Form
- Concern description shown at top (read-only)
- Finding type: `ok` / `needs_attention` / `critical` / `deferred`
- Description text field (required for anything except `ok`)
- Estimated time to fix (minutes, optional)
- Photo capture: up to 5 photos via camera
  - Photo preview grid
  - Upload to backend (multipart/form-data)
  - Show upload progress per photo
- Parts request toggle: if finding needs a part → show inline parts request sub-form
  - Part name, quantity, notes
- Save button → PATCH finding → navigate back to Concern List
- Auto-save draft locally (Hive) if connection drops

**Validation**: description required when type != ok, at least one photo recommended (soft warning not hard block)

---

### Screen 6 — Parts Status (read-only panel)
- Accessible from Job Detail
- List of all parts requested for this job
- Status per part: Requested / Sourcing / Arrived / Cancelled
- Color-coded per status
- No action in v1 (parts managed by advisor/parts team)

---

### Screen 7 — Profile / Settings
- Technician name + role badge
- Language toggle (AR/EN)
- App version
- Logout button

---

## 6. Offline & Connectivity Handling

The VPS has no public HTTPS yet — during development, connect over local network or VPN tunnel. Plan for:

- **Local draft saving** — Finding forms auto-save to Hive on every field change. On reconnect, prompt technician to sync.
- **Optimistic UI** — Status updates appear immediately, retry silently in background
- **No-connection banner** — Shown at top of screen, non-blocking
- **Photo upload queue** — Photos queued if upload fails, retried on next foreground + connectivity event

---

## 7. Localization

- `l10n` with ARB files: `app_en.arb`, `app_ar.arb`
- RTL layout support out of the box via `Directionality`
- All UI strings externalized — no hardcoded English text
- Date formats: DD/MM/YYYY for MENA market
- Currency: EGP / AED based on locale setting (for future use in estimates)

**Arabic strings to prioritize first**:
- All job status labels
- Concern categories
- Finding type labels
- All action button labels
- Error messages

---

## 8. Theme & Design Tokens

```dart
// app_colors.dart — dark-first theme for workshop/garage environment
class AppColors {
  static const background   = Color(0xFF0F1117);  // near-black
  static const surface      = Color(0xFF1C1F2A);  // card background
  static const primary      = Color(0xFF2563EB);  // SuperFlow blue
  static const primaryLight = Color(0xFF3B82F6);
  static const success      = Color(0xFF16A34A);
  static const warning      = Color(0xFFD97706);
  static const danger       = Color(0xFFDC2626);
  static const textPrimary  = Color(0xFFF1F5F9);
  static const textMuted    = Color(0xFF94A3B8);
  static const border       = Color(0xFF2D3148);
}
```

- Font: `Cairo` (Arabic-friendly, modern) from Google Fonts
- Border radius: 12px cards, 8px buttons
- Dark theme primary — garage lighting is poor, dark UI reduces eye strain
- No bottom navigation bar — jobs are the entry point, use go_router for screen stack

---

## 9. Build Phases for Claude Code

### Phase 1 — Foundation (do this first)
```
1. flutter create superflow_tech --org com.prioraflow
2. Add all pubspec.yaml dependencies
3. Set up folder structure per Section 3
4. Implement core/api/dio_client.dart with base URL + auth interceptor
5. Implement core/auth/ (service + provider + state)
6. Implement app_router.dart with all named routes
7. Implement app_theme.dart with AppColors + Cairo font
8. Implement login_screen.dart (UI + provider + API call)
9. Verify login works against VPS endpoint
```

### Phase 2 — Job List & Detail
```
10. Implement Job model (fromJson, toJson)
11. Implement JobStatus enum + PriorityLevel enum with color getters
12. Implement job_repository.dart
13. Implement job_list_screen.dart + provider
14. Implement job_detail_screen.dart + provider
15. Implement 6-phase progress indicator widget
16. Implement priority chip widget
```

### Phase 3 — Inspection Flow
```
17. Implement Concern + Finding models
18. Implement inspection_repository.dart
19. Implement concern_list_screen.dart
20. Implement finding_form_screen.dart (no photos yet)
21. Wire save finding to API
22. Test full flow: job → concern → finding → back
```

### Phase 4 — Photos & Parts
```
23. Implement photo_capture_widget.dart (image_picker + upload)
24. Add upload progress UI to finding form
25. Implement parts_request sub-form in finding form
26. Implement parts_status_widget.dart (read-only)
```

### Phase 5 — Polish & Offline
```
27. Add Hive local draft saving for findings
28. Add pull-to-refresh everywhere
29. Add offline banner widget
30. Add localization (EN + AR ARB files)
31. RTL layout testing
32. Error states + empty states for all screens
33. Profile/Settings screen
```

### Phase 6 — QA & Handoff
```
34. Unit tests: repositories + providers (mock API)
35. Widget tests: login, job list, finding form
36. Integration smoke test against staging VPS
37. Build release APK for internal testing
38. README with setup instructions
```

---

## 10. pubspec.yaml Dependencies

```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # State & DI
  flutter_riverpod: ^2.5.1
  riverpod_annotation: ^2.3.5
  
  # Navigation
  go_router: ^13.2.0
  
  # HTTP
  dio: ^5.4.3+1
  retrofit: ^4.1.0
  
  # Auth
  flutter_secure_storage: ^9.0.0
  
  # Local storage
  hive_flutter: ^1.1.0
  
  # Images
  image_picker: ^1.1.1
  cached_network_image: ^3.3.1
  
  # Utils
  intl: ^0.19.0
  equatable: ^2.0.5
  freezed_annotation: ^2.4.1
  json_annotation: ^4.9.0
  
  # UI
  google_fonts: ^6.2.1
  flutter_svg: ^2.0.10+1
  shimmer: ^3.0.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  
  # Code gen
  build_runner: ^2.4.9
  riverpod_generator: ^2.3.9
  retrofit_generator: ^8.1.0
  freezed: ^2.5.2
  json_serializable: ^6.8.0
  hive_generator: ^2.0.1
  
  # Testing
  mocktail: ^1.0.4
  
  # Linting
  very_good_analysis: ^6.0.0

flutter:
  generate: true  # enables l10n
  uses-material-design: true
```

---

## 11. Key Implementation Notes for Claude Code

1. **JWT Auth Flow**: Dio interceptor should catch 401, attempt token refresh, retry original request once. If refresh fails, clear tokens and redirect to login.

2. **Priority Scoring**: The backend returns a computed `priorityLevel` string (`low|normal|high|critical`). Do NOT recompute on client. Just map to color + label.

3. **Job Status PATCH**: Send `{ status: "under_inspection" }` — confirm exact field name against backend controller.

4. **Photo Upload**: Use `FormData` with Dio multipart. Backend likely expects `multipart/form-data` with field name `file` or `photo` — confirm before wiring.

5. **Concern ↔ Finding Relationship**: One concern can have one technician finding. The finding is created (POST) on first save, updated (PATCH) on subsequent saves. Store `findingId` locally after first POST to know whether to POST or PATCH.

6. **No Swagger Yet?**: If Swagger isn't configured on the VPS, ask Claude to help you add `@nestjs/swagger` to the NestJS app and expose it at `/api/docs` — it'll speed up frontend integration significantly.

7. **Base URL Management**: Use `.env` with `flutter_dotenv` or `--dart-define` for base URL. Do not hardcode the VPS IP.

8. **Arabic Font**: `Cairo` supports both Arabic and Latin — use it for both, no need for separate font per locale.

9. **Date/Time**: Always store and transmit UTC from the backend. Convert to local (Egypt: UTC+2, UAE: UTC+4) on display only, using the `intl` package.

10. **Phase Progress Bar**: The 6 phases map to: `received → checked_in → under_inspection → awaiting_approval → in_progress → completed`. Map these to the `JobStatus` enum and derive progress index from it.

---

## 12. Environment Config

```
# .env.example
API_BASE_URL=http://YOUR_VPS_IP:3000/api/v1
APP_ENV=development
```

For staging/production, swap to HTTPS domain once Traefik + SSL is configured on the VPS.

---

## 13. Out of Scope for v1 (defer to v2)

- Push notifications (Firebase FCM) — use WhatsApp via n8n for now
- Biometric login
- QR code vehicle scan at check-in (advisor app feature)
- Offline-first full sync (implement sync queue in v2)
- In-app chat with advisor
- Technician performance dashboard
- iOS App Store submission