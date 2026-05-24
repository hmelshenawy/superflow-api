import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:prioraflow_tech/core/auth/auth_service.dart';

class AuthInterceptor extends Interceptor {
  final Ref ref;

  AuthInterceptor(this.ref);

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final authService = ref.read(authServiceProvider);
    final token = await authService.getAccessToken();

    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }

    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      final authService = ref.read(authServiceProvider);

      // Check if it's a refresh endpoint failure — don't retry
      if (err.requestOptions.path.endsWith('/auth/refresh')) {
        await authService.clearTokens();
        handler.next(err);
        return;
      }

      // Try to refresh the token
      final refreshed = await authService.refreshToken();
      if (refreshed) {
        // Retry the original request with the new token
        final newToken = await authService.getAccessToken();
        if (newToken != null) {
          err.requestOptions.headers['Authorization'] = 'Bearer $newToken';
          try {
            final response = await Dio().fetch(err.requestOptions);
            handler.resolve(response);
            return;
          } on DioException catch (e) {
            handler.next(e);
            return;
          }
        }
      }

      // Refresh failed — clear tokens and reject
      await authService.clearTokens();
      handler.next(err);
      return;
    }

    handler.next(err);
  }
}