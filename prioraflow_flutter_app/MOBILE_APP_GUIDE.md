# PrioraFlow Technician App — Complete Guide

> **Version**: 1.0.0 | **Platform**: Android-first (iOS-ready) | **Framework**: Flutter 3.x | **Stack**: Riverpod + Dio + GoRouter

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture & Components](#architecture--components)
4. [Screens & User Flows](#screens--user-flows)
5. [API Integration](#api-integration)
6. [Offline & Draft Handling](#offline--draft-handling)
7. [Authentication & Multi-Workshop](#authentication--multi-workshop)
8. [Localization](#localization)
9. [Theming & Design](#theming--design)
10. [Setup & Development](#setup--development)
11. [Building for Release](#building-for-release)
12. [Testing](#testing)
13. [Troubleshooting](#troubleshooting)

---

## Overview

PrioraFlow Technician is the mobile companion app for workshop technicians. It connects to the SuperFlow NestJS backend and lets technicians:

- View jobs assigned to them
- Inspect vehicles and log findings per customer concern
- Capture photos and request parts
- Transition job statuses through the workflow
- Work offline with auto-saved drafts

The app is designed for the **GCC/Egypt automotive market** with a dark theme optimized for garage environments, Arabic + English localization, and offline-first resilience.

---

## Features

### Core Features

| Feature | Description |
|---|---|
| **JWT Authentication** | Login with email/password, auto-refresh via httpOnly cookie, secure token storage |
| **Multi-Workshop Login** | Users belonging to multiple workshops select their workshop after login |
| **Job List** | Paginated, searchable, filterable list of assigned jobs with priority chips and promise-time countdown |
| **Job Detail** | Vehicle info, 6-phase progress bar, customer concern, technician/advisor info, and status transition actions |
| **Concern List** | All concerns for a job with inspection progress (X of Y inspected) |
| **Finding Form** | Log inspection findings: type (OK / Needs Attention / Critical / Deferred), description, estimated time, photos, and parts request |
| **Photo Capture** | Camera or gallery pick, upload with progress tracking |
| **Parts Status** | Read-only view of parts requested for a job with color-coded status badges |
| **Status Transitions** | One-tap status changes: Start Inspection → Mark Approved → Start Work → Hand to QC → Mark Ready → Close |
| **Offline Support** | Auto-save finding drafts to Hive, offline banner, connectivity detection |
| **Navigation Drawer** | Access profile, sign out, view assigned jobs |
| **Localization** | Full English + Arabic support (80+ strings) with RTL-ready layout |
| **Shimmer Loading** | Skeleton loading states for job lists |

### What the App Does NOT Handle

- Customer check-in (advisor web app)
- Customer portal (separate Next.js app)
- Billing / invoicing
- Workshop admin / settings
- Push notifications (v2 — WhatsApp via n8n for now)

---

## Architecture & Components

### Project Structure

```
prioraflow_flutter_app/
├── lib/
│   ├── main.dart                          # Bootstrap: .env, Hive, ProviderScope
│   ├── app.dart                           # MaterialApp.router + OfflineBanner overlay
│   ├── router/
│   │   └── app_router.dart                # GoRouter with auth guards
│   ├── core/
│   │   ├── api/
│   │   │   ├── api_constants.dart         # All endpoint paths
│   │   │   ├── dio_client.dart            # Dio instance + CookieManager + AuthInterceptor
│   │   │   └── auth_interceptor.dart      # JWT inject, 401 refresh, offline detection
│   │   ├── auth/
│   │   │   ├── auth_service.dart           # Login, workshop select, token CRUD
│   │   │   ├── auth_state.dart            # AuthState + Workshop models
│   │   │   └── auth_provider.dart          # AuthNotifier (Riverpod)
│   │   ├── errors/
│   │   │   ├── app_exception.dart          # Custom exception types
│   │   │   └── error_handler.dart          # DioException → AppException mapping
│   │   ├── offline/
│   │   │   ├── connectivity_provider.dart  # Online/offline state (Riverpod)
│   │   │   ├── draft_service.dart          # Hive-backed draft CRUD
│   │   │   └── offline_banner.dart         # "No connection" banner widget
│   │   ├── theme/
│   │   │   ├── app_colors.dart             # Dark-first color palette
│   │   │   └── app_theme.dart              # Material 3 theme (Cairo font)
│   │   └── utils/
│   │       ├── date_utils.dart             # Relative time, countdown, formatting
│   │       └── priority_utils.dart         # PriorityLevel enum + color mapping
│   ├── features/
│   │   ├── auth/presentation/
│   │   │   ├── login_screen.dart           # Email + password form
│   │   │   └── workshop_selection_screen.dart  # Multi-workshop picker
│   │   ├── jobs/
│   │   │   ├── data/
│   │   │   │   ├── job_repository.dart     # Paginated fetch, detail, PATCH status
│   │   │   │   └── models/
│   │   │   │       ├── job.dart            # Job, VehicleInfo, CustomerInfo, etc.
│   │   │   │       └── job_status.dart      # 10-state enum with phase mapping
│   │   │   └── presentation/
│   │   │       ├── job_list_screen.dart     # Main screen: search, filter, cards, drawer
│   │   │       ├── job_list_provider.dart   # AsyncNotifier: pagination + filtering
│   │   │       ├── job_detail_screen.dart   # Vehicle header, progress, actions
│   │   │       └── job_detail_provider.dart # Family AsyncNotifier: fetch + transition
│   │   ├── inspection/
│   │   │   ├── data/
│   │   │   │   ├── inspection_repository.dart  # Concern CRUD + photo upload
│   │   │   │   └── models/
│   │   │   │       ├── concern.dart            # Concern + ConcernMedia
│   │   │   │       └── finding.dart             # FindingType enum
│   │   │   └── presentation/
│   │   │       ├── concern_list_screen.dart    # Progress + concern cards
│   │   │       ├── concern_list_provider.dart  # Derives concerns from job detail
│   │   │       ├── finding_form_screen.dart    # Full finding form
│   │   │       ├── finding_form_provider.dart  # Submit + draft logic
│   │   │       └── photo_capture_widget.dart   # Camera/gallery picker
│   │   ├── parts/
│   │   │   ├── data/parts_repository.dart      # Job parts + parts search
│   │   │   └── presentation/parts_status_screen.dart  # Read-only parts view
│   │   └── profile/presentation/profile_screen.dart  # Name, role, sign out
│   └── l10n/
│       ├── app_en.arb                     # English strings (source of truth)
│       ├── app_ar.arb                     # Arabic strings
│       ├── app_localizations.dart          # Generated base class
│       ├── app_localizations_en.dart       # Generated EN
│       └── app_localizations_ar.dart       # Generated AR
├── test/
│   ├── unit/
│   │   ├── auth_service_test.dart         # Login, logout, token, workshop selection
│   │   ├── job_repository_test.dart       # Pagination, filtering, status update
│   │   └── inspection_repository_test.dart  # Concern CRUD, model parsing
│   └── widget/
│       ├── login_screen_test.dart          # Auth state, workshop model
│       └── job_list_screen_test.dart       # JobStatus, Job model, PriorityLevel
├── pubspec.yaml
├── l10n.yaml                               # Flutter l10n config
├── plan.md                                 # Original implementation plan
└── README.md
```

### State Management Pattern

All state uses **Riverpod** with the `StateNotifier` / `AsyncNotifier` pattern:

| Provider | Type | Purpose |
|---|---|---|
| `authProvider` | `StateNotifierProvider<AuthNotifier, AuthState>` | Auth lifecycle, login, workshop selection |
| `jobListProvider` | `AsyncNotifierProvider<JobListNotifier, List<Job>>` | Paginated, filterable job list |
| `jobDetailProvider(jobId)` | `AsyncNotifierProvider.family<JobDetailNotifier, Job, String>` | Single job fetch + status transitions |
| `concernListProvider(jobId)` | `AsyncNotifierProvider.family<ConcernListNotifier, List<Concern>, String>` | Concerns derived from job detail |
| `findingFormProvider` | `StateNotifierProvider<FindingFormNotifier, FindingFormState>` | Finding form submission + drafts |
| `jobPartsProvider(jobId)` | `FutureProvider.family` | Parts for a job |
| `isOnlineProvider` | `StateNotifierProvider<ConnectivityNotifier, bool>` | Online/offline state |

### Navigation (GoRouter)

```
/login              → LoginScreen
/select-workshop    → WorkshopSelectionScreen  (if multi-workshop user)
/                   → JobListScreen             (home, requires auth)
/jobs/:jobId        → JobDetailScreen
/jobs/:jobId/concerns           → ConcernListScreen
/jobs/:jobId/concerns/:concernId/finding  → FindingFormScreen
/jobs/:jobId/parts  → PartsStatusScreen
/profile            → ProfileScreen
```

Auth redirects:
- Not authenticated + not on `/login` → redirect to `/login`
- Authenticated + needs workshop → redirect to `/select-workshop`
- Authenticated + on `/login` → redirect to `/`

---

## Screens & User Flows

### 1. Login

```
┌──────────────────────────┐
│      PrioraFlow           │
│    Technician App         │
│                           │
│  ┌─────────────────────┐ │
│  │ Email               │ │
│  └─────────────────────┘ │
│  ┌─────────────────────┐ │
│  │ Password        👁  │ │
│  └─────────────────────┘ │
│                           │
│  ┌─────────────────────┐ │
│  │      Sign In         │ │
│  └─────────────────────┘ │
│                           │
│  PrioraFlow — Clarity    │
│  in every step            │
└──────────────────────────┘
```

- Validates email format and password length (≥6)
- Shows error banner on failure (401, 429, network errors)
- Auto-navigates to `/` on success (or `/select-workshop` for multi-workshop users)

### 2. Workshop Selection (if applicable)

```
┌──────────────────────────┐
│      🏢                  │
│   Select Workshop        │
│   Choose a workshop      │
│                          │
│  ┌────────────────────┐  │
│  │   Workshop Alpha    │  │
│  │       ws-alpha      │  │
│  └────────────────────┘  │
│  ┌────────────────────┐  │
│  │   Workshop Beta     │  │
│  │       ws-beta        │  │
│  └────────────────────┘  │
└──────────────────────────┘
```

- Only shown if the user belongs to multiple workshops
- Selecting a workshop calls `/auth/select-workshop` and receives a scoped JWT

### 3. Job List (Home)

```
┌──────────────────────────┐
│ ☰  My Jobs               │
│                           │
│ ┌─────────────────────┐  │
│ │ 🔍 Search jobs...    │  │
│ └─────────────────────┘  │
│ [All] [In Progress] ...  │
│                           │
│ ┌─────────────────────┐  │
│ │ Toyota Camry    HIGH │  │
│ │ Brake noise         │  │
│ │ 🔵 In Progress 🟡2h │  │
│ └─────────────────────┘  │
│ ┌─────────────────────┐  │
│ │ Honda Civic    NORM │  │
│ │ Oil change          │  │
│ │ 🟡 Checking    3d  │  │
│ └─────────────────────┘  │
└──────────────────────────┘
```

- Pull-to-refresh, infinite scroll pagination
- Filter chips: All / In Progress / Checking / Waiting Parts / QC
- Search by plate, make, model, or job number
- Tap a card → Job Detail
- Drawer (☰): My Jobs, Profile, Sign Out

### 4. Job Detail

```
┌──────────────────────────┐
│ ← Job Detail             │
│                           │
│ 🚗 Toyota Camry 2023     │
│    ABC 123    👤 Ahmed    │
│    "Engine making noise"  │
│                           │
│ ●──●──●──○──○──○         │
│ R  CI In Ap Ip Cp        │
│                           │
│ 📋 Details                │
│ 🕐 Promise: 2h left      │
│ 🔢 VIN: 1HGBH...         │
│ 🏃 Tech: Sami            │
│                           │
│ [▶ Start Inspection]     │
│ [📋 View Concerns]       │
│ [📦 View Parts Status]    │
│ [⚠ No Show]              │
│ [🔄 Refresh]              │
└──────────────────────────┘
```

- **6-phase progress bar**: Received → Checked In → Inspection → Approval → In Progress → Completed
- **Primary action button** changes per status:
  - `booked` → Start Inspection
  - `checking` → Mark Approved / Send Estimate
  - `estimateSent` → Mark Approved
  - `approved` → Start Work
  - `inProgress` → Hand to QC / Waiting Parts
  - `qualityCheck` → Mark Ready / Reopen
  - `ready` → Close Job
- **Close Job** confirmation dialog for active jobs

### 5. Concern List

```
┌──────────────────────────┐
│ ← Concerns               │
│ 2 of 4 inspected          │
│                           │
│ 🟢 Brake noise            │
│    Needs Attention   →    │
│ 🔵 Oil level              │
│    OK                 →    │
│ ⚪ Tire wear              │
│    Not inspected     →    │
│ ⚪ Wiper fluid            │
│    Not inspected     →    │
└──────────────────────────┘
```

- Color dots: 🟢 OK, 🟡 Needs Attention, 🔴 Critical, ⚫ Deferred, ⚪ Not inspected
- Tap → Finding Form for that concern

### 6. Finding Form

```
┌──────────────────────────┐
│ ← Inspection Finding      │
│                           │
│ ┌──────────────────────┐ │
│ │ Concern:              │ │
│ │ Brake noise at 40km/h │ │
│ └──────────────────────┘ │
│                           │
│ Finding Type:             │
│ [OK] [Needs ⚠] [❗] [⏸] │
│                           │
│ Description               │
│ ┌──────────────────────┐ │
│ │ Worn brake pads...    │ │
│ └──────────────────────┘ │
│                           │
│ Est. Time (min)           │
│ ┌──────────┐              │
│ │ 30       │              │
│ └──────────┘              │
│                           │
│ 📷 Add Photos (0/5)      │
│                           │
│ 🔘 Request Parts          │
│   Part Name: ___          │
│   Quantity: 1              │
│   Notes: ___              │
│                           │
│ [💾 Save Finding]         │
└──────────────────────────┘
```

- **Auto-save**: Drafts save to Hive on every field change; restored on re-entry
- **Photo upload**: Sequential upload with progress bar
- **Validation**: Description required for non-OK findings
- On success: clears draft, navigates back to Concern List

### 7. Parts Status

```
┌──────────────────────────┐
│ ← Parts Status            │
│                           │
│ ┌──────────────────────┐ │
│ │ Front Brake Pads      │ │
│ │ Qty: 2   [Requested] │ │
│ └──────────────────────┘ │
│ ┌──────────────────────┐ │
│ │ Brake Fluid           │ │
│ │ Qty: 1   [Sourcing]  │ │
│ └──────────────────────┘ │
│ ┌──────────────────────┐ │
│ │ Air Filter            │ │
│ │ Qty: 1   [Arrived]   │ │
│ └──────────────────────┘ │
└──────────────────────────┘
```

- Color-coded: Requested (grey), Sourcing (amber), Arrived (green), Cancelled (red)
- Pull-to-refresh

### 8. Profile / Settings

```
┌──────────────────────────┐
│ ← Profile                 │
│                           │
│        (T)                │
│       Test User           │
│    test@workshop.com      │
│    [TECHNICIAN]           │
│                           │
│ 📋 App Version   1.0.0   │
│                           │
│ [🔴 Sign Out]             │
└──────────────────────────┘
```

- Shows avatar initial, name, email, role badge
- Sign out clears tokens and local drafts

---

## API Integration

### Base URL

Configured via `.env`:
```
API_BASE_URL=http://YOUR_VPS_IP:3000/api
```

Fallback: `http://10.0.2.2:3000/api` (Android emulator → localhost)

### Endpoints Used

| Screen | Method | Endpoint | Notes |
|---|---|---|---|
| Login | POST | `/auth/login` | Returns JWT + workshops |
| Workshop Select | POST | `/auth/select-workshop` | Returns scoped JWT |
| Refresh | POST | `/auth/refresh` | Auto-called on 401 via cookie |
| Profile | GET | `/auth/me` | Fetch current user |
| Job List | GET | `/jobs?page=&limit=&status=&search=` | Paginated |
| Job Detail | GET | `/jobs/:jobId` | Full detail with concerns |
| Update Status | PATCH | `/jobs/:jobId/status` | Body: `{ to_status: "checking" }` |
| List Concerns | GET | `/jobs/:jobId` (embedded) | Concerns derived from job detail |
| Update Concern | PATCH | `/jobs/:jobId/concerns/:concernId` | Body: `{ status, technician_finding, work_note }` |
| Create Concern | POST | `/jobs/:jobId/concerns` | New concern |
| Upload Photo | POST | `/media/upload-direct` | multipart/form-data |
| Job Parts | GET | `/job-parts/job/:jobId` | Parts list |
| Parts Search | GET | `/parts/search?q=` | Catalog search |

### Auth Flow

```
┌────────┐    POST /auth/login     ┌────────────┐
│  App   │ ──────────────────────→ │  Backend    │
│        │ ←────────────────────── │             │
│        │  { accessToken, user,  │             │
│        │    workshops, workshopId}│             │
│        │                         │             │
│        │  (if multiple workshops) │             │
│        │  POST /auth/select-     │             │
│        │  workshop {workshopId}   │             │
│        │ ←────────────────────── │             │
│        │  { accessToken, workshop}│             │
│        │                         │             │
│        │  Store in SecureStorage │             │
│        │  Attach Bearer header    │             │
│        │                         │             │
│        │  On 401:                │             │
│        │  POST /auth/refresh     │             │
│        │  (cookie sent via       │             │
│        │   CookieManager)        │             │
│        │ ←────────────────────── │             │
│        │  { accessToken }        │             │
│        │  Retry original request  │             │
└────────┘                         └────────────┘
```

### Job Status State Machine

```
booked → checking → estimateSent → approved → inProgress → qualityCheck → ready → closed
  │         │                          ↑          │              │            │
  │         └──────────────────────────┘          │              │            │
  │                                            waitingParts ←───┘            │
  │                                              │         └── Reopen ──→ inProgress
  └── No Show ──→ noShow
```

The app enforces these transitions via the **primary action button** on the Job Detail screen. Only valid transitions are shown.

---

## Offline & Draft Handling

### How It Works

```
┌─────────────────────────────────────────────────┐
│ Online:                                          │
│   Submit finding → API → Success → Clear draft  │
│                                                  │
│ Offline / Error:                                 │
│   Submit finding → API fails → Save draft to Hive│
│   OfflineBanner shown at top of screen            │
│   Next visit to form → Draft auto-restored       │
│                                                  │
│ Connectivity:                                    │
│   AuthInterceptor catches DioException            │
│   → ConnectivityNotifier.markOffline()            │
│   → isOnlineProvider = false                      │
│   → OfflineBanner appears                         │
│                                                  │
│   On successful response → markOnline()           │
│   → isOnlineProvider = true                       │
│   → OfflineBanner disappears                      │
└─────────────────────────────────────────────────┘
```

### Draft Storage (Hive)

Each finding draft is keyed by `finding_{concernId}` and stores:

```json
{
  "findingType": "needs_attention",
  "description": "Worn brake pads",
  "estimatedMinutes": 30,
  "partName": "Front brake pads",
  "partQuantity": 2,
  "partNotes": "OEM preferred",
  "savedAt": "2024-01-15T14:30:00Z"
}
```

Drafts are cleared on successful submission or on logout.

---

## Authentication & Multi-Workshop

### Single-Workshop User

```
Login → Backend returns { workshopId: "w1" } → Auto-select → Home
```

### Multi-Workshop User

```
Login → Backend returns { workshops: [...], workshopId: null } → Workshop Selection → Home
```

### Token Storage

| Key | Storage | Purpose |
|---|---|---|
| `access_token` | FlutterSecureStorage (encrypted) | JWT Bearer token |
| `workshop_id` | FlutterSecureStorage (encrypted) | Selected workshop ID |
| httpOnly cookie | CookieJar (in-memory) | Refresh token |

---

## Localization

### Structure

- `lib/l10n/app_en.arb` — English (source of truth)
- `lib/l10n/app_ar.arb` — Arabic
- Generated files: `lib/l10n/app_localizations.dart`, `app_localizations_en.dart`, `app_localizations_ar.dart`

### Adding a New String

1. Add the key to `app_en.arb`:
   ```json
   "newButtonLabel": "New Button"
   ```
2. Add the translation to `app_ar.arb`:
   ```json
   "newButtonLabel": "زر جديد"
   ```
3. Run `flutter gen-l10n`
4. Use in code: `S.of(context)!.newButtonLabel`

### Supported Locales

| Locale | Language | Direction |
|---|---|---|
| `en` | English | LTR |
| `ar` | Arabic | RTL |

The app currently defaults to English. To switch to Arabic, set `locale: const Locale('ar')` in `app.dart` and wrap the root with `Directionality(textDirection: TextDirection.rtl, ...)`.

---

## Theming & Design

### Color Palette

| Token | Value | Usage |
|---|---|---|
| `background` | `#0F1117` | Screen background |
| `surface` | `#1C1F2A` | Card background |
| `surfaceLight` | `#2D3148` | Elevated surface |
| `primary` | `#2563EB` | Primary actions, links |
| `primaryLight` | `#3B82F6` | Active states |
| `success` | `#16A34A` | OK status, arrived parts |
| `warning` | `#D97706` | Needs attention, sourcing |
| `danger` | `#DC2626` | Critical, errors, overdue |
| `textPrimary` | `#F1F5F9` | Main text |
| `textMuted` | `#94A3B8` | Secondary text |
| `border` | `#2D3148` | Dividers, borders |

### Priority Colors

| Level | Color | Hex |
|---|---|---|
| Low | Grey | `#6B7280` |
| Normal | Blue | `#3B82F6` |
| High | Amber | `#F59E0B` |
| Critical | Red | `#EF4444` |

### Typography

- **Primary font**: Cairo (Google Fonts) — Arabic + Latin support
- **Border radius**: 12px cards, 8px buttons
- **Theme mode**: Dark (garage-optimized)

---

## Setup & Development

### Prerequisites

- Flutter SDK >= 3.3.0
- Android Studio / VS Code with Flutter extension
- Android SDK (for Android builds)
- Xcode (for iOS builds, macOS only)

### Initial Setup

```bash
cd prioraflow_flutter_app

# 1. Install dependencies
flutter pub get

# 2. Create .env file
cp .env.example .env
# Edit .env and set your API base URL:
# API_BASE_URL=http://YOUR_VPS_IP:3000/api

# 3. Generate localization files
flutter gen-l10n

# 4. Run on connected device / emulator
flutter run
```

### Environment Variables

```env
# .env
API_BASE_URL=http://10.0.2.2:3000/api   # Android emulator
# API_BASE_URL=http://localhost:3000/api  # iOS simulator
# API_BASE_URL=https://your-domain.com/api  # Production
APP_ENV=development
```

### Common Commands

```bash
# Development
flutter run                    # Run on connected device
flutter run -d windows        # Run on Windows desktop

# Testing
flutter test                   # Run all tests
flutter test test/unit/         # Unit tests only
flutter test --coverage        # Generate coverage report

# Code generation
flutter gen-l10n               # Regenerate localization files
flutter pub run build_runner build  # If using code-gen (freezed, json_serializable)

# Linting
flutter analyze                # Static analysis
dart fix --apply               # Auto-fix lint issues
```

### Project Conventions

- **State**: All state in Riverpod providers (no `setState` for complex state)
- **Navigation**: Use `context.push()` / `context.go()` from go_router, never `Navigator.push()` for authenticated routes
- **Models**: `fromJson` constructors for all API responses; no `toJson` needed (read-only app)
- **Error handling**: Repository methods throw on failure; providers catch and set `state = AsyncError`
- **Offline**: Always call `DraftService` before showing errors; restore drafts in `initState`

---

## Building for Release

### Debug APK

```bash
flutter build apk --debug
```

### Release APK

```bash
# 1. Create a keystore (one-time)
keytool -genkey -v -keystore upload-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias upload

# 2. Create android/key.properties
storePassword=<your-keystore-password>
keyPassword=<your-key-password>
keyAlias=upload
storeFile=<path-to-keystore>

# 3. Build
flutter build apk --release
```

### App Bundle (Play Store)

```bash
flutter build appbundle --release
```

Output: `build/app/outputs/bundle/release/app-release.aab`

---

## Testing

### Test Structure

```
test/
├── unit/
│   ├── auth_service_test.dart         # 10 tests: login, logout, tokens, workshop selection
│   ├── job_repository_test.dart       # 9 tests: pagination, detail, status transitions, models
│   └── inspection_repository_test.dart # 5 tests: concern CRUD, model parsing
└── widget/
    ├── login_screen_test.dart          # 6 tests: auth service, state, workshop models
    └── job_list_screen_test.dart       # 11 tests: JobStatus, Job model, PriorityLevel
```

### Running Tests

```bash
# All tests (52 total)
flutter test

# Specific test file
flutter test test/unit/auth_service_test.dart

# With coverage
flutter test --coverage
genhtml coverage/lcov.info -o coverage/html
open coverage/html/index.html
```

### Test Coverage

| Module | Tests | Coverage |
|---|---|---|
| Auth (service + state) | 10 | Login flow, token CRUD, workshop selection, multi-workshop |
| Job repository | 9 | Pagination, filtering, detail fetch, status transitions |
| Job model | 5 | JSON parsing, display title fallback, VehicleInfo |
| JobStatus enum | 4 | fromString, apiValue, phaseIndex, labels |
| PriorityLevel | 3 | String mapping, colors, labels |
| Inspection repository | 5 | Concern CRUD, photo upload, model parsing |
| Concern model | 3 | fromJson, hasFinding, displayTitle |
| Workshop model | 3 | fromJson, toJson, equality |

---

## Troubleshooting

### Common Issues

| Problem | Solution |
|---|---|
| `flutter pub get` fails on intl | Update intl: `flutter pub add intl:^0.20.2` |
| `flutter gen-l10n` fails | Ensure `l10n.yaml` exists at project root and ARB files are in `lib/l10n/` |
| Connection refused on emulator | Use `10.0.2.2` for Android emulator, `localhost` for iOS simulator |
| 401 on all requests | Token expired; app should auto-refresh. Check `/auth/refresh` endpoint |
| Photos not uploading | Ensure `multipart/form-data` with field name `file`, `job_id`, and `concern_id` |
| Offline banner stuck | Kill and restart app; `ConnectivityNotifier` resets to `true` on restart |
| Drafts not restoring | Ensure `DraftService.init()` runs in `main()` before `runApp()` |

### Debug Tips

```bash
# Enable Dio logging (already enabled in dio_client.dart)
# Logs all request/response bodies to console

# Check stored token
flutter Secure Storage doesn't have a CLI — use the profile screen

# Check Hive drafts
# DraftService stores under key 'finding_{concernId}' in box 'drafts'
```

### Backend Compatibility

The app requires these backend endpoints to be functional:

1. `POST /auth/login` — returns `{ accessToken, user, workshops, workshopId }`
2. `POST /auth/select-workshop` — returns `{ accessToken, workshop }`
3. `POST /auth/refresh` — returns `{ accessToken }` via httpOnly cookie
4. `GET /auth/me` — returns user profile
5. `GET /jobs` — paginated job list with `?technicianId=me&status=&search=`
6. `GET /jobs/:id` — job detail with embedded concerns
7. `PATCH /jobs/:id/status` — `{ to_status: "checking" }`
8. `PATCH /jobs/:jobId/concerns/:concernId` — update concern finding
9. `POST /media/upload-direct` — multipart photo upload
10. `GET /job-parts/job/:jobId` — parts status

If any endpoint returns unexpected formats, check `fromJson` methods in the corresponding model class.

---

## Phase Checklist

- [x] **Phase 1** — Foundation (core, auth, router, theme, login)
- [x] **Phase 2** — Job List & Detail (pagination, filtering, status transitions)
- [x] **Phase 3** — Inspection Flow (concern list, finding form, PATCH)
- [x] **Phase 4** — Photos & Parts (photo capture, parts status, job detail)
- [x] **Phase 5** — Polish & Offline (drafts, connectivity, workshop selection, localization, shimmer, drawer)
- [x] **Phase 6** — QA & Handoff (unit tests, model tests, l10n, README)

### Deferred to v2

- Push notifications (Firebase FCM)
- Biometric login
- QR code vehicle scan
- Full offline-first sync queue
- In-app chat with advisor
- Technician performance dashboard
- iOS App Store submission