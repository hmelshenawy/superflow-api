import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:prioraflow_tech/core/api/api_constants.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import 'package:prioraflow_tech/core/api/dio_client.dart';

class AuthInterceptor extends Interceptor {

  AuthInterceptor(this.ref);
  final Ref ref;

  static const _noAuthEndpoints = ['/auth/login', '/auth/refresh', '/auth/signup'];

  static const _secureStorage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final isNoAuth = _noAuthEndpoints.any((e) => options.path.endsWith(e));
    if (!isNoAuth) {
      final token = await _secureStorage.read(key: 'access_token');
      if (token != null) {
        options.headers['Authorization'] = 'Bearer $token';
      }
    }
    handler.next(options);
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      final isAuthEndpoint = _noAuthEndpoints.any((e) => err.requestOptions.path.endsWith(e));
      if (isAuthEndpoint) {
        handler.next(err);
        return;
      }

      // Try to refresh using the cookie jar (httpOnly refresh cookie is stored by CookieManager)
      try {
        final cookieJar = ref.read(cookieJarProvider);
        final refreshDio = Dio(BaseOptions(
          baseUrl: ApiConstants.baseUrl,
          headers: {'Content-Type': 'application/json'},
        ));
        refreshDio.interceptors.add(CookieManager(cookieJar));

        final response = await refreshDio.post(ApiConstants.refresh);
        final data = response.data as Map<String, dynamic>;
        final newAccessToken = data['accessToken'] as String;

        await _secureStorage.write(key: 'access_token', value: newAccessToken);

        // Retry the original request with the new token
        err.requestOptions.headers['Authorization'] = 'Bearer $newAccessToken';
        final retryDio = Dio(BaseOptions(baseUrl: ApiConstants.baseUrl));
        retryDio.interceptors.add(CookieManager(cookieJar));
        final retryResponse = await retryDio.fetch(err.requestOptions);
        handler.resolve(retryResponse);
        return;
      } catch (_) {
        // Refresh failed — clear tokens and reject
        await _secureStorage.delete(key: 'access_token');
        await _secureStorage.delete(key: 'workshop_id');
      }
    }

    handler.next(err);
  }
}