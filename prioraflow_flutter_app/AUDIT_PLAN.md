# PrioraFlow Flutter App — Audit & Improvement Plan

> Generated: 2026-05-24 | Branch: feature/flutter-technician-app

---

## 1. Executive Summary

The PrioraFlow mobile app is a **functionally useful MVP** for technician workflows — login, job listing, inspection/QC checklists, finding forms, and parts status are all wired to the backend API. The architecture is clean (Riverpod + repository pattern + GoRouter), authentication is well-implemented (secure token storage, httpOnly refresh cookies, workshop-aware JWTs), and the dark-mode UI matches the web product.

However, the app has **5 issues that block production deployment** and several architectural gaps that would cause real problems in a workshop environment (poor connectivity, need for offline support, navigation bugs). The codebase is ~53 files with **zero tests**, and several features are incomplete stubs (photo capture, QC photo items, offline detection, light theme, localization).

---

## 2. Critical Issues Blocking Production

### C1. Release build is signed with debug keys
**File:** `android/app/build.gradle.kts:30-32`
```kotlin
signingConfig = signingConfigs.getByName("debug")
```
A debug-signed APK cannot be distributed via Play Store or sideloaded securely. Must be fixed before any real device deployment.

### C2. `android:usesCleartextTraffic="true"` in production manifest
**File:** `android/app/src/main/AndroidManifest.xml:10`
Allows unencrypted HTTP traffic. Combined with the HTTP fallback URL in `api_constants.dart` (`http://10.0.2.2:3000/api`), if `.env` fails to load, the app silently downgrades to an insecure connection. In production, this should be `false` (or removed).

### C3. Navigation bugs — `Navigator.of` bypasses GoRouter
**Files:** `concern_list_screen.dart`, `job_detail_screen.dart`, `finding_form_screen.dart`, `inspection_template_select_screen.dart`, `qc_template_select_screen.dart`

Multiple screens use `Navigator.of(context).push(MaterialPageRoute(...))` or `Navigator.of(context).pushReplacementNamed(...)` instead of GoRouter's `context.push(...)`. The `pushReplacementNamed` calls reference route names that don't exist in the GoRouter config, so **they will crash or do nothing at runtime**.

### C4. Concurrent 401 refresh race condition
**File:** `lib/core/api/auth_interceptor.dart`
If multiple requests fail with 401 simultaneously, each independently triggers a token refresh. If the server rotates the refresh cookie, the second refresh attempt will fail (cookie already consumed), logging the user out unexpectedly. A `Completer`/mutex pattern is the standard fix.

### C5. No offline startup resilience
**File:** `lib/core/auth/auth_provider.dart`
`AuthNotifier._checkAuth()` calls `GET /auth/me` on startup. If the device is offline, this call fails, auth state is cleared, and the user is logged out. The token may still be valid — the app should check token presence first and only validate against the server when connectivity is available.

---

## 3. High-Priority Improvements

### H1. LogInterceptor logs request/response bodies in production
**File:** `lib/core/api/dio_client.dart:30-33`
`LogInterceptor(requestBody: true, responseBody: true)` logs JWT tokens, passwords, and all API data to the console. Wrap in `kDebugMode`.

### H2. Raw error messages shown to users
**Files:** `inspection_workspace_screen.dart`, `qc_checklist_workspace_screen.dart`, `inspection_template_select_screen.dart`, `qc_template_select_screen.dart`
These screens display `$e` directly — exposing internal error details to workshop users. Use `handleError()` from `error_handler.dart` (which exists but is unused).

### H3. No `toJson()` on any data model except `Workshop`
**Files:** All model files in `lib/features/*/data/models/`
Without `toJson()`, models cannot be cached locally for offline reads, queued for offline sync, or serialized. The `freezed` and `json_serializable` packages are in `pubspec.yaml` but never used.

### H4. Search fires on every keystroke
**File:** `lib/features/jobs/presentation/job_list_screen.dart`
The `_searchDebounceProvider` is declared but never used. Every character triggers a full API call. Add a debounce (300-500ms).

