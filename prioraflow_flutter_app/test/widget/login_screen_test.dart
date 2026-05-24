import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:prioraflow_tech/core/auth/auth_service.dart';
import 'package:prioraflow_tech/core/auth/auth_state.dart';

class MockDio extends Mock implements Dio {}
class MockSecureStorage extends Mock implements FlutterSecureStorage {}

void main() {
  group('AuthService', () {
    late MockDio mockDio;
    late MockSecureStorage mockStorage;
    late AuthService authService;

    setUp(() {
      mockDio = MockDio();
      mockStorage = MockSecureStorage();
      authService = AuthService(mockDio, mockStorage);
      registerFallbackValue(RequestOptions(path: '/'));
    });

    test('isAuthenticated returns true when token exists', () async {
      when(() => mockStorage.read(key: 'access_token')).thenAnswer((_) async => 'token');
      expect(await authService.isAuthenticated(), isTrue);
    });

    test('isAuthenticated returns false when no token', () async {
      when(() => mockStorage.read(key: 'access_token')).thenAnswer((_) async => null);
      expect(await authService.isAuthenticated(), isFalse);
    });

    test('login stores token and workshop ID', () async {
      when(() => mockDio.post(any(), data: any(named: 'data'))).thenAnswer((_) async => Response(
        data: {
          'accessToken': 'new-token',
          'user': {'id': 'u1', 'name': 'Test'},
          'workshops': [{'id': 'w1', 'name': 'WS'}],
          'workshopId': 'w1',
        },
        statusCode: 200,
        requestOptions: RequestOptions(path: '/auth/login'),
      ));
      when(() => mockStorage.write(key: any(named: 'key'), value: any(named: 'value')))
          .thenAnswer((_) async {});

      final result = await authService.login(email: 't@t.com', password: '123456');
      expect(result.accessToken, 'new-token');
      verify(() => mockStorage.write(key: 'access_token', value: 'new-token')).called(1);
      verify(() => mockStorage.write(key: 'workshop_id', value: 'w1')).called(1);
    });

    test('logout clears tokens even on server error', () async {
      when(() => mockDio.post(any(), data: any(named: 'data')))
          .thenThrow(DioException(requestOptions: RequestOptions(path: '/auth/logout'), type: DioExceptionType.connectionError));
      when(() => mockStorage.delete(key: any(named: 'key'))).thenAnswer((_) async {});

      await authService.logout();
      verify(() => mockStorage.delete(key: 'access_token')).called(1);
      verify(() => mockStorage.delete(key: 'workshop_id')).called(1);
    });

    test('selectWorkshop posts and stores new token', () async {
      when(() => mockDio.post(any(), data: any(named: 'data'))).thenAnswer((_) async => Response(
        data: {
          'accessToken': 'ws-token',
          'workshop': {'id': 'w2', 'name': 'WS2', 'slug': 'ws2'},
        },
        statusCode: 200,
        requestOptions: RequestOptions(path: '/auth/select-workshop'),
      ));
      when(() => mockStorage.write(key: any(named: 'key'), value: any(named: 'value')))
          .thenAnswer((_) async {});

      final result = await authService.selectWorkshop('w2');
      expect(result.accessToken, 'ws-token');
      expect(result.workshop.id, 'w2');
      verify(() => mockStorage.write(key: 'access_token', value: 'ws-token')).called(1);
    });

    test('getCurrentUser fetches user profile', () async {
      when(() => mockDio.get(any(), options: any(named: 'options'))).thenAnswer((_) async => Response(
        data: {'id': 'u1', 'name': 'Test User', 'email': 'test@test.com'},
        statusCode: 200,
        requestOptions: RequestOptions(path: '/auth/me'),
      ));

      final user = await authService.getCurrentUser();
      expect(user['name'], 'Test User');
      expect(user['email'], 'test@test.com');
    });
  });

  group('AuthState', () {
    test('default values are correct', () {
      const state = AuthState();
      expect(state.isLoading, isFalse);
      expect(state.isAuthenticated, isFalse);
      expect(state.error, isNull);
      expect(state.user, isNull);
      expect(state.workshops, isEmpty);
      expect(state.needsWorkshopSelection, isFalse);
    });

    test('copyWith preserves values correctly', () {
      const state = AuthState(isAuthenticated: true, user: {'name': 'Test'});
      final updated = state.copyWith(isLoading: true);
      expect(updated.isAuthenticated, isTrue);
      expect(updated.isLoading, isTrue);
      expect(updated.user?['name'], 'Test');
    });

    test('needsWorkshopSelection works', () {
      const state = AuthState(needsWorkshopSelection: true, workshops: [Workshop(id: 'w1', name: 'WS')]);
      expect(state.needsWorkshopSelection, isTrue);
      expect(state.workshops.length, 1);
    });
  });

  group('Workshop', () {
    test('fromJson parses correctly', () {
      final ws = Workshop.fromJson({'id': 'w1', 'name': 'Workshop 1', 'slug': 'ws1'});
      expect(ws.id, 'w1');
      expect(ws.name, 'Workshop 1');
      expect(ws.slug, 'ws1');
    });

    test('toJson round-trips', () {
      const ws = Workshop(id: 'w1', name: 'Test WS', slug: 'test');
      final json = ws.toJson();
      expect(json['id'], 'w1');
      expect(json['name'], 'Test WS');
      expect(json['slug'], 'test');
    });

    test('props include all fields for equality', () {
      const ws1 = Workshop(id: 'w1', name: 'A', slug: 'a');
      const ws2 = Workshop(id: 'w1', name: 'A', slug: 'a');
      expect(ws1, equals(ws2));
    });
  });
}