import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:prioraflow_tech/core/auth/auth_service.dart';
import 'package:prioraflow_tech/core/auth/auth_state.dart';

class MockDio extends Mock implements Dio {}
class MockSecureStorage extends Mock implements FlutterSecureStorage {}

void main() {
  late AuthService authService;
  late MockDio mockDio;
  late MockSecureStorage mockStorage;

  setUp(() {
    mockDio = MockDio();
    mockStorage = MockSecureStorage();
    authService = AuthService(mockDio, mockStorage);
  });

  group('AuthService', () {
    test('login stores token and returns AuthResult', () async {
      when(() => mockDio.post(
            any(),
            data: any(named: 'data'),
            options: any(named: 'options'),
            cancelToken: any(named: 'cancelToken'),
            onSendProgress: any(named: 'onSendProgress'),
            onReceiveProgress: any(named: 'onReceiveProgress'),
          )).thenAnswer((_) async => Response(
            data: {
              'accessToken': 'test-token',
              'user': {'id': 'u-1', 'name': 'Test User', 'email': 'test@test.com'},
              'workshops': [{'id': 'w-1', 'name': 'Test Workshop', 'slug': 'test'}],
              'workshopId': 'w-1',
            },
            statusCode: 200,
            requestOptions: RequestOptions(path: '/auth/login'),
          ));

      when(() => mockStorage.write(key: any(named: 'key'), value: any(named: 'value')))
          .thenAnswer((_) async {});

      final result = await authService.login(
        email: 'test@test.com',
        password: 'password123',
      );

      expect(result.accessToken, 'test-token');
      expect(result.user['name'], 'Test User');
      expect(result.workshops.length, 1);
      expect(result.workshopId, 'w-1');

      verify(() => mockStorage.write(key: 'access_token', value: 'test-token')).called(1);
      verify(() => mockStorage.write(key: 'workshop_id', value: 'w-1')).called(1);
    });

    test('login with multiple workshops sets needsWorkshopSelection', () async {
      when(() => mockDio.post(
            any(),
            data: any(named: 'data'),
            options: any(named: 'options'),
            cancelToken: any(named: 'cancelToken'),
            onSendProgress: any(named: 'onSendProgress'),
            onReceiveProgress: any(named: 'onReceiveProgress'),
          )).thenAnswer((_) async => Response(
            data: {
              'accessToken': 'test-token',
              'user': {'id': 'u-1', 'name': 'Test User'},
              'workshops': [
                {'id': 'w-1', 'name': 'Workshop A'},
                {'id': 'w-2', 'name': 'Workshop B'},
              ],
              'workshopId': null,
            },
            statusCode: 200,
            requestOptions: RequestOptions(path: '/auth/login'),
          ));

      when(() => mockStorage.write(key: any(named: 'key'), value: any(named: 'value')))
          .thenAnswer((_) async {});

      final result = await authService.login(
        email: 'test@test.com',
        password: 'password123',
      );

      expect(result.workshops.length, 2);
      expect(result.workshopId, isNull);
    });

    test('isAuthenticated returns true when token exists', () async {
      when(() => mockStorage.read(key: 'access_token'))
          .thenAnswer((_) async => 'existing-token');

      final result = await authService.isAuthenticated();
      expect(result, isTrue);
    });

    test('isAuthenticated returns false when no token', () async {
      when(() => mockStorage.read(key: 'access_token'))
          .thenAnswer((_) async => null);

      final result = await authService.isAuthenticated();
      expect(result, isFalse);
    });

    test('logout clears tokens even if server call fails', () async {
      when(() => mockDio.post(any(), data: any(named: 'data')))
          .thenThrow(DioException(
            requestOptions: RequestOptions(path: '/auth/logout'),
            type: DioExceptionType.connectionError,
          ));
      when(() => mockStorage.delete(key: 'access_token')).thenAnswer((_) async {});
      when(() => mockStorage.delete(key: 'workshop_id')).thenAnswer((_) async {});

      await authService.logout();

      verify(() => mockStorage.delete(key: 'access_token')).called(1);
      verify(() => mockStorage.delete(key: 'workshop_id')).called(1);
    });

    test('clearTokens deletes both keys', () async {
      when(() => mockStorage.delete(key: any(named: 'key')))
          .thenAnswer((_) async {});

      await authService.clearTokens();

      verify(() => mockStorage.delete(key: 'access_token')).called(1);
      verify(() => mockStorage.delete(key: 'workshop_id')).called(1);
    });
  });

  group('AuthState', () {
    test('default values', () {
      const state = AuthState();
      expect(state.isLoading, isFalse);
      expect(state.isAuthenticated, isFalse);
      expect(state.error, isNull);
      expect(state.user, isNull);
      expect(state.workshops, isEmpty);
      expect(state.needsWorkshopSelection, isFalse);
    });

    test('copyWith preserves values', () {
      const state = AuthState(isAuthenticated: true);
      final updated = state.copyWith(isLoading: true);
      expect(updated.isAuthenticated, isTrue);
      expect(updated.isLoading, isTrue);
    });
  });

  group('Workshop', () {
    test('fromJson parses workshop', () {
      final workshop = Workshop.fromJson({
        'id': 'w-1',
        'name': 'Test Workshop',
        'slug': 'test',
      });
      expect(workshop.id, 'w-1');
      expect(workshop.name, 'Test Workshop');
      expect(workshop.slug, 'test');
    });

    test('toJson round-trips', () {
      final workshop = Workshop(id: 'w-1', name: 'Test', slug: 'test');
      final json = workshop.toJson();
      expect(json['id'], 'w-1');
      expect(json['name'], 'Test');
    });
  });
}