### H5. CookieJar is in-memory only — refresh token lost on app restart
**File:** `lib/core/api/dio_client.dart`
`CookieJar()` is not persisted to disk. When the app is killed, the refresh cookie is lost. Use `PersistCookieJar` or accept and document this limitation.

### H6. Light theme is broken
**File:** `lib/core/theme/app_theme.dart` + `app_colors.dart`
App is hardcoded to `ThemeMode.dark`. Most screens reference `AppColors.background`, `AppColors.foreground`, etc. which are dark-mode colors. Either complete the light theme or remove it.

### H7. Localization is declared but not used
**Files:** `lib/l10n/app_en.arb`, `lib/l10n/app_ar.arb`
`app.dart` hardcodes `locale: const Locale('en')`. No screen uses `S.of(context)` — all strings are English literals. Arabic strings are dead code.

---

## 4. Medium-Priority Improvements

### M1. No bottom navigation
The app uses a drawer for navigation. A bottom nav bar (Jobs, Inspections, Profile) would be more accessible on a workshop floor.

### M2. No connectivity detection — `connectivityProvider` is a no-op
**File:** `lib/core/offline/connectivity_provider.dart`
The 30-second poll yields `true` and never changes. Add `connectivity_plus` for real network state detection.

### M3. No shimmer loading on detail screens
Only `JobListScreen` has shimmer/skeleton loading. All detail screens show a bare `CircularProgressIndicator`.

### M4. Photo capture not implemented for inspection items
**File:** `lib/features/inspection/presentation/inspection_workspace_screen.dart:288-289`
The `onPhotoTap` callback has a `// TODO: Implement photo capture for inspection items`. The QC checklist photo button is also a no-op.

### M5. No pull-to-refresh on template select screens
`InspectionTemplateSelectScreen` and `QcTemplateSelectScreen` lack `RefreshIndicator`.

### M6. Status transition failures are silent
**File:** `lib/features/jobs/presentation/job_detail_screen.dart`
`transitionStatus()` returns `bool` but the UI never shows success/failure feedback.

### M7. `TextEditingController` leak in QC checklist workspace
`_QcItemRow._buildInput()` creates `TextEditingController(text: value ?? '')` inside `build()`, creating new controllers on every rebuild without disposing them.

### M8. Unused `shared_preferences` dependency
Package is in `pubspec.yaml` but never imported or used. Remove it.

### M9. Hardcoded app version in ProfileScreen
**File:** `lib/features/profile/presentation/profile_screen.dart`
Version hardcoded as `"1.0.0"`. Use `package_info_plus` for the real version.

### M10. No form validation on finding form
**File:** `lib/features/inspection/presentation/finding_form_screen.dart`
Parts quantity field accepts empty strings. Finding type can be submitted as null in edge cases.

---

## 5. Nice-to-Have Improvements

- Haptic feedback on status transitions and form submissions
- Consistent SnackBar styling across the app
- Bottom safe area padding using `MediaQuery.viewPadding.bottom` instead of hardcoded `24`
- Create a `Part` model to replace `Map<String, dynamic>` in parts screen
- Make `DraftService` injectable via Riverpod for testability
- Wire up `error_handler.dart` in repositories instead of raw DioException propagation
- Add loading indicator at bottom of job list during pagination
- Replace `JobDetailScreen._JobCard` `Navigator.of(context).push()` with GoRouter

---

## 6. Missing PrioraFlow Features

