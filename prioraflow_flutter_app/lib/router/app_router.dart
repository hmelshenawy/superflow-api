import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:prioraflow_tech/core/auth/auth_provider.dart';
import 'package:prioraflow_tech/features/auth/presentation/login_screen.dart';
import 'package:prioraflow_tech/features/auth/presentation/workshop_selection_screen.dart';
import 'package:prioraflow_tech/features/jobs/presentation/job_list_screen.dart';
import 'package:prioraflow_tech/features/jobs/presentation/job_detail_screen.dart';
import 'package:prioraflow_tech/features/jobs/data/models/job.dart';
import 'package:prioraflow_tech/features/jobs/presentation/customer_detail_screen.dart';
import 'package:prioraflow_tech/features/jobs/presentation/estimate_screen.dart';
import 'package:prioraflow_tech/features/inspection/presentation/concern_list_screen.dart';
import 'package:prioraflow_tech/features/inspection/data/models/finding.dart';
import 'package:prioraflow_tech/features/inspection/presentation/finding_form_screen.dart';
import 'package:prioraflow_tech/features/dashboard/presentation/dashboard_screen.dart';
import 'package:prioraflow_tech/features/inspection/presentation/inspection_template_select_screen.dart';
import 'package:prioraflow_tech/features/inspection/presentation/inspection_workspace_screen.dart';
import 'package:prioraflow_tech/features/inspection/presentation/qc_template_select_screen.dart';
import 'package:prioraflow_tech/features/inspection/presentation/qc_checklist_workspace_screen.dart';
import 'package:prioraflow_tech/features/parts/presentation/parts_status_screen.dart';
import 'package:prioraflow_tech/features/profile/presentation/settings_screen.dart';
import 'package:prioraflow_tech/features/media/presentation/photo_gallery_screen.dart';
import 'package:prioraflow_tech/router/shell_screen.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final isAuthenticated = authState.isAuthenticated;
      final needsWorkshop = authState.needsWorkshopSelection;
      final isLoginRoute = state.matchedLocation == '/login';
      const isWorkshopRoute = '/select-workshop';

      // Not authenticated and not on login — redirect to login
      if (!isAuthenticated && !needsWorkshop && !isLoginRoute) return '/login';

      // Authenticated but needs workshop selection
      if (needsWorkshop && state.matchedLocation != isWorkshopRoute) {
        return isWorkshopRoute;
      }

      // Authenticated and on login — redirect to home
      if (isAuthenticated && isLoginRoute) return '/';

      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/select-workshop',
        builder: (context, state) => const WorkshopSelectionScreen(),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return ShellScreen(navigationShell: navigationShell);
        },
        branches: [
          // Jobs tab
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/',
                builder: (context, state) => const JobListScreen(),
              ),
            ],
          ),
          // Dashboard tab
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/dashboard',
                builder: (context, state) => const DashboardScreen(),
              ),
            ],
          ),
          // Profile/Settings tab
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/profile',
                builder: (context, state) => const SettingsScreen(),
              ),
            ],
          ),
        ],
      ),
      // Detail routes (outside shell — full-screen)
      GoRoute(
        path: '/jobs/:jobId',
        builder: (context, state) {
          final jobId = state.pathParameters['jobId']!;
          return JobDetailScreen(jobId: jobId);
        },
      ),
      GoRoute(
        path: '/jobs/:jobId/concerns',
        builder: (context, state) {
          final jobId = state.pathParameters['jobId']!;
          return ConcernListScreen(jobId: jobId);
        },
      ),
      GoRoute(
        path: '/jobs/:jobId/concerns/:concernId/finding',
        builder: (context, state) {
          final jobId = state.pathParameters['jobId']!;
          final concernId = state.pathParameters['concernId']!;
          final description = state.uri.queryParameters['description'] ?? '';
          final initialTypeStr = state.uri.queryParameters['initialType'];
          final initialFinding = state.uri.queryParameters['initialFinding'];
          return FindingFormScreen(
            jobId: jobId,
            concernId: concernId,
            concernDescription: description,
            initialType: initialTypeStr != null
                ? FindingType.fromString(initialTypeStr)
                : null,
            initialFinding: initialFinding,
          );
        },
      ),
      GoRoute(
        path: '/jobs/:jobId/parts',
        builder: (context, state) {
          final jobId = state.pathParameters['jobId']!;
          return PartsStatusScreen(jobId: jobId);
        },
      ),
      GoRoute(
        path: '/jobs/:jobId/customer',
        builder: (context, state) {
          final jobId = state.pathParameters['jobId']!;
          // Extra data passed via state
          final extra = state.extra as Map<String, dynamic>?;
          return CustomerDetailScreen(
            customer: extra?['customer'] as CustomerInfo ??
                CustomerInfo(id: jobId),
            vehicle: extra?['vehicle'] as VehicleInfo?,
          );
        },
      ),
      GoRoute(
        path: '/jobs/:jobId/estimate',
        builder: (context, state) {
          final jobId = state.pathParameters['jobId']!;
          return EstimateScreen(jobId: jobId);
        },
      ),
      GoRoute(
        path: '/jobs/:jobId/inspection/new',
        builder: (context, state) {
          final jobId = state.pathParameters['jobId']!;
          return InspectionTemplateSelectScreen(jobId: jobId);
        },
      ),
      GoRoute(
        path: '/jobs/:jobId/inspection/:inspectionId',
        builder: (context, state) {
          final inspectionId = state.pathParameters['inspectionId']!;
          return InspectionWorkspaceScreen(inspectionId: inspectionId);
        },
      ),
      GoRoute(
        path: '/jobs/:jobId/qc-checklist/new',
        builder: (context, state) {
          final jobId = state.pathParameters['jobId']!;
          return QcTemplateSelectScreen(jobId: jobId);
        },
      ),
      GoRoute(
        path: '/jobs/:jobId/qc-checklist/:checklistId',
        builder: (context, state) {
          final checklistId = state.pathParameters['checklistId']!;
          return QcChecklistWorkspaceScreen(checklistId: checklistId);
        },
      ),
      GoRoute(
        path: '/gallery',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>?;
          return PhotoGalleryScreen(
            urls: (extra?['urls'] as List<String>?) ?? [],
            initialIndex: extra?['initialIndex'] as int? ?? 0,
          );
        },
      ),
    ],
  );
});