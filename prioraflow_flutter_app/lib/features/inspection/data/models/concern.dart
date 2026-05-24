class Concern {

  const Concern({
    required this.id,
    required this.jobId,
    this.title,
    this.code,
    this.description = '',
    this.status,
    this.technicianFinding,
    this.workNote,
    this.qcNote,
    this.customerDecision,
    this.sortOrder,
    this.category,
    this.severity,
    this.createdAt,
    this.updatedAt,
    this.mediaFiles,
  });

  factory Concern.fromJson(Map<String, dynamic> json) {
    final List<dynamic>? mediaRaw = json['media_files'] as List<dynamic>?;
    return Concern(
      id: json['id'] as String,
      jobId: json['job_id'] as String? ?? '',
      title: json['title'] as String?,
      code: json['code'] as String?,
      description: (json['description'] as String?) ??
          json['customer_concern'] as String? ??
          '',
      status: json['status'] as String?,
      technicianFinding: json['technician_finding'] as String?,
      workNote: json['work_note'] as String?,
      qcNote: json['qc_note'] as String?,
      customerDecision: json['customer_decision'] as String?,
      sortOrder: json['sort_order'] as int?,
      category: json['category'] as String?,
      severity: json['severity'] as String?,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : null,
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'] as String)
          : null,
      mediaFiles: mediaRaw
          ?.map((e) => ConcernMedia.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  final String id;
  final String jobId;
  final String? title;
  final String? code;
  final String description;
  final String? status;
  final String? technicianFinding;
  final String? workNote;
  final String? qcNote;
  final String? customerDecision;
  final int? sortOrder;
  final String? category;
  final String? severity;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final List<ConcernMedia>? mediaFiles;

  /// Whether a technician has already inspected this concern
  bool get hasFinding => status != null && status != 'reviewing';

  String get displayTitle => title ?? description;
}

class ConcernMedia {

  const ConcernMedia({
    required this.id,
    this.url,
    this.mimeType,
    this.uploadedAt,
  });

  factory ConcernMedia.fromJson(Map<String, dynamic> json) {
    return ConcernMedia(
      id: json['id'] as String,
      url: json['url'] as String?,
      mimeType: json['mime_type'] as String?,
      uploadedAt: json['uploaded_at'] != null
          ? DateTime.parse(json['uploaded_at'] as String)
          : null,
    );
  }

  final String id;
  final String? url;
  final String? mimeType;
  final DateTime? uploadedAt;
}