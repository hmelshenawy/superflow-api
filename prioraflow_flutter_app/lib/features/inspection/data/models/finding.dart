class Finding {
  final String id;
  final String concernId;
  final FindingType type;
  final String? description;
  final int? estimatedMinutes;
  final FindingStatus status;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const Finding({
    required this.id,
    required this.concernId,
    this.type = FindingType.ok,
    this.description,
    this.estimatedMinutes,
    this.status = FindingStatus.draft,
    this.createdAt,
    this.updatedAt,
  });

  factory Finding.fromJson(Map<String, dynamic> json) {
    return Finding(
      id: json['id'] as String,
      concernId: json['concern_id'] as String? ?? json['concernId'] as String? ?? '',
      type: FindingType.fromString(json['type'] as String?),
      description: json['description'] as String?,
      estimatedMinutes: json['estimated_minutes'] as int?,
      status: FindingStatus.fromString(json['status'] as String?),
      createdAt: json['created_at'] != null ? DateTime.parse(json['created_at'] as String) : null,
      updatedAt: json['updated_at'] != null ? DateTime.parse(json['updated_at'] as String) : null,
    );
  }
}

enum FindingType {
  ok,
  needsAttention,
  critical,
  deferred;

  static FindingType fromString(String? value) {
    switch (value?.toLowerCase()) {
      case 'ok':
        return FindingType.ok;
      case 'needs_attention':
      case 'needsattention':
        return FindingType.needsAttention;
      case 'critical':
        return FindingType.critical;
      case 'deferred':
        return FindingType.deferred;
      default:
        return FindingType.ok;
    }
  }

  String get label {
    switch (this) {
      case FindingType.ok:
        return 'OK';
      case FindingType.needsAttention:
        return 'Needs Attention';
      case FindingType.critical:
        return 'Critical';
      case FindingType.deferred:
        return 'Deferred';
    }
  }
}

enum FindingStatus {
  draft,
  submitted,
  reopened;

  static FindingStatus fromString(String? value) {
    switch (value?.toLowerCase()) {
      case 'draft':
        return FindingStatus.draft;
      case 'submitted':
        return FindingStatus.submitted;
      case 'reopened':
        return FindingStatus.reopened;
      default:
        return FindingStatus.draft;
    }
  }
}