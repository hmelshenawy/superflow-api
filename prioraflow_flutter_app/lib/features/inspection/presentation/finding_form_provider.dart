import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:prioraflow_tech/features/inspection/data/inspection_repository.dart';
import 'package:prioraflow_tech/features/inspection/data/models/finding.dart';

class FindingFormState {
  const FindingFormState({
    this.isLoading = false,
    this.error,
    this.savedFinding,
    this.photosUploaded = 0,
    this.photosTotal = 0,
    this.isUploadingPhotos = false,
  });

  final bool isLoading;
  final String? error;
  final Finding? savedFinding;
  final int photosUploaded;
  final int photosTotal;
  final bool isUploadingPhotos;

  FindingFormState copyWith({
    bool? isLoading,
    String? error,
    Finding? savedFinding,
    int? photosUploaded,
    int? photosTotal,
    bool? isUploadingPhotos,
  }) {
    return FindingFormState(
      isLoading: isLoading ?? this.isLoading,
      error: error,
      savedFinding: savedFinding ?? this.savedFinding,
      photosUploaded: photosUploaded ?? this.photosUploaded,
      photosTotal: photosTotal ?? this.photosTotal,
      isUploadingPhotos: isUploadingPhotos ?? this.isUploadingPhotos,
    );
  }
}

final findingFormProvider =
    StateNotifierProvider<FindingFormNotifier, FindingFormState>((ref) {
  return FindingFormNotifier(ref.watch(inspectionRepositoryProvider));
});

class FindingFormNotifier extends StateNotifier<FindingFormState> {
  FindingFormNotifier(this._repo) : super(const FindingFormState());

  final InspectionRepository _repo;

  Future<bool> submit({
    required String concernId,
    required String jobId,
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
      // Append parts request info to description if provided
      var fullDescription = description ?? '';
      if (partName != null && partName.isNotEmpty) {
        final partsInfo =
            '\n\n[Parts Request] $partName x${partQuantity ?? 1}${partNotes != null && partNotes.isNotEmpty ? ' — $partNotes' : ''}';
        fullDescription += partsInfo;
      }

      final finding = await _repo.createFinding(
        concernId: concernId,
        type: type,
        description: fullDescription.isEmpty ? null : fullDescription,
        estimatedMinutes: estimatedMinutes,
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

      state = FindingFormState(savedFinding: finding);
      return true;
    } catch (e) {
      state = FindingFormState(error: e.toString());
      return false;
    }
  }
}