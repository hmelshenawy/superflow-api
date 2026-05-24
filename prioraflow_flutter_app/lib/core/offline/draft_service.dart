import 'package:hive_flutter/hive_flutter.dart';

class DraftService {
  DraftService._();
  static const _boxName = 'drafts';

  static Box<dynamic>? _box;

  static Future<void> init() async {
    await Hive.initFlutter();
    _box = await Hive.openBox(_boxName);
  }

  static Box<dynamic> get _drafts => _box ?? Hive.box(_boxName);

  /// Save a finding draft for a specific concern.
  static Future<void> saveFindingDraft({
    required String concernId,
    required String findingType,
    String? description,
    int? estimatedMinutes,
    String? partName,
    int? partQuantity,
    String? partNotes,
  }) async {
    await _drafts.put('finding_$concernId', {
      'findingType': findingType,
      'description': description,
      'estimatedMinutes': estimatedMinutes,
      'partName': partName,
      'partQuantity': partQuantity,
      'partNotes': partNotes,
      'savedAt': DateTime.now().toIso8601String(),
    });
  }

  /// Load a finding draft for a specific concern.
  static Map<String, dynamic>? loadFindingDraft(String concernId) {
    final data = _drafts.get('finding_$concernId');
    if (data == null) return null;
    return Map<String, dynamic>.from(data as Map);
  }

  /// Delete a finding draft after successful submission.
  static Future<void> deleteFindingDraft(String concernId) async {
    await _drafts.delete('finding_$concernId');
  }

  /// Get all draft concern IDs.
  static List<String> getDraftConcernIds() {
    return _drafts.keys
        .where((key) => (key as String).startsWith('finding_'))
        .map((key) => (key as String).replaceFirst('finding_', ''))
        .toList();
  }

  /// Clear all drafts (e.g., on logout).
  static Future<void> clearAll() async {
    final keys = _drafts.keys
        .where((key) => (key as String).startsWith('finding_'))
        .toList();
    for (final key in keys) {
      await _drafts.delete(key);
    }
  }
}