import 'package:prioraflow_tech/core/utils/parse_utils.dart';
import 'package:prioraflow_tech/features/inspection/data/models/inspection.dart';

/// Template for a Digital Vehicle Inspection (DVI).
/// Created by workshop admin, fetched dynamically by the mobile app.
class InspectionTemplate {
  const InspectionTemplate({
    required this.id,
    this.name,
    this.vehicleType,
    this.description,
    this.isDefault,
    this.isActive,
    this.sections = const [],
  });

  factory InspectionTemplate.fromJson(Map<String, dynamic> json) {
    return InspectionTemplate(
      id: json['id'] as String,
      name: json['name'] as String?,
      vehicleType: json['vehicle_type'] as String?,
      description: json['description'] as String?,
      isDefault: json['is_default'] as bool?,
      isActive: json['is_active'] as bool?,
      sections: (json['inspection_sections'] as List<dynamic>?)
              ?.map((e) =>
                  InspectionSection.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  final String id;
  final String? name;
  final String? vehicleType;
  final String? description;
  final bool? isDefault;
  final bool? isActive;
  final List<InspectionSection> sections;
}

/// A section within an inspection template (e.g., "Engine", "Brakes").
class InspectionSection {
  const InspectionSection({
    required this.id,
    this.templateId,
    this.name,
    this.icon,
    this.sortOrder,
    this.isActive,
    this.items = const [],
  });

  factory InspectionSection.fromJson(Map<String, dynamic> json) {
    return InspectionSection(
      id: json['id'] as String,
      templateId: json['template_id'] as String?,
      name: json['name'] as String?,
      icon: json['icon'] as String?,
      sortOrder: parseInt(json['sort_order']),
      isActive: json['is_active'] as bool?,
      items: (json['inspection_items'] as List<dynamic>?)
              ?.map(
                  (e) => InspectionItem.fromJson(e as Map<String, dynamic>))
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
  final List<InspectionItem> items;
}

/// A single checkable item within an inspection section.
class InspectionItem {
  const InspectionItem({
    required this.id,
    this.sectionId,
    this.label,
    this.inputType = InspectionItemType.passFail,
    this.options,
    this.unit,
    this.requiresPhoto,
    this.requiresNoteOn,
    this.helpText,
    this.sortOrder,
    this.isActive,
  });

  factory InspectionItem.fromJson(Map<String, dynamic> json) {
    return InspectionItem(
      id: json['id'] as String,
      sectionId: json['section_id'] as String?,
      label: json['label'] as String?,
      inputType: InspectionItemType.fromString(json['input_type'] as String?),
      options: json['options'] as String?,
      unit: json['unit'] as String?,
      requiresPhoto: json['requires_photo'] as bool?,
      requiresNoteOn: json['requires_note_on'] as String?,
      helpText: json['help_text'] as String?,
      sortOrder: parseInt(json['sort_order']),
      isActive: json['is_active'] as bool?,
    );
  }

  final String id;
  final String? sectionId;
  final String? label;
  final InspectionItemType inputType;
  final String? options; // JSON string for custom option sets
  final String? unit;
  final bool? requiresPhoto;
  final String? requiresNoteOn; // e.g., "fail" — require notes when value is this
  final String? helpText;
  final int? sortOrder;
  final bool? isActive;
}

/// Input types for inspection items, matching the backend enum.
enum InspectionItemType {
  passFail,
  yesNo,
  okWarnFail,
  number,
  text,
  toggle,
  photo,
  odometer,
  fuelLevel;

  static InspectionItemType fromString(String? value) {
    return switch (value?.toLowerCase().replaceAll('_', '')) {
      'passfail' => InspectionItemType.passFail,
      'yesno' => InspectionItemType.yesNo,
      'okwarnfail' => InspectionItemType.okWarnFail,
      'number' => InspectionItemType.number,
      'text' => InspectionItemType.text,
      'toggle' => InspectionItemType.toggle,
      'photo' => InspectionItemType.photo,
      'odometer' => InspectionItemType.odometer,
      'fuellevel' => InspectionItemType.fuelLevel,
      _ => InspectionItemType.passFail,
    };
  }

  String get apiValue => switch (this) {
        InspectionItemType.passFail => 'pass_fail',
        InspectionItemType.yesNo => 'yes_no',
        InspectionItemType.okWarnFail => 'ok_warn_fail',
        InspectionItemType.number => 'number',
        InspectionItemType.text => 'text',
        InspectionItemType.toggle => 'toggle',
        InspectionItemType.photo => 'photo',
        InspectionItemType.odometer => 'odometer',
        InspectionItemType.fuelLevel => 'fuel_level',
      };

  /// Whether this item type requires a value selection (vs free-form input).
  bool get isSelection =>
      this == passFail ||
      this == yesNo ||
      this == okWarnFail ||
      this == toggle ||
      this == fuelLevel;

  /// Whether this item type is a free-form text/number input.
  bool get isText =>
      this == number || this == text || this == odometer;

  /// Whether this item type is photo-only (no value to enter).
  bool get isPhotoOnly => this == photo;
}