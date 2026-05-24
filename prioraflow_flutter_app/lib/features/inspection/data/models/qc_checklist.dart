import 'package:prioraflow_tech/core/utils/parse_utils.dart';
import 'package:prioraflow_tech/features/inspection/data/models/inspection.dart';

/// Input types for QC checklist items, matching the backend enum.
enum QcChecklistItemType {
  passFail,
  yesNo,
  okFail,
  photo,
  text;

  static QcChecklistItemType fromString(String? value) {
    return switch (value?.toLowerCase().replaceAll('_', '')) {
      'passfail' => QcChecklistItemType.passFail,
      'yesno' => QcChecklistItemType.yesNo,
      'okfail' => QcChecklistItemType.okFail,
      'photo' => QcChecklistItemType.photo,
      'text' => QcChecklistItemType.text,
      _ => QcChecklistItemType.passFail,
    };
  }

  String get apiValue => switch (this) {
        QcChecklistItemType.passFail => 'pass_fail',
        QcChecklistItemType.yesNo => 'yes_no',
        QcChecklistItemType.okFail => 'ok_fail',
        QcChecklistItemType.photo => 'photo',
        QcChecklistItemType.text => 'text',
      };

  bool get isSelection =>
      this == passFail || this == yesNo || this == okFail;
  bool get isText => this == text;
  bool get isPhotoOnly => this == photo;
}

/// Template for a QC checklist. Created by workshop admin, same for all technicians.
class QcChecklistTemplate {
  const QcChecklistTemplate({
    required this.id,
    this.name,
    this.description,
    this.isDefault,
    this.isActive,
    this.sections = const [],
  });

  factory QcChecklistTemplate.fromJson(Map<String, dynamic> json) {
    return QcChecklistTemplate(
      id: json['id'] as String,
      name: json['name'] as String?,
      description: json['description'] as String?,
      isDefault: json['is_default'] as bool?,
      isActive: json['is_active'] as bool?,
      sections: (json['qc_checklist_sections'] as List<dynamic>?)
              ?.map((e) =>
                  QcChecklistSection.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  final String id;
  final String? name;
  final String? description;
  final bool? isDefault;
  final bool? isActive;
  final List<QcChecklistSection> sections;
}

/// A section within a QC checklist template.
class QcChecklistSection {
  const QcChecklistSection({
    required this.id,
    this.templateId,
    this.name,
    this.icon,
    this.sortOrder,
    this.isActive,
    this.items = const [],
  });

  factory QcChecklistSection.fromJson(Map<String, dynamic> json) {
    return QcChecklistSection(
      id: json['id'] as String,
      templateId: json['template_id'] as String?,
      name: json['name'] as String?,
      icon: json['icon'] as String?,
      sortOrder: parseInt(json['sort_order']),
      isActive: json['is_active'] as bool?,
      items: (json['qc_checklist_items'] as List<dynamic>?)
              ?.map((e) =>
                  QcChecklistItem.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  final String id;
  final String? templateId;
  final String? name;
  final String? icon;
  final int? sortOrder;
  final bool? isActive;
  final List<QcChecklistItem> items;
}

/// A single checkable item within a QC checklist section.
class QcChecklistItem {
  const QcChecklistItem({
    required this.id,
    this.sectionId,
    this.label,
    this.inputType = QcChecklistItemType.passFail,
    this.requiresPhoto,
    this.requiresNoteOnFail,
    this.helpText,
    this.sortOrder,
    this.isActive,
  });

  factory QcChecklistItem.fromJson(Map<String, dynamic> json) {
    return QcChecklistItem(
      id: json['id'] as String,
      sectionId: json['section_id'] as String?,
      label: json['label'] as String?,
      inputType:
          QcChecklistItemType.fromString(json['input_type'] as String?),
      requiresPhoto: json['requires_photo'] as bool?,
      requiresNoteOnFail: json['requires_note_on_fail'] as bool?,
      helpText: json['help_text'] as String?,
      sortOrder: parseInt(json['sort_order']),
      isActive: json['is_active'] as bool?,
    );
  }

  final String id;
  final String? sectionId;
  final String? label;
  final QcChecklistItemType inputType;
  final bool? requiresPhoto;
  final bool? requiresNoteOnFail;
  final String? helpText;
  final int? sortOrder;
  final bool? isActive;
}

/// A single response to a QC checklist item.
class QcChecklistResponse {
  const QcChecklistResponse({
    required this.id,
    this.itemId,
    this.value,
    this.notes,
    this.mediaCount,
    this.recordedAt,
    this.mediaFiles = const [],
  });

  factory QcChecklistResponse.fromJson(Map<String, dynamic> json) {
    return QcChecklistResponse(
      id: json['id'] as String,
      itemId: json['item_id'] as String?,
      value: json['value'] as String?,
      notes: json['notes'] as String?,
      mediaCount: parseInt(json['media_count']),
      recordedAt: json['recorded_at'] != null
          ? DateTime.parse(json['recorded_at'] as String)
          : null,
      mediaFiles: (json['media_files'] as List<dynamic>?)
              ?.map(
                  (e) => InspectionMedia.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  final String id;
  final String? itemId;
  final String? value;
  final String? notes;
  final int? mediaCount;
  final DateTime? recordedAt;
  final List<InspectionMedia> mediaFiles;

  Map<String, dynamic> toJson() => {
        'id': id,
        'item_id': itemId,
        'value': value,
        'notes': notes,
        'media_count': mediaCount,
        'recorded_at': recordedAt?.toIso8601String(),
      };
}

/// A completed QC checklist — one per job at quality_check stage.
class QcChecklist {
  const QcChecklist({
    required this.id,
    this.jobId,
    this.templateId,
    this.status,
    this.overallResult,
    this.startedAt,
    this.submittedAt,
    this.createdAt,
    this.responses = const [],
    this.template,
  });

  factory QcChecklist.fromJson(Map<String, dynamic> json) {
    return QcChecklist(
      id: json['id'] as String,
      jobId: json['job_id'] as String?,
      templateId: json['template_id'] as String?,
      status: json['status'] as String?,
      overallResult: json['overall_result'] as String?,
      startedAt: json['started_at'] != null
          ? DateTime.parse(json['started_at'] as String)
          : null,
      submittedAt: json['submitted_at'] != null
          ? DateTime.parse(json['submitted_at'] as String)
          : null,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : null,
      responses: (json['qc_checklist_responses'] as List<dynamic>?)
              ?.map((e) =>
                  QcChecklistResponse.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      template: json['qc_checklist_templates'] != null
          ? QcChecklistTemplate.fromJson(
              json['qc_checklist_templates'] as Map<String, dynamic>)
          : null,
    );
  }

  final String id;
  final String? jobId;
  final String? templateId;
  final String? status;
  final String? overallResult;
  final DateTime? startedAt;
  final DateTime? submittedAt;
  final DateTime? createdAt;
  final List<QcChecklistResponse> responses;
  final QcChecklistTemplate? template;

  bool get isLocked =>
      status == 'submitted' || status == 'approved';
  bool get isInProgress => status == 'in_progress';
  bool get isDraft => status == null || status == 'draft';

  Map<String, dynamic> toJson() => {
        'id': id,
        'job_id': jobId,
        'template_id': templateId,
        'status': status,
        'overall_result': overallResult,
        'started_at': startedAt?.toIso8601String(),
        'submitted_at': submittedAt?.toIso8601String(),
        'created_at': createdAt?.toIso8601String(),
        'qc_checklist_responses': responses.map((r) => r.toJson()).toList(),
      };
}