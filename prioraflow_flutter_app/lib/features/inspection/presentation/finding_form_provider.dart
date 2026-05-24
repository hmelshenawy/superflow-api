import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:prioraflow_tech/core/offline/draft_service.dart';
import 'package:prioraflow_tech/features/inspection/data/inspection_repository.dart';
import 'package:prioraflow_tech/features/inspection/data/models/concern.dart';
import 'package:prioraflow_tech/features/inspection/data/models/finding.dart';

class FindingFormState {
  const FindingFormState({
    this.isLoading = false,
    this.error,
    this.savedConcern,
    this.photosUploaded = 0,
    this.photosTotal = 0,
    this.isUploadingPhotos = false,
    this.hasDraft = false,
  });

  final bool isLoading;
  final String? error;
  final Concern? savedConcern;
  final int photosUploaded;
  final int photosTotal;
  final bool isUploadingPhotos;
  final bool hasDraft;

  FindingFormState copyWith({
    bool? isLoading,
    String? error,
    Concern? savedConcern,
    int? photosUploaded,
    int? photosTotal,
    bool? isUploadingPhotos,
    bool? hasDraft,
  }) {
    return FindingFormState(
      isLoading: isLoading ?? this.isLoading,
      error: error,
      savedConcern: savedConcern ?? this.savedConcern,
      photosUploaded: photosUploaded ?? this.photosUploaded,
      photosTotal: photosTotal ?? this.photosTotal,
      isUploadingPhotos: isUploadingPhotos ?? this.isUploadingPhotos,
      hasDraft: hasDraft ?? this.hasDraft,
    );
  }
}

final findingFormProvider =
    StateNotifierProvider<FindingFormNotifier, FindingFormState>((ref) {
  return FindingFormNotifier(ref.watch(inspectionRepositoryProvider), ref.watch(draftServiceProvider));
});

class FindingFormNotifier extends StateNotifier<FindingFormState> {
  FindingFormNotifier(this._repo, this._draftService) : super(const FindingFormState());

  final InspectionRepository _repo;
  final DraftService _draftService;

  /// Load a saved draft for a concern and mark state accordingly.
  Map<String, dynamic>? loadDraft(String concernId) {
    final draft = _draftService.loadFindingDraft(concernId);
    if (draft != null) {
      state = state.copyWith(hasDraft: true);
    }
    return draft;
  }

  /// Save form data as a local draft.
  Future<void> saveDraft({
    required String concernId,
    required String findingType,
    String? description,
    int? estimatedMinutes,
    String? partName,
    int? partQuantity,
    String? partNotes,
  }) async {
    await _draftService.saveFindingDraft(
      concernId: concernId,
      findingType: findingType,
      description: description,
      estimatedMinutes: estimatedMinutes,
      partName: partName,
      partQuantity: partQuantity,
      partNotes: partNotes,
    );
    state = state.copyWith(hasDraft: true);
  }

  Future<bool> submit({
    required String jobId,
    required String concernId,
    required FindingType type,
    String? description,
    int? estimatedMinutes,
    List<File>? photos,
    String? partName,
    int? partQuantity,
    String? partNotes,
  }) async {
    state = const FindingFormState(isLoading: true);

    try {
      // Build the technician_finding text
      var findingText = description ?? '';
      if (partName != null && partName.isNotEmpty) {
        final partsInfo =
            '\n\n[Parts Request] $partName x${partQuantity ?? 1}${partNotes != null && partNotes.isNotEmpty ? ' — $partNotes' : ''}';
        findingText += partsInfo;
      }

      // Build work_note from estimated minutes
      String? workNote;
      if (estimatedMinutes != null) {
        workNote = 'Est. ${estimatedMinutes}min';
      }

      // Update the concern via PATCH /jobs/:jobId/concerns/:concernId
      final concern = await _repo.updateConcern(
        jobId: jobId,
        concernId: concernId,
        status: type.statusName,
        technicianFinding: findingText.isEmpty ? null : findingText,
        workNote: workNote,
      );

      // Upload photos sequentially
      if (photos != null && photos.isNotEmpty) {
        state = state.copyWith(
          isUploadingPhotos: true,
          photosTotal: photos.length,
          photosUploaded: 0,
        );
        for (var i = 0; i < photos.length; i++) {
          try {
            await _repo.uploadConcernPhoto(
              jobId: jobId,
              concernId: concernId,
              file: photos[i],
            );
            state = state.copyWith(photosUploaded: i + 1);
          } catch (_) {
            // Continue uploading remaining photos even if one fails
          }
        }
        state = state.copyWith(isUploadingPhotos: false);
      }

      // Clear the draft on successful submit
      await _draftService.deleteFindingDraft(concernId);

      state = FindingFormState(savedConcern: concern);
      return true;
    } catch (e) {
      // Save as draft so the user doesn't lose their work
      await _draftService.saveFindingDraft(
        concernId: concernId,
        findingType: type.name,
        description: description,
        estimatedMinutes: estimatedMinutes,
        partName: partName,
        partQuantity: partQuantity,
        partNotes: partNotes,
      );
      state = FindingFormState(error: e.toString());
      return false;
    }
  }
}