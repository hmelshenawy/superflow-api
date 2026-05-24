import 'package:prioraflow_tech/core/utils/parse_utils.dart';
import 'package:prioraflow_tech/features/inspection/data/models/inspection_template.dart';

/// Urgency level for an inspection response.
enum InspectionUrgency {
  none,
  low,
  medium,
  high,
  critical;

  static InspectionUrgency fromString(String? value) {
    return switch (value?.toLowerCase()) {
      'low' => InspectionUrgency.low,
      'medium' => InspectionUrgency.medium,
      'high' => InspectionUrgency.high,
      'critical' => InspectionUrgency.critical,
      _ => InspectionUrgency.none,
    };
  }

  String get apiValue => switch (this) {
        InspectionUrgency.none => 'none',
        InspectionUrgency.low => 'low',
        InspectionUrgency.medium => 'medium',
        InspectionUrgency.high => 'high',
        InspectionUrgency.critical => 'critical',
      };
}

/// Media file attached to an inspection response or QC response.
class InspectionMedia {
  const InspectionMedia({
    required this.id,
    this.url,
    this.fileType,
    this.mimeType,
    this.originalFilename,
    this.sizeBytes,
  });

  factory InspectionMedia.fromJson(Map<String, dynamic> json) {
    return InspectionMedia(
      id: json['id'] as String,
      url: json['url'] as String?,
      fileType: json['file_type'] as String?,
      mimeType: json['mime_type'] as String?,
      originalFilename: json['original_filename'] as String?,
      sizeBytes: parseInt(json['size_bytes']),
    );
  }

  final String id;
  final String? url;
  final String? fileType;
  final String? mimeType;
  final String? originalFilename;
  final int? sizeBytes;

  Map<String, dynamic> toJson() => {
        'id': id,
        'url': url,
        'file_type': fileType,
        'mime_type': mimeType,
        'original_filename': originalFilename,
        'size_bytes': sizeBytes,
      };
}

/// A single response to an inspection item.
class InspectionResponse {
  const InspectionResponse({
    required this.id,
    this.itemId,
    this.value,
    this.urgency,
    this.techNotes,
    this.mediaCount,
    this.recordedAt,
    this.mediaFiles = const [],
    this.item,
  });

  factory InspectionResponse.fromJson(Map<String, dynamic> json) {
    return InspectionResponse(
      id: json['id'] as String,
      itemId: json['item_id'] as String?,
      value: json['value'] as String?,
      urgency: InspectionUrgency.fromString(json['urgency'] as String?),
      techNotes: json['tech_notes'] as String?,
      mediaCount: parseInt(json['media_count']),
      recordedAt: json['recorded_at'] != null
          ? DateTime.parse(json['recorded_at'] as String)
          : null,
      mediaFiles: (json['media_files'] as List<dynamic>?)
              ?.map(
                  (e) => InspectionMedia.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      item: json['inspection_items'] != null
          ? InspectionItem.fromJson(
              json['inspection_items'] as Map<String, dynamic>)
          : null,
    );
  }

  final String id;
  final String? itemId;
  final String? value;
  final InspectionUrgency? urgency;
  final String? techNotes;
  final int? mediaCount;
  final DateTime? recordedAt;
  final List<InspectionMedia> mediaFiles;
  final InspectionItem? item;

  Map<String, dynamic> toJson() => {
        'id': id,
        'item_id': itemId,
        'value': value,
        'urgency': urgency?.apiValue,
        'tech_notes': techNotes,
        'media_count': mediaCount,
        'recorded_at': recordedAt?.toIso8601String(),
        'media_files': mediaFiles.map((m) => m.toJson()).toList(),
      };
}

/// A Digital Vehicle Inspection (DVI) — one per job.
class Inspection {
  const Inspection({
    required this.id,
    this.jobId,
    this.templateId,
    this.technicianId,
    this.status,
    this.offlineDraft,
    this.startedAt,
    this.submittedAt,
    this.createdAt,
    this.responses = const [],
    this.template,
  });

  factory Inspection.fromJson(Map<String, dynamic> json) {
    return Inspection(
      id: json['id'] as String,
      jobId: json['job_id'] as String?,
      templateId: json['template_id'] as String?,
      technicianId: json['technician_id'] as String?,
      status: json['status'] as String?,
      offlineDraft: json['offline_draft'] as String?,
      startedAt: json['started_at'] != null
          ? DateTime.parse(json['started_at'] as String)
          : null,
      submittedAt: json['submitted_at'] != null
          ? DateTime.parse(json['submitted_at'] as String)
          : null,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : null,
      responses: (json['inspection_responses'] as List<dynamic>?)
              ?.map((e) =>
                  InspectionResponse.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      template: json['inspection_templates'] != null
          ? InspectionTemplate.fromJson(
              json['inspection_templates'] as Map<String, dynamic>)
          : null,
    );
  }

  final String id;
  final String? jobId;
  final String? templateId;
  final String? technicianId;
  final String? status;
  final String? offlineDraft;
  final DateTime? startedAt;
  final DateTime? submittedAt;
  final DateTime? createdAt;
  final List<InspectionResponse> responses;
  final InspectionTemplate? template;

  bool get isLocked =>
      status == 'submitted' || status == 'reviewed' || status == 'approved';
  bool get isInProgress => status == 'in_progress';
  bool get isDraft => status == null || status == 'draft';

  Map<String, dynamic> toJson() => {
        'id': id,
        'job_id': jobId,
        'template_id': templateId,
        'technician_id': technicianId,
        'status': status,
        'offline_draft': offlineDraft,
        'started_at': startedAt?.toIso8601String(),
        'submitted_at': submittedAt?.toIso8601String(),
        'created_at': createdAt?.toIso8601String(),
        'inspection_responses': responses.map((r) => r.toJson()).toList(),
      };
}