| Feature | Status | Notes |
|---------|--------|-------|
| Login/session handling | **Done** | Secure, well-implemented |
| Workshop selection | **Done** | Multi-workshop support |
| Job/WIP list | **Done** | Paginated with search + filter |
| Priority score visibility | **Done** | Priority chip on job cards |
| Job status tracking | **Done** | 6-phase progress bar + transitions |
| Inspection (DVI) | **Done** | Template select, workspace, draft/submit |
| QC Checklist | **Done** | Template select, workspace, draft/submit |
| Concern/finding flow | **Done** | List, form, photo upload |
| Idle time alerts | **Missing** | No idle detection or alerts |
| Next Best Action | **Missing** | No recommendation engine or UI |
| Technician assignment | **Missing** | No assignment UI or display |
| Dashboard/KPIs | **Missing** | App lands on job list, no dashboard |
| Customer details screen | **Missing** | Customer info inline in job detail only |
| Vehicle history | **Missing** | No vehicle service history view |
| Push notifications | **Missing** | No FCM/push notification setup |
| Estimate/quote screen | **Missing** | Backend has `statusEstimateSent`, no mobile UI |
| Time clock/timer | **Missing** | No time tracking per job |
| Parts ordering | **Missing** | Parts screen is read-only |
| Activity timeline | **Missing** | No job event log or notes timeline |
| Advanced search/filter | **Partial** | Basic search + 5 status chips, no date/vehicle/customer filter |
| Role-based access | **Partial** | Auth state has `role` but no UI gates |
| Settings screen | **Missing** | No notification/theme/language settings |
| Photo gallery/viewer | **Missing** | Photos upload but no gallery/zoom |

---

## 7. Suggested Task Backlog

### Critical (must-fix before demo)
- [ ] C1. Fix release signing — create keystore and signing config
- [ ] C2. Remove `usesCleartextTraffic` from release manifest (or restrict to debug)
- [ ] C3. Fix navigation — replace all `Navigator.of()` with `context.push()` via GoRouter
- [ ] C3b. Fix `pushReplacementNamed` in template select screens (broken GoRouter calls)
- [ ] C4. Add mutex/Completer around 401 refresh to prevent race-condition logout
- [ ] C5. Guard `_checkAuth()` against offline startup — don't clear auth on network failure

### High Priority
- [ ] H1. Wrap `LogInterceptor` in `kDebugMode` guard
- [ ] H2. Replace raw `$e` error displays with `handleError()` user-friendly messages
- [ ] H3. Add `toJson()` to all models via `freezed` + `json_serializable`
- [ ] H4. Implement search debounce in `JobListScreen`
- [ ] H5. Switch `CookieJar` to `PersistCookieJar` for refresh token persistence
- [ ] H6. Add SnackBar feedback for status transition success/failure
- [ ] H7. Either complete the light theme or remove it and hardcode dark-only

### Medium Priority
- [ ] M1. Add bottom navigation bar (Jobs / Inspections / Profile)
- [ ] M2. Implement real connectivity detection with `connectivity_plus`
- [ ] M3. Add shimmer loading to detail screens
- [ ] M4. Implement photo capture for inspection items (remove TODO)
- [ ] M5. Add pull-to-refresh on template select screens
- [ ] M6. Fix `TextEditingController` leak in QC checklist workspace
- [ ] M7. Remove unused `shared_preferences` dependency
- [ ] M8. Add `package_info_plus` for real version display
- [ ] M9. Add form validation to finding form (quantity, required fields)

### Nice-to-Have
- [ ] N1. Add haptic feedback on key interactions
- [ ] N2. Standardize SnackBar styling
- [ ] N3. Use `MediaQuery.viewPadding.bottom` for safe area
- [ ] N4. Create `Part` model to replace `Map<String, dynamic>`
- [ ] N5. Make `DraftService` injectable via Riverpod
- [ ] N6. Wire up `error_handler.dart` in repositories
- [ ] N7. Add pagination loading indicator to job list

### Missing Features (MVP scope)
- [ ] F1. Push notification setup (FCM)
- [ ] F2. Dashboard screen with KPIs
- [ ] F3. Idle time alerts
- [ ] F4. Next Best Action recommendations
- [ ] F5. Customer/vehicle detail screens
- [ ] F6. Activity timeline per job

---

## 8. Files That Need Changes

