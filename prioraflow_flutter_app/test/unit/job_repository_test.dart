import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:prioraflow_tech/core/utils/priority_utils.dart';
import 'package:prioraflow_tech/features/jobs/data/job_repository.dart';
import 'package:prioraflow_tech/features/jobs/data/models/job.dart';
import 'package:prioraflow_tech/features/jobs/data/models/job_status.dart';

class MockDio extends Mock implements Dio {}

void main() {
  late JobRepository repo;
  late MockDio mockDio;

  setUp(() {
    mockDio = MockDio();
    repo = JobRepository(mockDio);
  });

  group('JobRepository', () {
    final sampleJobJson = {
      'id': 'job-1',
      'job_number': 'J-001',
      'status': 'in_progress',
      'priority_level': 'high',
      'vehicle': {
        'id': 'v-1',
        'plate_number': 'ABC 123',
        'make': 'Toyota',
        'model': 'Camry',
        'year': 2023,
      },
      'customer': {'id': 'c-1', 'name': 'Ahmed'},
      'technician': {'id': 't-1', 'name': 'Sami'},
    };

    test('getMyJobs returns paginated jobs', () async {
      when(() => mockDio.get(
            any(),
            queryParameters: any(named: 'queryParameters'),
            options: any(named: 'options'),
            cancelToken: any(named: 'cancelToken'),
            onReceiveProgress: any(named: 'onReceiveProgress'),
          )).thenAnswer((_) async => Response(
            data: {
              'items': [sampleJobJson],
              'total': 1,
              'page': 1,
              'limit': 20,
            },
            statusCode: 200,
            requestOptions: RequestOptions(path: '/jobs'),
          ));

      final result = await repo.getMyJobs();
      expect(result.items.length, 1);
      expect(result.items.first.id, 'job-1');
      expect(result.total, 1);
      expect(result.items.first.status, JobStatus.inProgress);
    });

    test('getMyJobs passes status and search filters', () async {
      when(() => mockDio.get(
            any(),
            queryParameters: any(named: 'queryParameters'),
            options: any(named: 'options'),
            cancelToken: any(named: 'cancelToken'),
            onReceiveProgress: any(named: 'onReceiveProgress'),
          )).thenAnswer((_) async => Response(
            data: {
              'items': [],
              'total': 0,
              'page': 1,
              'limit': 20,
            },
            statusCode: 200,
            requestOptions: RequestOptions(path: '/jobs'),
          ));

      await repo.getMyJobs(status: 'in_progress', search: 'toyota');
      verify(() => mockDio.get(
            any(),
            queryParameters: any(named: 'queryParameters'),
          )).called(1);
    });

    test('getJobDetail returns a Job', () async {
      when(() => mockDio.get(
            any(),
            options: any(named: 'options'),
            cancelToken: any(named: 'cancelToken'),
            onReceiveProgress: any(named: 'onReceiveProgress'),
          )).thenAnswer((_) async => Response(
            data: sampleJobJson,
            statusCode: 200,
            requestOptions: RequestOptions(path: '/jobs/job-1'),
          ));

      final job = await repo.getJobDetail('job-1');
      expect(job.id, 'job-1');
      expect(job.status, JobStatus.inProgress);
      expect(job.vehicle?.plateNumber, 'ABC 123');
    });

    test('updateJobStatus sends PATCH with to_status', () async {
      when(() => mockDio.patch(
            any(),
            data: any(named: 'data'),
            options: any(named: 'options'),
            cancelToken: any(named: 'cancelToken'),
            onReceiveProgress: any(named: 'onReceiveProgress'),
            onSendProgress: any(named: 'onSendProgress'),
          )).thenAnswer((_) async => Response(
            data: sampleJobJson,
            statusCode: 200,
            requestOptions: RequestOptions(path: '/jobs/job-1/status'),
          ));

      final job = await repo.updateJobStatus('job-1', JobStatus.checking);
      expect(job, isA<Job>());
    });

    test('updateJobStatus sends reason when provided', () async {
      when(() => mockDio.patch(
            any(),
            data: any(named: 'data'),
            options: any(named: 'options'),
            cancelToken: any(named: 'cancelToken'),
            onReceiveProgress: any(named: 'onReceiveProgress'),
            onSendProgress: any(named: 'onSendProgress'),
          )).thenAnswer((_) async => Response(
            data: sampleJobJson,
            statusCode: 200,
            requestOptions: RequestOptions(path: '/jobs/job-1/status'),
          ));

      await repo.updateJobStatus('job-1', JobStatus.noShow, reason: 'Customer did not show');
      verify(() => mockDio.patch(any(), data: any(named: 'data'))).called(1);
    });
  });

  group('JobStatus', () {
    test('fromString parses known statuses', () {
      expect(JobStatus.fromString('in_progress'), JobStatus.inProgress);
      expect(JobStatus.fromString('checking'), JobStatus.checking);
      expect(JobStatus.fromString('quality_check'), JobStatus.qualityCheck);
    });

    test('fromString defaults to booked for unknown values', () {
      expect(JobStatus.fromString('unknown'), JobStatus.booked);
      expect(JobStatus.fromString(null), JobStatus.booked);
    });

    test('apiValue returns snake_case', () {
      expect(JobStatus.inProgress.apiValue, 'in_progress');
      expect(JobStatus.waitingParts.apiValue, 'waiting_parts');
      expect(JobStatus.estimateSent.apiValue, 'estimate_sent');
    });

    test('phaseIndex returns correct progression', () {
      expect(JobStatus.booked.phaseIndex, 0);
      expect(JobStatus.checking.phaseIndex, 1);
      expect(JobStatus.inProgress.phaseIndex, 4);
      expect(JobStatus.closed.phaseIndex, 5);
    });
  });

  group('Job model', () {
    test('fromJson parses basic job', () {
      final job = Job.fromJson({
        'id': 'j1',
        'status': 'booked',
        'priority_level': 'normal',
      });
      expect(job.id, 'j1');
      expect(job.status, JobStatus.booked);
      expect(job.priorityLevel, PriorityLevel.normal);
    });

    test('fromJson parses job with vehicle', () {
      final job = Job.fromJson({
        'id': 'j1',
        'status': 'in_progress',
        'vehicle': {
          'id': 'v1',
          'plate_number': 'XYZ 789',
          'make': 'Honda',
          'model': 'Civic',
        },
      });
      expect(job.vehicle?.plateNumber, 'XYZ 789');
      expect(job.vehicle?.displayName, 'Honda Civic');
    });

    test('displayTitle falls back to job number or id', () {
      final job1 = Job(id: 'abc123', jobNumber: 'J-042', status: JobStatus.booked);
      expect(job1.displayTitle, 'J-042');

      final job2 = Job(id: 'abc123def456', status: JobStatus.booked);
      expect(job2.displayTitle, 'abc123de');
    });
  });
}