import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:prioraflow_tech/core/api/api_constants.dart';
import 'package:prioraflow_tech/core/api/dio_client.dart';

class AuthService {

  AuthService(this._dio, this._storage);
  final Dio _dio;
  final FlutterSecureStorage _storage;

  static const _accessTokenKey = 'access_token';
  static const _workshopIdKey = 'workshop_id';

  Future<String?> getAccessToken() async {
    return _storage.read(key: _accessTokenKey);
  }

  Future<AuthResult> login({
    required String email,
    required String password,
  }) async {
    final response = await _dio.post(
      ApiConstants.login,
      data: {'email': email, 'password': password},
    );

    final data = response.data as Map<String, dynamic>;
    // Backend returns camelCase: accessToken, user, workshops, workshopId
    final accessToken = data['accessToken'] as String;
    final user = data['user'] as Map<String, dynamic>;
    final workshops = (data['workshops'] as List<dynamic>?)
            ?.cast<Map<String, dynamic>>() ??
        [];
    final workshopId = data['workshopId'] as String?;

    // Store the access token
    await _storage.write(key: _accessTokenKey, value: accessToken);

    // If the user has one workshop, auto-select it
    if (workshopId != null) {
      await _storage.write(key: _workshopIdKey, value: workshopId);
    }

    return AuthResult(
      accessToken: accessToken,
      user: user,
      workshops: workshops,
      workshopId: workshopId,
    );
  }

  Future<bool> refreshToken() async {
    try {
      final response = await _dio.post(ApiConstants.refresh);
      final data = response.data as Map<String, dynamic>;
      final newAccessToken = data['accessToken'] as String;

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
    await _storage.delete(key: _workshopIdKey);
  }

  Future<bool> isAuthenticated() async {
    final token = await getAccessToken();
    return token != null;
  }
}

class AuthResult {

  AuthResult({
    required this.accessToken,
    required this.user,
    required this.workshops,
    this.workshopId,
  });
  final String accessToken;
  final Map<String, dynamic> user;
  final List<Map<String, dynamic>> workshops;
  final String? workshopId;
}

final authServiceProvider = Provider<AuthService>((ref) {
  final dio = ref.watch(dioProvider);
  const storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );
  return AuthService(dio, storage);
});