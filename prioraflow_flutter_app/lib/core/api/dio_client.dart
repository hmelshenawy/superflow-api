import 'package:cookie_jar/cookie_jar.dart';
import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:prioraflow_tech/core/api/api_constants.dart';
import 'package:prioraflow_tech/core/api/auth_interceptor.dart';

final cookieJarProvider = Provider<CookieJar>((ref) {
  return CookieJar();
});

final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(
    BaseOptions(
      baseUrl: ApiConstants.baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      sendTimeout: const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ),
  );

  final cookieJar = ref.watch(cookieJarProvider);
  dio.interceptors.addAll([
    CookieManager(cookieJar),
    AuthInterceptor(ref),
    LogInterceptor(
      requestBody: true,
      responseBody: true,
    ),
  ]);

  return dio;
});