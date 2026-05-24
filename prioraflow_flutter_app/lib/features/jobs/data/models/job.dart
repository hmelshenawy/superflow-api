import 'package:prioraflow_tech/core/utils/priority_utils.dart';
import 'package:prioraflow_tech/features/inspection/data/models/concern.dart';
import 'package:prioraflow_tech/features/inspection/data/models/inspection.dart';
import 'package:prioraflow_tech/features/jobs/data/models/job_status.dart';

class Job {

  const Job({
    required this.id,
    this.jobNumber,
    this.status = JobStatus.booked,
    this.priorityLevel = PriorityLevel.normal,
    this.customerConcern,
    this.internalNotes,
    this.odometerIn,
    this.promisedAt,
    this.createdAt,
    this.updatedAt,
    this.vehicle,
    this.customer,
    this.technician,
    this.advisor,
    this.concernsCount,
    this.partsStatus,
    this.concerns = const [],
    this.inspection,
    this.workflowStageKey,
    this.isCustomerWaiting,
    this.dmsRoNumber,
    this.isArchived = false,
  });

  factory Job.fromJson(Map<String, dynamic> json) {
    return Job(
      id: json['id'] as String,
      jobNumber: json['job_number'] as String?,
      status: JobStatus.fromString(json['status'] as String?),
      priorityLevel: priorityLevelFromString(
        json['priority_level'] as String? ?? json['customer_sensitivity'] as String?,
      ),
      customerConcern: json['customer_concern'] as String?,
      internalNotes: json['internal_notes'] as String?,
      odometerIn: json['odometer_in'] as int?,
      promisedAt: json['promised_at'] != null
          ? DateTime.parse(json['promised_at'] as String)
          : null,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : null,
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'] as String)
          : null,
      vehicle: json['vehicle'] != null
          ? VehicleInfo.fromJson(json['vehicle'] as Map<String, dynamic>)
          : null,
      customer: json['customer'] != null
          ? CustomerInfo.fromJson(json['customer'] as Map<String, dynamic>)
          : null,
      technician: json['technician'] != null
          ? TechnicianInfo.fromJson(json['technician'] as Map<String, dynamic>)
          : null,
      advisor: json['advisor'] != null
          ? AdvisorInfo.fromJson(json['advisor'] as Map<String, dynamic>)
          : null,
      concernsCount: (json['job_concerns'] as List<dynamic>?)?.length ??
          json['_count']?['concerns'] as int? ??
          json['concerns_count'] as int?,
      partsStatus: json['parts_status'] as String?,
      concerns: (json['job_concerns'] as List<dynamic>?)
              ?.map((e) => Concern.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      inspection: json['inspection'] != null
          ? Inspection.fromJson(json['inspection'] as Map<String, dynamic>)
          : null,
      workflowStageKey: json['workflow_stage_key'] as String?,
      isCustomerWaiting: json['is_customer_waiting'] as bool?,
      dmsRoNumber: json['dms_ro_number'] as String?,
      isArchived: json['is_archived'] as bool? ?? json['archived_at'] != null,
    );
  }

  final String id;
  final String? jobNumber;
  final JobStatus status;
  final PriorityLevel priorityLevel;
  final String? customerConcern;
  final String? internalNotes;
  final int? odometerIn;
  final DateTime? promisedAt;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  // Relations
  final VehicleInfo? vehicle;
  final CustomerInfo? customer;
  final TechnicianInfo? technician;
  final AdvisorInfo? advisor;

  // Counts & status
  final int? concernsCount;
  final String? partsStatus;

  // Nested concerns (from job detail)
  final List<Concern> concerns;

  // DVI inspection (from job detail)
  final Inspection? inspection;

  // Extra fields
  final String? workflowStageKey;
  final bool? isCustomerWaiting;
  final String? dmsRoNumber;
  final bool isArchived;

  String get displayTitle => vehicle?.displayName ?? jobNumber ?? id.substring(0, 8);

  /// Concerns created by the advisor at check-in (no inspection_response_id).
  List<Concern> get advisorConcerns =>
      concerns.where((c) => c.source == ConcernSource.advisor).toList();

  /// Concerns found during technician DVI inspection (linked to an inspection response).
  List<Concern> get inspectionConcerns =>
      concerns.where((c) => c.source == ConcernSource.inspection).toList();
}

class VehicleInfo {

  const VehicleInfo({
    required this.id,
    this.plateNumber,
    this.make,
    this.model,
    this.year,
    this.color,
    this.vin,
  });

  factory VehicleInfo.fromJson(Map<String, dynamic> json) {
    return VehicleInfo(
      id: json['id'] as String,
      plateNumber: json['plate_number'] as String? ?? json['plate'] as String?,
      make: json['make'] as String?,
      model: json['model'] as String?,
      year: json['year'] as int?,
      color: json['color'] as String?,
      vin: json['vin'] as String?,
    );
  }
  final String id;
  final String? plateNumber;
  final String? make;
  final String? model;
  final int? year;
  final String? color;
  final String? vin;

  String get displayName {
    final parts = [make, model, year?.toString()].where((p) => p != null).toList();
    if (parts.isNotEmpty) return parts.join(' ');
    return plateNumber ?? 'Unknown Vehicle';
  }
}

class CustomerInfo {

  const CustomerInfo({required this.id, this.name, this.phone});

  factory CustomerInfo.fromJson(Map<String, dynamic> json) {
    return CustomerInfo(
      id: json['id'] as String,
      name: json['name'] as String?,
      phone: json['phone'] as String?,
    );
  }
  final String id;
  final String? name;
  final String? phone;
}

class TechnicianInfo {

  const TechnicianInfo({required this.id, this.name});

  factory TechnicianInfo.fromJson(Map<String, dynamic> json) {
    return TechnicianInfo(
      id: json['id'] as String,
      name: json['name'] as String?,
    );
  }
  final String id;
  final String? name;
}

class AdvisorInfo {

  const AdvisorInfo({required this.id, this.name});

  factory AdvisorInfo.fromJson(Map<String, dynamic> json) {
    return AdvisorInfo(
      id: json['id'] as String,
      name: json['name'] as String?,
    );
  }
  final String id;
  final String? name;
}