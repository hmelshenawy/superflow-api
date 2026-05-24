import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:prioraflow_tech/core/auth/auth_service.dart';
import 'package:prioraflow_tech/core/auth/auth_state.dart';

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.watch(authServiceProvider));
});

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthService _authService;

  AuthNotifier(this._authService) : super(const AuthState()) {
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    final isAuth = await _authService.isAuthenticated();
    if (isAuth) {
      try {
        final user = await _authService.getCurrentUser();
        state = state.copyWith(isAuthenticated: true, user: user);
      } catch (_) {
        // Token might be expired — stay unauthenticated
        await _authService.clearTokens();
        state = const AuthState();
      }
    }
  }

  Future<void> login({
    required String email,
    required String password,
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final result = await _authService.login(
        email: email,
        password: password,
      );

      final user = result.user;
      state = state.copyWith(
        isLoading: false,
        isAuthenticated: true,
        user: user,
      );
    } catch (e) {
      final message = _extractErrorMessage(e);
      state = state.copyWith(
        isLoading: false,
        error: message,
      );
    }
  }

  Future<void> logout() async {
    await _authService.logout();
    state = const AuthState();
  }

  String _extractErrorMessage(dynamic error) {
    if (error is Exception) {
      final msg = error.toString();
      if (msg.contains('401')) return 'Invalid email or password';
      if (msg.contains('429')) return 'Too many attempts. Please try again later.';
      if (msg.contains('SocketException') || msg.contains('Connection')) {
        return 'Unable to connect to server. Check your connection.';
      }
    }
    return 'An unexpected error occurred. Please try again.';
  }
}