import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:prioraflow_tech/core/api/api_constants.dart';
import 'package:prioraflow_tech/core/api/dio_client.dart';

class AuthService {
  final Dio _dio;
  final FlutterSecureStorage _storage;

  static const _accessTokenKey = 'access_token';
  static const _refreshTokenKey = 'refresh_token';

  AuthService(this._dio, this._storage);

  Future<String?> getAccessToken() async {
    return _storage.read(key: _accessTokenKey);
  }

  Future<String?> getRefreshToken() async {
    return _storage.read(key: _refreshTokenKey);
  }

  Future<AuthResult> login({
    required String email,
    required String password,
  }) async {
    final response = await _dio.post(
      ApiConstants.login,
      data: {'email': email, 'password': password},
    );

    final data = response.data;
    final accessToken = data['access_token'] as String;
    final user = data['user'] as Map<String, dynamic>;

    // Refresh token comes as httpOnly cookie from the server
    await _storage.write(key: _accessTokenKey, value: accessToken);

    return AuthResult(accessToken: accessToken, user: user);
  }

  Future<bool> refreshToken() async {
    try {
      final response = await _dio.post(ApiConstants.refresh);
      final data = response.data;
      final newAccessToken = data['access_token'] as String;

      await _storage.write(key: _accessTokenKey, value: newAccessToken);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<Map<String, dynamic>> getCurrentUser() async {
    final response = await _dio.get(ApiConstants.me);
    return response.data as Map<String, dynamic>;
  }

  Future<void> logout() async {
    try {
      await _dio.post(ApiConstants.logout);
    } catch (_) {
      // Even if the server call fails, clear local tokens
    }
    await clearTokens();
  }

  Future<void> clearTokens() async {
    await _storage.delete(key: _accessTokenKey);
    await _storage.delete(key: _refreshTokenKey);
  }

  Future<bool> isAuthenticated() async {
    final token = await getAccessToken();
    return token != null;
  }
}

class AuthResult {
  final String accessToken;
  final Map<String, dynamic> user;

  AuthResult({required this.accessToken, required this.user});
}

final authServiceProvider = Provider<AuthService>((ref) {
  final dio = ref.watch(dioProvider);
  const storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );
  return AuthService(dio, storage);
});