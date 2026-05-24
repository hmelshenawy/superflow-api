import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:prioraflow_tech/core/offline/draft_service.dart';
import 'package:prioraflow_tech/features/inspection/data/inspection_repository.dart';
import 'package:prioraflow_tech/features/inspection/data/models/inspection.dart';
import 'package:prioraflow_tech/features/inspection/data/models/inspection_template.dart';

// ── Template listing ────────────────────────────────────────────────────

final inspectionTemplatesProvider =
    AsyncNotifierProvider<InspectionTemplatesNotifier, List<InspectionTemplate>>(
  InspectionTemplatesNotifier.new,
);

class InspectionTemplatesNotifier extends AsyncNotifier<List<InspectionTemplate>> {
  @override
  Future<List<InspectionTemplate>> build() async {
    final repo = ref.watch(inspectionRepositoryProvider);
    return repo.fetchTemplates();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    try {
      final repo = ref.read(inspectionRepositoryProvider);
      state = AsyncData(await repo.fetchTemplates());
    } catch (e, st) {
      state = AsyncError(e, st);
    }
  }
}

// ── Inspection detail (fetch/save/submit) ───────────────────────────────

final inspectionDetailProvider = AsyncNotifierProvider.family<
    InspectionDetailNotifier, Inspection, String>(
  InspectionDetailNotifier.new,
);

class InspectionDetailNotifier extends FamilyAsyncNotifier<Inspection, String> {
  @override
  Future<Inspection> build(String arg) async {
    final repo = ref.watch(inspectionRepositoryProvider);
    return repo.fetchInspection(arg);
  }

  DraftService get _draftService => ref.read(draftServiceProvider);

  Future<void> refresh() async {
    state = const AsyncLoading();
    try {
      final repo = ref.read(inspectionRepositoryProvider);
      state = AsyncData(await repo.fetchInspection(arg));
    } catch (e, st) {
      state = AsyncError(e, st);
    }
  }

  /// Start a new inspection for a job (called before navigating to workspace).
  Future<Inspection> startInspection({
    required String jobId,
    required String templateId,
  }) async {
    final repo = ref.read(inspectionRepositoryProvider);
    final inspection = await repo.startInspection(
      jobId: jobId,
      templateId: templateId,
    );
    state = AsyncData(inspection);
    return inspection;
  }

  /// Save draft responses and optionally persist locally.
  Future<void> saveResponses({
    required List<Map<String, dynamic>> responses,
    String? offlineDraft,
  }) async {
    final repo = ref.read(inspectionRepositoryProvider);
    await repo.saveResponses(
      inspectionId: arg,
      responses: responses,
      offlineDraft: offlineDraft,
    );

    // Refresh state from server to get full inspection with IDs.
    state = AsyncData(await repo.fetchInspection(arg));

    // Also save locally for offline recovery.
    final localResponses = <String, dynamic>{};
    for (final r in responses) {
      final itemId = r['item_id'] as String?;
      if (itemId != null) localResponses[itemId] = r;
    }
    await _draftService.saveInspectionDraft(
      inspectionId: arg,
      responses: localResponses,
    );
  }

  /// Submit (lock) the inspection.
  Future<void> submit({String? advisorNote}) async {
    final repo = ref.read(inspectionRepositoryProvider);
    await repo.submitInspection(arg, advisorNote: advisorNote);
    await _draftService.deleteInspectionDraft(arg);
    state = AsyncData(await repo.fetchInspection(arg));
  }

  /// Save responses then submit in one pass — avoids double re-fetch.
  Future<void> saveAndSubmit({
    required List<Map<String, dynamic>> responses,
    String? advisorNote,
  }) async {
    final repo = ref.read(inspectionRepositoryProvider);
    // Save without re-fetch.
    await repo.saveResponses(inspectionId: arg, responses: responses);
    // Submit.
    await repo.submitInspection(arg, advisorNote: advisorNote);
    await _draftService.deleteInspectionDraft(arg);
    // Single re-fetch at the end.
    state = AsyncData(await repo.fetchInspection(arg));
  }

  /// Reopen a submitted inspection.
  Future<void> reopen() async {
    final repo = ref.read(inspectionRepositoryProvider);
    final updated = await repo.reopenInspection(arg);
    state = AsyncData(updated);
  }

  /// Load offline draft if available.
  Map<String, dynamic>? loadDraft() {
    return _draftService.loadInspectionDraft(arg);
  }
}

// ── Inspection form state (per-item response tracking) ──────────────────

/// Tracks per-item responses in memory while filling out an inspection.
class InspectionFormState {
  const InspectionFormState({
    this.responses = const {},
    this.changed = false,
  });

  /// itemId → {value, urgency, techNotes, ...}
  final Map<String, Map<String, dynamic>> responses;
  final bool changed;

  InspectionFormState copyWith({
    Map<String, Map<String, dynamic>>? responses,
    bool? changed,
  }) {
    return InspectionFormState(
      responses: responses ?? this.responses,
      changed: changed ?? this.changed,
    );
  }

  /// Convert form state to a list of response maps for the API.
  /// Strips local-only fields that are not sent to the server.
  List<Map<String, dynamic>> toResponseList() {
    return responses.values.map((r) {
      final cleaned = Map<String, dynamic>.from(r)
        ..remove('photo_paths')
        ..remove('uploaded_indexes')
        ..remove('photo_path')
        ..remove('photo_uploaded');
      return cleaned;
    }).toList();
  }
}

final inspectionFormProvider =
    StateNotifierProvider<InspectionFormNotifier, InspectionFormState>(
  (ref) => InspectionFormNotifier(),
);

class InspectionFormNotifier extends StateNotifier<InspectionFormState> {
  InspectionFormNotifier() : super(const InspectionFormState());

  /// Set a response value for an item.
  void setResponse(String itemId, Map<String, dynamic> data) {
    final newResponses = Map<String, Map<String, dynamic>>.from(state.responses);
    newResponses[itemId] = data;
    state = state.copyWith(responses: newResponses, changed: true);
  }

  /// Remove a response for an item.
  void removeResponse(String itemId) {
    final newResponses = Map<String, Map<String, dynamic>>.from(state.responses);
    newResponses.remove(itemId);
    state = state.copyWith(responses: newResponses, changed: true);
  }

  /// Load initial responses from an inspection (e.g., after fetching).
  void loadFromInspection(Inspection inspection) {
    final responses = <String, Map<String, dynamic>>{};
    for (final r in inspection.responses) {
      responses[r.itemId ?? r.id] = {
        'id': r.id,
        'item_id': r.itemId,
        'value': r.value,
        'urgency': r.urgency?.apiValue,
        'tech_notes': r.techNotes,
      };
    }
    state = InspectionFormState(responses: responses, changed: false);
  }

  /// Load responses from a local draft (offline recovery).
  void loadFromDraft(Map<String, dynamic> draft) {
    final responsesData = draft['responses'] as Map<String, dynamic>?;
    if (responsesData == null) return;
    final responses = <String, Map<String, dynamic>>{};
    for (final entry in responsesData.entries) {
      responses[entry.key] = Map<String, dynamic>.from(entry.value as Map);
    }
    state = InspectionFormState(responses: responses, changed: false);
  }

  /// Reset form state.
  void reset() {
    state = const InspectionFormState();
  }
}