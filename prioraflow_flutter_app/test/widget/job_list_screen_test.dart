import 'package:flutter_test/flutter_test.dart';
import 'package:prioraflow_tech/features/jobs/data/models/job.dart';
import 'package:prioraflow_tech/features/jobs/data/models/job_status.dart';
import 'package:prioraflow_tech/core/utils/priority_utils.dart';

void main() {
  group('JobStatus', () {
    test('all statuses have labels', () {
      for (final status in JobStatus.values) {
        expect(status.label, isNotEmpty);
        expect(status.apiValue, isNotEmpty);
      }
    });

    test('fromString parses known statuses correctly', () {
      expect(JobStatus.fromString('in_progress'), JobStatus.inProgress);
      expect(JobStatus.fromString('checking'), JobStatus.checking);
      expect(JobStatus.fromString('quality_check'), JobStatus.qualityCheck);
      expect(JobStatus.fromString('estimate_sent'), JobStatus.estimateSent);
      expect(JobStatus.fromString('waiting_parts'), JobStatus.waitingParts);
    });

    test('fromString defaults to booked for unknown', () {
      expect(JobStatus.fromString('unknown_status'), JobStatus.booked);
      expect(JobStatus.fromString(null), JobStatus.booked);
      expect(JobStatus.fromString(''), JobStatus.booked);
    });

    test('phaseIndex is within valid range', () {
      for (final status in JobStatus.values) {
        expect(status.phaseIndex, inInclusiveRange(0, 5));
      }
    });

    test('phaseIndex progresses logically', () {
      expect(JobStatus.booked.phaseIndex, lessThan(JobStatus.checking.phaseIndex));
      expect(JobStatus.checking.phaseIndex, lessThan(JobStatus.inProgress.phaseIndex));
      expect(JobStatus.inProgress.phaseIndex, lessThan(JobStatus.closed.phaseIndex));
    });
  });

  group('Job model', () {
    test('fromJson parses minimal job', () {
      final job = Job.fromJson({
        'id': 'j1',
        'status': 'booked',
      });
      expect(job.id, 'j1');
      expect(job.status, JobStatus.booked);
      expect(job.priorityLevel, PriorityLevel.normal); // default
    });

    test('fromJson parses full job with vehicle', () {
      final job = Job.fromJson({
        'id': 'j1',
        'job_number': 'J-042',
        'status': 'in_progress',
        'priority_level': 'high',
        'vehicle': {
          'id': 'v1',
          'plate_number': 'ABC 123',
          'make': 'Toyota',
          'model': 'Camry',
          'year': 2023,
          'color': 'Silver',
          'vin': '1HGBH41JXMN109186',
        },
        'customer': {'id': 'c1', 'name': 'Ahmed Hassan'},
        'technician': {'id': 't1', 'name': 'Sami'},
        'advisor': {'id': 'a1', 'name': 'Omar'},
        'promised_at': '2024-01-15T14:00:00Z',
        'odometer_in': 45000,
        'customer_concern': 'Engine making noise',
        'job_concerns': [
          {'id': 'c1', 'title': 'Engine noise', 'status': 'needs_attention', 'job_id': 'j1'},
        ],
      });

      expect(job.jobNumber, 'J-042');
      expect(job.priorityLevel, PriorityLevel.high);
      expect(job.vehicle?.make, 'Toyota');
      expect(job.vehicle?.displayName, 'Toyota Camry 2023');
      expect(job.customer?.name, 'Ahmed Hassan');
      expect(job.concerns.length, 1);
      expect(job.odometerIn, 45000);
    });

    test('displayTitle falls back correctly', () {
      final withVehicle = Job.fromJson({
        'id': 'j1',
        'status': 'booked',
        'vehicle': {'id': 'v1', 'make': 'Honda', 'model': 'Civic'},
      });
      expect(withVehicle.displayTitle, 'Honda Civic');

      final withJobNumber = Job(id: 'abc123', jobNumber: 'J-100', status: JobStatus.booked);
      expect(withJobNumber.displayTitle, 'J-100');

      final withNothing = Job(id: 'abc123def456', status: JobStatus.booked);
      expect(withNothing.displayTitle, 'abc123de');
    });
  });

  group('PriorityLevel', () {
    test('priorityLevelFromString parses all levels', () {
      expect(priorityLevelFromString('low'), PriorityLevel.low);
      expect(priorityLevelFromString('normal'), PriorityLevel.normal);
      expect(priorityLevelFromString('high'), PriorityLevel.high);
      expect(priorityLevelFromString('critical'), PriorityLevel.critical);
    });

    test('priorityLevelFromString defaults to normal', () {
      expect(priorityLevelFromString(null), PriorityLevel.normal);
      expect(priorityLevelFromString('unknown'), PriorityLevel.normal);
    });

    test('all priority levels have labels', () {
      for (final level in PriorityLevel.values) {
        expect(level.label, isNotEmpty);
      }
    });
  });
}