class Concern {

  const Concern({
    required this.id,
    required this.jobId,
    required this.description,
    this.category,
    this.severity,
    this.findingStatus,
    this.createdAt,
  });

  factory Concern.fromJson(Map<String, dynamic> json) {
    return Concern(
      id: json['id'] as String,
      jobId: json['job_id'] as String? ?? json['jobId'] as String? ?? '',
      description: json['description'] as String? ?? json['customer_concern'] as String? ?? '',
      category: json['category'] as String?,
      severity: json['severity'] as String?,
      findingStatus: json['finding_status'] as String? ??
          ((json['inspection_responses'] as List?)?.isNotEmpty ?? false ? 'inspected' : null),
      createdAt: json['created_at'] != null ? DateTime.parse(json['created_at'] as String) : null,
    );
  }
  final String id;
  final String jobId;
  final String description;
  final String? category;
  final String? severity;
  final String? findingStatus;
  final DateTime? createdAt;
}