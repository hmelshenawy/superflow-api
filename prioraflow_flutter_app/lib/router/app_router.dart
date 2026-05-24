import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:prioraflow_tech/core/auth/auth_provider.dart';
import 'package:prioraflow_tech/features/auth/presentation/login_screen.dart';
import 'package:prioraflow_tech/features/jobs/presentation/job_list_screen.dart';
import 'package:prioraflow_tech/features/jobs/presentation/job_detail_screen.dart';
import 'package:prioraflow_tech/features/inspection/presentation/concern_list_screen.dart';
import 'package:prioraflow_tech/features/inspection/presentation/finding_form_screen.dart';
import 'package:prioraflow_tech/features/parts/presentation/parts_status_screen.dart';
import 'package:prioraflow_tech/features/profile/presentation/profile_screen.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final isAuthenticated = authState.isAuthenticated;
      final isLoginRoute = state.matchedLocation == '/login';

      if (!isAuthenticated && !isLoginRoute) return '/login';
      if (isAuthenticated && isLoginRoute) return '/';
      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/',
        builder: (context, state) => const JobListScreen(),
      ),
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
          return FindingFormScreen(
            jobId: jobId,
            concernId: concernId,
            concernDescription: description,
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
        path: '/profile',
        builder: (context, state) => const ProfileScreen(),
      ),
    ],
  );
});