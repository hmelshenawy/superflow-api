class Concern {

  const Concern({
    required this.id,
    required this.jobId,
    required this.description,
    this.title,
    this.code,
    this.status,
    this.technicianFinding,
    this.category,
    this.severity,
    this.findingStatus,
    this.createdAt,
  });

  factory Concern.fromJson(Map<String, dynamic> json) {
    return Concern(
      id: json['id'] as String,
      jobId: json['job_id'] as String? ?? '',
      description: (json['description'] as String?) ??
          json['title'] as String? ??
          json['customer_concern'] as String? ??
          '',
      title: json['title'] as String?,
      code: json['code'] as String?,
      status: json['status'] as String?,
      technicianFinding: json['technician_finding'] as String?,
      category: json['category'] as String?,
      severity: json['severity'] as String?,
      findingStatus: json['finding_status'] as String? ??
          ((json['inspection_responses'] as List?)?.isNotEmpty ?? false
              ? 'inspected'
              : null),
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : null,
    );
  }

  final String id;
  final String jobId;
  final String description;
  final String? title;
  final String? code;
  final String? status;
  final String? technicianFinding;
  final String? category;
  final String? severity;
  final String? findingStatus;
  final DateTime? createdAt;

  String get displayTitle => title ?? description;
}