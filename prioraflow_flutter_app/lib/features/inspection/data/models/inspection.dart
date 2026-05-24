class InspectionResponse {
  const InspectionResponse({
    required this.id,
    this.itemId,
    this.value,
    this.urgency,
    this.techNotes,
    this.mediaCount,
    this.recordedAt,
  });

  factory InspectionResponse.fromJson(Map<String, dynamic> json) {
    return InspectionResponse(
      id: json['id'] as String,
      itemId: json['item_id'] as String?,
      value: json['value'] as String?,
      urgency: json['urgency'] as String?,
      techNotes: json['tech_notes'] as String?,
      mediaCount: json['media_count'] as int?,
      recordedAt: json['recorded_at'] != null
          ? DateTime.parse(json['recorded_at'] as String)
          : null,
    );
  }

  final String id;
  final String? itemId;
  final String? value;
  final String? urgency;
  final String? techNotes;
  final int? mediaCount;
  final DateTime? recordedAt;
}

class Inspection {
  const Inspection({
    required this.id,
    this.status,
    this.responses = const [],
  });

  factory Inspection.fromJson(Map<String, dynamic> json) {
    final List<dynamic>? raw = json['responses'] as List<dynamic>?;
    return Inspection(
      id: json['id'] as String,
      status: json['status'] as String?,
      responses: raw
              ?.map((e) => InspectionResponse.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  final String id;
  final String? status;
  final List<InspectionResponse> responses;

  bool get isSubmitted => status == 'submitted';
  bool get isInProgress => status == 'in_progress';
}