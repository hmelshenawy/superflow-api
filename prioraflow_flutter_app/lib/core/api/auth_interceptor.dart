import 'dart:async';
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:prioraflow_tech/core/api/api_constants.dart';
import 'package:prioraflow_tech/core/offline/connectivity_provider.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import 'package:prioraflow_tech/core/api/dio_client.dart';

class AuthInterceptor extends Interceptor {

  AuthInterceptor(this.ref);
  final Ref ref;

  static const _noAuthEndpoints = ['/auth/login', '/auth/refresh', '/auth/signup'];

  static const _secureStorage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  /// Mutex to prevent concurrent refresh requests.
  /// If a refresh is already in progress, other 401s will wait for its result
  /// and reuse the new token instead of triggering additional refresh calls.
  Completer<String>? _refreshCompleter;

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
  void onResponse(Response<dynamic> response, ResponseInterceptorHandler handler) {
    ref.read(isOnlineProvider.notifier).markOnline();
    handler.next(response);
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    // Mark offline for connection errors
    if (err.type == DioExceptionType.connectionError ||
        err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.sendTimeout ||
        err.type == DioExceptionType.receiveTimeout ||
        err.error is SocketException) {
      ref.read(isOnlineProvider.notifier).markOffline();
    }

    if (err.response?.statusCode == 401) {
      final isAuthEndpoint = _noAuthEndpoints.any((e) => err.requestOptions.path.endsWith(e));
      if (isAuthEndpoint) {
        handler.next(err);
        return;
      }

      // If a refresh is already in progress, wait for it
      if (_refreshCompleter != null && !_refreshCompleter!.isCompleted) {
        try {
          final newToken = await _refreshCompleter!.future;
          // Retry the original request with the new token
          err.requestOptions.headers['Authorization'] = 'Bearer $newToken';
          final retryDio = Dio(BaseOptions(baseUrl: ApiConstants.baseUrl));
          final cookieJar = ref.read(cookieJarProvider);
          retryDio.interceptors.add(CookieManager(cookieJar));
          final retryResponse = await retryDio.fetch(err.requestOptions);
          handler.resolve(retryResponse);
          ref.read(isOnlineProvider.notifier).markOnline();
          return;
        } catch (_) {
          // The in-progress refresh failed — propagate the original error
          handler.next(err);
          return;
        }
      }

      // Start a new refresh
      _refreshCompleter = Completer<String>();
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

        // Complete the mutex so any waiting requests get the new token
        _refreshCompleter!.complete(newAccessToken);

        // Retry the original request with the new token
        err.requestOptions.headers['Authorization'] = 'Bearer $newAccessToken';
        final retryDio = Dio(BaseOptions(baseUrl: ApiConstants.baseUrl));
        retryDio.interceptors.add(CookieManager(cookieJar));
        final retryResponse = await retryDio.fetch(err.requestOptions);
        handler.resolve(retryResponse);
        ref.read(isOnlineProvider.notifier).markOnline();
        return;
      } catch (_) {
        // Refresh failed — clear tokens and reject
        if (!_refreshCompleter!.isCompleted) {
          _refreshCompleter!.completeError(_);
        }
        await _secureStorage.delete(key: 'access_token');
        await _secureStorage.delete(key: 'workshop_id');
      } finally {
        _refreshCompleter = null;
      }
    }

    handler.next(err);
  }
}