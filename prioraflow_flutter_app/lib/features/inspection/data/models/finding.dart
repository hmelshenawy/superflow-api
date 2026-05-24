/// Finding type represents the technician's assessment of a concern.
/// These map to the concern's `status` field in the backend.
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
      // Map backend concern statuses that represent "inspected but not yet categorized"
      case 'reviewing':
      case 'inspected':
      default:
        return FindingType.ok;
    }
  }

  /// Converts to the backend concern status string.
  String get statusName {
    switch (this) {
      case FindingType.ok:
        return 'ok';
      case FindingType.needsAttention:
        return 'needs_attention';
      case FindingType.critical:
        return 'critical';
      case FindingType.deferred:
        return 'deferred';
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

/// Parses a concern's status string into a FindingType.
/// Returns null if the concern hasn't been inspected yet (status = 'reviewing').
FindingType? findingTypeFromConcernStatus(String? status) {
  if (status == null || status == 'reviewing') return null;
  return FindingType.fromString(status);
}