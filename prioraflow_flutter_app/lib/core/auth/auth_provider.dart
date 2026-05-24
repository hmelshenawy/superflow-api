import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:prioraflow_tech/core/auth/auth_service.dart';
import 'package:prioraflow_tech/core/auth/auth_state.dart';

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.watch(authServiceProvider));
});

class AuthNotifier extends StateNotifier<AuthState> {

  AuthNotifier(this._authService) : super(const AuthState()) {
    _checkAuth();
  }
  final AuthService _authService;

  Future<void> _checkAuth() async {
    final isAuth = await _authService.isAuthenticated();
    if (isAuth) {
      try {
        final user = await _authService.getCurrentUser();
        state = state.copyWith(isAuthenticated: true, user: user);
      } catch (_) {
        await _authService.clearTokens();
        state = const AuthState();
      }
    }
  }

  Future<void> login({
    required String email,
    required String password,
  }) async {
    state = state.copyWith(isLoading: true);

    try {
      final result = await _authService.login(
        email: email,
        password: password,
      );

      // Merge login response with full user data
      // Login returns: { id, name, email, role (string) }
      // /auth/me returns: { id, name, email, role (object with name + permissions), workshops, ... }
      final user = result.user;
      final workshops = result.workshops;

      // Build a combined user map for the UI
      final fullUser = <String, dynamic>{
        ...user,
        'workshops': workshops,
        if (result.workshopId != null) 'workshopId': result.workshopId,
      };

      state = state.copyWith(
        isLoading: false,
        isAuthenticated: true,
        user: fullUser,
      );
    } on DioException catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: _extractDioError(e),
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: _extractErrorMessage(e),
      );
    }
  }

  Future<void> logout() async {
    await _authService.logout();
    state = const AuthState();
  }

  String _extractDioError(DioException e) {
    final status = e.response?.statusCode;
    final data = e.response?.data;

    if (status == 401) {
      return 'Invalid email or password';
    }
    if (status == 429) {
      return 'Too many attempts. Please try again later.';
    }
    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.sendTimeout ||
        e.type == DioExceptionType.receiveTimeout ||
        e.type == DioExceptionType.connectionError) {
      return 'Unable to connect to server. Check your connection.';
    }

    // Try to extract backend error message
    if (data is Map && data['message'] != null) {
      return data['message'].toString();
    }

    return 'An unexpected error occurred. Please try again.';
  }

  String _extractErrorMessage(dynamic error) {
    final msg = error.toString();
    if (msg.contains('401')) return 'Invalid email or password';
    if (msg.contains('429')) return 'Too many attempts. Please try again later.';
    return 'An unexpected error occurred ($msg).';
  }
}