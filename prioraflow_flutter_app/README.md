# PrioraFlow Technician App

Flutter mobile application for workshop technicians.

## Setup

1. Install Flutter SDK (>=3.3.0)
2. Copy `.env.example` to `.env` and set your API base URL
3. Run `flutter pub get`
4. Generate localizations: `flutter gen-l10n`
5. Run `flutter run`

## Architecture

- **State**: Riverpod 2.x (StateNotifierProvider pattern)
- **Navigation**: go_router with auth-aware redirects
- **HTTP**: Dio with JWT auth interceptor + cookie-based refresh
- **Auth**: flutter_secure_storage for token persistence
- **Local cache**: Hive (offline drafts for findings)
- **Localization**: ARB files (`lib/l10n/`) — EN + AR

## Project Structure

```
lib/
  core/
    api/          Dio client, auth interceptor, API constants
    auth/         Auth service, provider, state (multi-workshop)
    errors/       Exception types, error handler
    offline/      Connectivity provider, draft service, offline banner
    theme/        AppColors, AppTheme (dark-first)
    utils/        Priority utils, date utils
  features/
    auth/         Login screen, workshop selection
    jobs/         Job list, job detail, models, repository, providers
    inspection/   Concern list, finding form, photo capture, models, repository
    parts/         Parts status (read-only)
    profile/      Profile screen
  l10n/           ARB localization files + generated S class
  router/         go_router configuration
```

## Testing

```bash
# Run all tests
flutter test

# Run unit tests only
flutter test test/unit/

# Run with coverage
flutter test --coverage
```

52 tests covering:
- Auth service (login, logout, token management, workshop selection)
- Auth state & Workshop model
- Job repository (CRUD, pagination, filtering)
- Job model & JobStatus enum
- Inspection repository (concern CRUD)
- Concern model
- Priority level mapping

## API

All endpoints under `/api/v1`. Auth uses JWT with automatic refresh via httpOnly cookie.

Multi-workshop flow: Login returns workshops list. If user has one workshop, auto-select. If multiple, show workshop selection screen.

## Build Release APK

```bash
# Debug APK
flutter build apk --debug

# Release APK (requires signing config)
flutter build apk --release

# App bundle for Play Store
flutter build appbundle --release
```

For release signing, create `android/key.properties`:
```properties
storePassword=<keystore-password>
keyPassword=<key-password>
keyAlias=upload
storeFile=<path-to-keystore>
```

## Phases

- [x] Phase 1 — Foundation (core, auth, router, theme, login)
- [x] Phase 2 — Job List & Detail (pagination, filtering, status transitions)
- [x] Phase 3 — Inspection Flow (concern list, finding form, PATCH)
- [x] Phase 4 — Photos & Parts (photo capture, parts status, job detail)
- [x] Phase 5 — Polish & Offline (draft saving, connectivity banner, workshop selection, localization, shimmer loading, navigation drawer)
- [x] Phase 6 — QA & Handoff (unit tests, model tests, localization ARB files, README)