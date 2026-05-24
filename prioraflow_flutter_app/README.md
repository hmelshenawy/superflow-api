# PrioraFlow Technician App

Flutter mobile application for workshop technicians.

## Setup

1. Install Flutter SDK (>=3.3.0)
2. Copy `.env.example` to `.env` and set your API base URL
3. Run `flutter pub get`
4. Run `flutter run`

## Architecture

- **State**: Riverpod 2.x
- **Navigation**: go_router
- **HTTP**: Dio with JWT auth interceptor
- **Auth**: flutter_secure_storage for token persistence
- **Local cache**: Hive (for offline drafts in v2)

## Project Structure

```
lib/
  core/
    api/          Dio client, auth interceptor, API constants
    auth/         Auth service, provider, state
    errors/       Exception types, error handler
    theme/        AppColors, AppTheme (dark-first)
    utils/        Priority utils, date utils
  features/
    auth/         Login screen
    jobs/         Job list, job detail, models, repository
    inspection/   Concern list, finding form, models, repository
    parts/         Parts status (read-only)
    profile/      Profile screen
  router/         go_router configuration
```

## API

All endpoints under `/api/v1`. Auth uses JWT with automatic refresh via httpOnly cookie.

## Phases

- [x] Phase 1 — Foundation (core, auth, router, theme, login)
- [ ] Phase 2 — Job List & Detail
- [ ] Phase 3 — Inspection Flow
- [ ] Phase 4 — Photos & Parts
- [ ] Phase 5 — Polish & Offline
- [ ] Phase 6 — QA & Handoff