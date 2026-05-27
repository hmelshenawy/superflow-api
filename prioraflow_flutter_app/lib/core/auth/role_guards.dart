import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:prioraflow_tech/core/auth/auth_provider.dart';

/// Whether the current user has the admin role.
final isAdminProvider = Provider<bool>((ref) {
  final user = ref.watch(authProvider).user;
  final roleName = user?['role']?['name']?.toString().toLowerCase() ?? '';
  return roleName == 'admin' || roleName == 'platform_admin';
});

/// Whether the current user has the platform_admin role.
final isPlatformAdminProvider = Provider<bool>((ref) {
  final user = ref.watch(authProvider).user;
  final roleName = user?['role']?['name']?.toString().toLowerCase() ?? '';
  return roleName == 'platform_admin';
});

/// The current user's role name.
final userRoleProvider = Provider<String>((ref) {
  final user = ref.watch(authProvider).user;
  return user?['role']?['name']?.toString() ?? 'technician';
});