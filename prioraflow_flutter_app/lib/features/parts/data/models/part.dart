import 'package:prioraflow_tech/core/utils/parse_utils.dart';

enum PartStatus {
  requested,
  sourcing,
  orderParts,
  arrived,
  partsReady,
  cancelled;

  static PartStatus fromString(String? value) {
    return switch (value?.toLowerCase().replaceAll('_', '')) {
      'requested' => PartStatus.requested,
      'sourcing' => PartStatus.sourcing,
      'orderparts' => PartStatus.orderParts,
      'arrived' => PartStatus.arrived,
      'partsready' => PartStatus.partsReady,
      'cancelled' => PartStatus.cancelled,
      _ => PartStatus.requested,
    };
  }

  String get label => switch (this) {
        PartStatus.requested => 'Requested',
        PartStatus.sourcing => 'Sourcing',
        PartStatus.orderParts => 'Order Parts',
        PartStatus.arrived => 'Arrived',
        PartStatus.partsReady => 'Arrived',
        PartStatus.cancelled => 'Cancelled',
      };

  bool get isArrived => this == PartStatus.arrived || this == PartStatus.partsReady;
}

class JobPart {
  const JobPart({
    required this.id,
    this.part,
    this.name,
    this.quantity,
    this.status = PartStatus.requested,
    this.notes,
  });

  factory JobPart.fromJson(Map<String, dynamic> json) {
    return JobPart(
      id: json['id'] as String,
      part: json['part'] != null
          ? PartInfo.fromJson(json['part'] as Map<String, dynamic>)
          : null,
      name: json['name'] as String?,
      quantity: parseInt(json['quantity']),
      status: PartStatus.fromString(json['status'] as String?),
      notes: json['notes'] as String?,
    );
  }

  final String id;
  final PartInfo? part;
  final String? name;
  final int? quantity;
  final PartStatus status;
  final String? notes;

  String get displayName => part?.name ?? name ?? 'Unknown Part';

  Map<String, dynamic> toJson() => {
        'id': id,
        'part': part?.toJson(),
        'name': name,
        'quantity': quantity,
        'status': status.name,
        'notes': notes,
      };
}

class PartInfo {
  const PartInfo({required this.id, this.name, this.sku, this.description});

  factory PartInfo.fromJson(Map<String, dynamic> json) {
    return PartInfo(
      id: json['id'] as String,
      name: json['name'] as String?,
      sku: json['sku'] as String?,
      description: json['description'] as String?,
    );
  }

  final String id;
  final String? name;
  final String? sku;
  final String? description;

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'sku': sku,
        'description': description,
      };
}