| File | Changes |
|------|---------|
| `android/app/build.gradle.kts` | Add release signing config |
| `android/app/src/main/AndroidManifest.xml` | Remove `usesCleartextTraffic` or restrict to debug |
| `lib/core/api/dio_client.dart` | Wrap LogInterceptor in kDebugMode; switch to PersistCookieJar |
| `lib/core/api/auth_interceptor.dart` | Add mutex around refresh call |
| `lib/core/api/api_constants.dart` | Remove HTTP fallback URL or make it fail-safe |
| `lib/core/auth/auth_provider.dart` | Guard `_checkAuth()` against offline startup |
| `lib/core/theme/app_theme.dart` | Either complete light theme or remove it |
| `lib/core/offline/connectivity_provider.dart` | Add real connectivity check |
| `lib/core/errors/error_handler.dart` | Wire up in repositories |
| `lib/features/jobs/presentation/job_list_screen.dart` | Add search debounce; replace Navigator.of with GoRouter |
| `lib/features/jobs/presentation/job_detail_screen.dart` | Replace Navigator.of with GoRouter; add SnackBar feedback |
| `lib/features/inspection/presentation/concern_list_screen.dart` | Replace Navigator.of with GoRouter |
| `lib/features/inspection/presentation/finding_form_screen.dart` | Replace Navigator.of with GoRouter; add form validation |
| `lib/features/inspection/presentation/inspection_template_select_screen.dart` | Fix pushReplacementNamed; add pull-to-refresh; replace raw error |
| `lib/features/inspection/presentation/inspection_workspace_screen.dart` | Implement photo capture; replace raw error |
| `lib/features/inspection/presentation/qc_template_select_screen.dart` | Fix pushReplacementNamed; add pull-to-refresh; replace raw error |
| `lib/features/inspection/presentation/qc_checklist_workspace_screen.dart` | Fix controller leak; replace raw error; implement photo |
| `lib/features/inspection/data/models/*.dart` | Add @freezed + @JsonSerializable (all 7 model files) |
| `lib/features/jobs/data/models/job.dart` | Add toJson via freezed |
| `lib/features/profile/presentation/profile_screen.dart` | Use package_info_plus for version |
| `lib/router/app_router.dart` | Add bottom nav shell route |
| `pubspec.yaml` | Remove unused shared_preferences; add connectivity_plus, package_info_plus |

---

## 9. Risks and Assumptions

1. **No tests exist.** Any refactoring (especially adding `@freezed` to models, switching navigation, or changing offline logic) risks regressions with no safety net. Consider adding at least repository and provider unit tests before making large structural changes.

2. **Freezed migration is high-touch.** Converting 7+ model files to `@freezed` changes their API (constructors, equality, `copyWith`). Every screen that creates or compares these models will need updates. The benefit is significant (toJson, copyWith, equality for free), but it should be done in one pass.

3. **PersistCookieJar migration changes auth behavior.** Currently, users must re-login after app restart if their access token expires. Persisting cookies means they stay logged in longer. This is generally desirable but test the expiry/renewal flow thoroughly.

4. **The backend API is assumed stable.** The API endpoints and response shapes in `api_constants.dart` and model `fromJson` methods are hardcoded. If the backend changes field names or adds fields, the app will break silently.

5. **Arabic localization strings exist but are dead code.** Enabling RTL support requires more than string translations — layout direction, text alignment, and widget mirroring all need attention. This is a significant effort.

6. **`android:usesCleartextTraffic="true"`** is required for the Android emulator (`10.0.2.2`) during development. The fix is to restrict it to debug builds only, not to remove it entirely.

7. **No crash reporting.** There is no Sentry, Crashlytics, or similar integration. In a workshop environment where users may not report issues, this is a significant visibility gap.

---

## 10. Recommended First 5 Tasks to Implement

1. **Fix navigation bugs** — Replace `Navigator.of` calls with `context.push()`/`context.go()` and fix `pushReplacementNamed`. These are runtime crashes/stalls that affect core user flows.

2. **Fix release signing and cleartext traffic** — Create a keystore, configure release signing, and restrict `usesCleartextTraffic` to debug. Without this, you can't ship an APK.

3. **Guard auth against offline startup** — Don't clear auth state on network failure in `_checkAuth()`. This makes the app unusable in a workshop with spotty WiFi.

4. **Add mutex to 401 refresh** — Wrap the refresh call in a `Completer` to prevent concurrent refresh race conditions that log users out unexpectedly.

5. **Replace raw error displays with user-friendly messages** — Wire up `handleError()` from `error_handler.dart`. Workshop technicians should never see DioException stack traces.