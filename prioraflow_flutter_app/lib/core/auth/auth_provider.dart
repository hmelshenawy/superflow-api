import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:prioraflow_tech/core/auth/auth_service.dart';
import 'package:prioraflow_tech/core/auth/auth_state.dart';
import 'package:prioraflow_tech/core/offline/draft_service.dart';

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.watch(authServiceProvider), ref.watch(draftServiceProvider));
});

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier(this._authService, this._draftService) : super(const AuthState()) {
    _checkAuth();
  }
  final AuthService _authService;
  final DraftService _draftService;

  Future<void> _checkAuth() async {
    final isAuth = await _authService.isAuthenticated();
    if (isAuth) {
      try {
        final user = await _authService.getCurrentUser();
        state = state.copyWith(isAuthenticated: true, user: user);
      } on DioException catch (e) {
        // If this is a network/connectivity error, keep the user authenticated
        // locally. The token may still be valid — we just can't verify it right now.
        // The auth interceptor will handle token refresh on the next request.
        if (e.type == DioExceptionType.connectionError ||
            e.type == DioExceptionType.connectionTimeout ||
            e.type == DioExceptionType.sendTimeout ||
            e.type == DioExceptionType.receiveTimeout ||
            e.error is SocketException) {
          // Stay authenticated with cached state — we'll re-validate on next successful request
          state = state.copyWith(isAuthenticated: true);
        } else {
          // Auth error (401, 403, etc.) — token is truly invalid
          await _authService.clearTokens();
          state = const AuthState();
        }
      } catch (_) {
        // Unknown error — keep user authenticated to avoid logging out on transient failures
        state = state.copyWith(isAuthenticated: true);
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

      final fullUser = <String, dynamic>{
        ...result.user,
        'workshops': result.workshops.map((w) => w.toJson()).toList(),
        if (result.workshopId != null) 'workshopId': result.workshopId,
      };

      if (result.workshopId == null && result.workshops.length > 1) {
        // Multi-workshop user — needs to select a workshop
        state = state.copyWith(
          isLoading: false,
          isAuthenticated: false,
          user: fullUser,
          workshops: result.workshops,
          needsWorkshopSelection: true,
        );
      } else if (result.workshopId != null) {
        // Single workshop or already selected
        state = state.copyWith(
          isLoading: false,
          isAuthenticated: true,
          user: fullUser,
          workshops: result.workshops,
          selectedWorkshopId: result.workshopId,
          needsWorkshopSelection: false,
        );
      } else {
        // No workshops assigned
        state = state.copyWith(
          isLoading: false,
          error: 'No workshops assigned to your account.',
        );
      }
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

  Future<void> selectWorkshop(String workshopId) async {
    state = state.copyWith(isLoading: true);

    try {
      final result = await _authService.selectWorkshop(workshopId);

      final fullUser = <String, dynamic>{
        ...?state.user,
        'workshopId': workshopId,
      };

      state = state.copyWith(
        isLoading: false,
        isAuthenticated: true,
        user: fullUser,
        selectedWorkshopId: workshopId,
        needsWorkshopSelection: false,
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
    await _draftService.clearAll();
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