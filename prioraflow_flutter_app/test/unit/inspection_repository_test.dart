import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:prioraflow_tech/features/inspection/data/inspection_repository.dart';
import 'package:prioraflow_tech/features/inspection/data/models/concern.dart';

class MockDio extends Mock implements Dio {}

void main() {
  late InspectionRepository repo;
  late MockDio mockDio;

  setUp(() {
    mockDio = MockDio();
    repo = InspectionRepository(mockDio);
  });

  group('InspectionRepository', () {
    final sampleConcernJson = {
      'id': 'c-1',
      'title': 'Brake noise',
      'description': 'Customer reports squeaking when braking',
      'code': 'BRK-001',
      'status': 'needs_attention',
      'technician_finding': 'Worn brake pads',
      'work_note': 'Est. 30min',
      'job_id': 'job-1',
      'sort_order': 1,
    };

    test('updateConcern sends PATCH with finding data', () async {
      when(() => mockDio.patch(
            any(),
            data: any(named: 'data'),
            options: any(named: 'options'),
            cancelToken: any(named: 'cancelToken'),
            onReceiveProgress: any(named: 'onReceiveProgress'),
            onSendProgress: any(named: 'onSendProgress'),
          )).thenAnswer((_) async => Response(
            data: sampleConcernJson,
            statusCode: 200,
            requestOptions: RequestOptions(path: '/jobs/job-1/concerns/c-1'),
          ));

      final concern = await repo.updateConcern(
        jobId: 'job-1',
        concernId: 'c-1',
        status: 'needs_attention',
        technicianFinding: 'Worn brake pads',
        workNote: 'Est. 30min',
      );

      expect(concern.id, 'c-1');
      expect(concern.technicianFinding, 'Worn brake pads');
      verify(() => mockDio.patch(any(), data: any(named: 'data'))).called(1);
    });

    test('createConcern sends POST', () async {
      when(() => mockDio.post(
            any(),
            data: any(named: 'data'),
            options: any(named: 'options'),
            cancelToken: any(named: 'cancelToken'),
            onReceiveProgress: any(named: 'onReceiveProgress'),
            onSendProgress: any(named: 'onSendProgress'),
          )).thenAnswer((_) async => Response(
            data: sampleConcernJson,
            statusCode: 201,
            requestOptions: RequestOptions(path: '/jobs/job-1/concerns'),
          ));

      final concern = await repo.createConcern(
        jobId: 'job-1',
        title: 'Brake noise',
        description: 'Customer reports squeaking when braking',
      );

      expect(concern.id, 'c-1');
      verify(() => mockDio.post(any(), data: any(named: 'data'))).called(1);
    });

    test('deleteConcern sends DELETE', () async {
      when(() => mockDio.delete(
            any(),
            options: any(named: 'options'),
            cancelToken: any(named: 'cancelToken'),
          )).thenAnswer((_) async => Response(
            data: null,
            statusCode: 204,
            requestOptions: RequestOptions(path: '/jobs/job-1/concerns/c-1'),
          ));

      await repo.deleteConcern(jobId: 'job-1', concernId: 'c-1');
      verify(() => mockDio.delete(any())).called(1);
    });
  });

  group('Concern model', () {
    test('fromJson parses concern with all fields', () {
      final concern = Concern.fromJson({
        'id': 'c-1',
        'title': 'Engine rattle',
        'description': 'Noise at idle',
        'code': 'ENG-001',
        'status': 'reviewing',
        'technician_finding': null,
        'work_note': null,
        'job_id': 'job-1',
        'sort_order': 0,
      });

      expect(concern.id, 'c-1');
      expect(concern.title, 'Engine rattle');
      expect(concern.code, 'ENG-001');
      expect(concern.status, 'reviewing');
      expect(concern.hasFinding, isFalse); // 'reviewing' means not yet inspected
    });

    test('hasFinding is true when technician_finding is set', () {
      final concern = Concern.fromJson({
        'id': 'c-1',
        'title': 'Brake noise',
        'status': 'needs_attention',
        'technician_finding': 'Worn pads',
        'job_id': 'job-1',
      });

      expect(concern.hasFinding, isTrue);
    });

    test('displayTitle falls back to description then title', () {
      final concernWithTitle = Concern.fromJson({
        'id': 'c-1',
        'title': 'Brake noise',
        'status': 'pending',
        'job_id': 'job-1',
      });
      expect(concernWithTitle.displayTitle, 'Brake noise');
    });
  });
}