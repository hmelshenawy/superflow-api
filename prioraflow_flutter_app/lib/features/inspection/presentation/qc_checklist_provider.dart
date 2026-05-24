import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:prioraflow_tech/core/offline/draft_service.dart';
import 'package:prioraflow_tech/features/inspection/data/inspection_repository.dart';
import 'package:prioraflow_tech/features/inspection/data/models/qc_checklist.dart';

// ── QC Template listing ─────────────────────────────────────────────────

final qcTemplatesProvider =
    AsyncNotifierProvider<QcTemplatesNotifier, List<QcChecklistTemplate>>(
  QcTemplatesNotifier.new,
);

class QcTemplatesNotifier extends AsyncNotifier<List<QcChecklistTemplate>> {
  @override
  Future<List<QcChecklistTemplate>> build() async {
    final repo = ref.watch(inspectionRepositoryProvider);
    return repo.fetchQcTemplates();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    try {
      final repo = ref.read(inspectionRepositoryProvider);
      state = AsyncData(await repo.fetchQcTemplates());
    } catch (e, st) {
      state = AsyncError(e, st);
    }
  }
}

// ── QC Checklist detail (fetch/save/submit) ─────────────────────────────

final qcChecklistDetailProvider =
    AsyncNotifierProvider.family<QcChecklistDetailNotifier, QcChecklist, String>(
  QcChecklistDetailNotifier.new,
);

class QcChecklistDetailNotifier extends FamilyAsyncNotifier<QcChecklist, String> {
  @override
  Future<QcChecklist> build(String arg) async {
    final repo = ref.watch(inspectionRepositoryProvider);
    return repo.fetchQcChecklist(arg);
  }

  DraftService get _draftService => ref.read(draftServiceProvider);

  Future<void> refresh() async {
    state = const AsyncLoading();
    try {
      final repo = ref.read(inspectionRepositoryProvider);
      state = AsyncData(await repo.fetchQcChecklist(arg));
    } catch (e, st) {
      state = AsyncError(e, st);
    }
  }

  /// Start a new QC checklist for a job.
  Future<QcChecklist> startChecklist({
    required String jobId,
    required String templateId,
  }) async {
    final repo = ref.read(inspectionRepositoryProvider);
    final checklist = await repo.startQcChecklist(
      jobId: jobId,
      templateId: templateId,
    );
    state = AsyncData(checklist);
    return checklist;
  }

  /// Save draft responses.
  Future<void> saveResponses({
    required List<Map<String, dynamic>> responses,
  }) async {
    final repo = ref.read(inspectionRepositoryProvider);
    await repo.saveQcResponses(
      checklistId: arg,
      responses: responses,
    );

    // Refresh state from server to get full checklist with IDs.
    state = AsyncData(await repo.fetchQcChecklist(arg));

    final localResponses = <String, dynamic>{};
    for (final r in responses) {
      final itemId = r['item_id'] as String?;
      if (itemId != null) localResponses[itemId] = r;
    }
    await _draftService.saveQcDraft(
      checklistId: arg,
      responses: localResponses,
    );
  }

  /// Submit (lock) the QC checklist.
  Future<void> submit({String? notes}) async {
    final repo = ref.read(inspectionRepositoryProvider);
    await repo.submitQcChecklist(arg, notes: notes);
    await _draftService.deleteQcDraft(arg);
    state = AsyncData(await repo.fetchQcChecklist(arg));
  }

  /// Save responses then submit in one pass — avoids double re-fetch.
  Future<void> saveAndSubmit({
    required List<Map<String, dynamic>> responses,
    String? notes,
  }) async {
    final repo = ref.read(inspectionRepositoryProvider);
    await repo.saveQcResponses(checklistId: arg, responses: responses);
    await repo.submitQcChecklist(arg, notes: notes);
    await _draftService.deleteQcDraft(arg);
    state = AsyncData(await repo.fetchQcChecklist(arg));
  }

  /// Reopen a submitted QC checklist.
  Future<void> reopen() async {
    final repo = ref.read(inspectionRepositoryProvider);
    final updated = await repo.reopenQcChecklist(arg);
    state = AsyncData(updated);
  }

  /// Load offline draft if available.
  Map<String, dynamic>? loadDraft() {
    return _draftService.loadQcDraft(arg);
  }
}

// ── QC form state (per-item response tracking) ──────────────────────────

class QcFormState {
  const QcFormState({
    this.responses = const {},
    this.changed = false,
  });

  final Map<String, Map<String, dynamic>> responses;
  final bool changed;

  QcFormState copyWith({
    Map<String, Map<String, dynamic>>? responses,
    bool? changed,
  }) {
    return QcFormState(
      responses: responses ?? this.responses,
      changed: changed ?? this.changed,
    );
  }

  /// Convert form state to a list of response maps for the API.
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

final qcFormProvider =
    StateNotifierProvider<QcFormNotifier, QcFormState>(
  (ref) => QcFormNotifier(),
);

class QcFormNotifier extends StateNotifier<QcFormState> {
  QcFormNotifier() : super(const QcFormState());

  void setResponse(String itemId, Map<String, dynamic> data) {
    final newResponses = Map<String, Map<String, dynamic>>.from(state.responses);
    newResponses[itemId] = data;
    state = state.copyWith(responses: newResponses, changed: true);
  }

  void removeResponse(String itemId) {
    final newResponses = Map<String, Map<String, dynamic>>.from(state.responses);
    newResponses.remove(itemId);
    state = state.copyWith(responses: newResponses, changed: true);
  }

  void loadFromChecklist(QcChecklist checklist) {
    final responses = <String, Map<String, dynamic>>{};
    for (final r in checklist.responses) {
      responses[r.itemId ?? r.id] = {
        'id': r.id,
        'item_id': r.itemId,
        'value': r.value,
        'notes': r.notes,
      };
    }
    state = QcFormState(responses: responses, changed: false);
  }

  void loadFromDraft(Map<String, dynamic> draft) {
    final responsesData = draft['responses'] as Map<String, dynamic>?;
    if (responsesData == null) return;
    final responses = <String, Map<String, dynamic>>{};
    for (final entry in responsesData.entries) {
      responses[entry.key] = Map<String, dynamic>.from(entry.value as Map);
    }
    state = QcFormState(responses: responses, changed: false);
  }

  void reset() {
    state = const QcFormState();
  }
}