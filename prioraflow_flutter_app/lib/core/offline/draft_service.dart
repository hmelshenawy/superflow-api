import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

class DraftService {
  DraftService(this._box);

  final Box<dynamic> _box;

  /// Initialize Hive and open the drafts box. Call once in main().
  static Future<Box<dynamic>> init() async {
    await Hive.initFlutter();
    return Hive.openBox(_boxName);
  }

  static const _boxName = 'drafts';

  // ── Finding Drafts ─────────────────────────────────────────────────────

  /// Save a finding draft for a specific concern.
  Future<void> saveFindingDraft({
    required String concernId,
    required String findingType,
    String? description,
    int? estimatedMinutes,
    String? partName,
    int? partQuantity,
    String? partNotes,
  }) async {
    await _box.put('finding_$concernId', {
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
  Map<String, dynamic>? loadFindingDraft(String concernId) {
    final data = _box.get('finding_$concernId');
    if (data == null) return null;
    return Map<String, dynamic>.from(data as Map);
  }

  /// Delete a finding draft after successful submission.
  Future<void> deleteFindingDraft(String concernId) async {
    await _box.delete('finding_$concernId');
  }

  /// Get all draft concern IDs.
  List<String> getDraftConcernIds() {
    return _box.keys
        .where((key) => (key as String).startsWith('finding_'))
        .map((key) => (key as String).replaceFirst('finding_', ''))
        .toList();
  }

  /// Clear all drafts (e.g., on logout).
  Future<void> clearAll() async {
    final keys = _box.keys
        .where((key) =>
            (key as String).startsWith('finding_') ||
            (key as String).startsWith('inspection_') ||
            (key as String).startsWith('qc_'))
        .toList();
    for (final key in keys) {
      await _box.delete(key);
    }
  }

  // ── Inspection Drafts ─────────────────────────────────────────────────

  /// Save an inspection draft (per-item responses as a map of itemId → response data).
  Future<void> saveInspectionDraft({
    required String inspectionId,
    required Map<String, dynamic> responses,
  }) async {
    await _box.put('inspection_$inspectionId', {
      'responses': responses,
      'savedAt': DateTime.now().toIso8601String(),
    });
  }

  /// Load an inspection draft.
  Map<String, dynamic>? loadInspectionDraft(String inspectionId) {
    final data = _box.get('inspection_$inspectionId');
    if (data == null) return null;
    return Map<String, dynamic>.from(data as Map);
  }

  /// Delete an inspection draft after successful submission.
  Future<void> deleteInspectionDraft(String inspectionId) async {
    await _box.delete('inspection_$inspectionId');
  }

  // ── QC Checklist Drafts ───────────────────────────────────────────────

  /// Save a QC checklist draft (per-item responses as a map of itemId → response data).
  Future<void> saveQcDraft({
    required String checklistId,
    required Map<String, dynamic> responses,
  }) async {
    await _box.put('qc_$checklistId', {
      'responses': responses,
      'savedAt': DateTime.now().toIso8601String(),
    });
  }

  /// Load a QC checklist draft.
  Map<String, dynamic>? loadQcDraft(String checklistId) {
    final data = _box.get('qc_$checklistId');
    if (data == null) return null;
    return Map<String, dynamic>.from(data as Map);
  }

  /// Delete a QC checklist draft after successful submission.
  Future<void> deleteQcDraft(String checklistId) async {
    await _box.delete('qc_$checklistId');
  }
}

/// Riverpod provider for DraftService — overridden in main() after Hive init.
final draftServiceProvider = Provider<DraftService>((ref) {
  throw StateError('DraftService not initialized. Override draftServiceProvider in main().');
});