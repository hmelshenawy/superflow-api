import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:prioraflow_tech/features/inspection/data/inspection_repository.dart';

/// Tracks the state of a background photo upload queue.
class PhotoUploadState {
  const PhotoUploadState({
    this.pending = 0,
    this.completed = 0,
    this.failed = 0,
    this.uploading = false,
  });

  final int pending;
  final int completed;
  final int failed;
  final bool uploading;

  bool get hasPending => pending > 0 || uploading;
  int get total => pending + completed + failed;

  PhotoUploadState copyWith({
    int? pending,
    int? completed,
    int? failed,
    bool? uploading,
  }) {
    return PhotoUploadState(
      pending: pending ?? this.pending,
      completed: completed ?? this.completed,
      failed: failed ?? this.failed,
      uploading: uploading ?? this.uploading,
    );
  }
}

/// Queues photo uploads to run in the background (fire-and-forget).
/// Used so inspection submit doesn't wait for photos to finish uploading.
class PhotoUploadQueue extends StateNotifier<PhotoUploadState> {
  PhotoUploadQueue(this._repo) : super(const PhotoUploadState());

  final InspectionRepository _repo;

  /// Enqueue inspection photos for background upload. Returns immediately.
  void enqueueInspectionPhotos({
    required String jobId,
    required String inspectionId,
    required List<({String itemId, String path})> photos,
  }) {
    _enqueue(photos.map((p) => (
      itemId: p.itemId,
      path: p.path,
      upload: () => _repo.uploadInspectionPhoto(
        jobId: jobId,
        inspectionId: inspectionId,
        itemId: p.itemId,
        file: File(p.path),
      ),
    )).toList());
  }

  /// Enqueue QC checklist photos for background upload. Returns immediately.
  void enqueueQcPhotos({
    required String jobId,
    required String checklistId,
    required List<({String itemId, String path})> photos,
  }) {
    _enqueue(photos.map((p) => (
      itemId: p.itemId,
      path: p.path,
      upload: () => _repo.uploadQcPhoto(
        jobId: jobId,
        checklistId: checklistId,
        itemId: p.itemId,
        file: File(p.path),
      ),
    )).toList());
  }

  void _enqueue(
    List<({String itemId, String path, Future<Map<String, dynamic>> Function() upload})> items,
  ) {
    state = state.copyWith(
      pending: state.pending + items.length,
      uploading: true,
    );

    // Fire all uploads concurrently. State updates as each completes.
    final futures = items.map((item) {
      return item.upload().then((_) {
        if (!mounted) return;
        state = state.copyWith(
          completed: state.completed + 1,
          pending: state.pending - 1,
        );
        _checkDone();
      }).catchError((e) {
        debugPrint('Background photo upload failed [${item.itemId} ${item.path}]: $e');
        if (!mounted) return;
        state = state.copyWith(
          failed: state.failed + 1,
          pending: state.pending - 1,
        );
        _checkDone();
      });
    });

    Future.wait(futures);
  }

  void _checkDone() {
    if (state.pending <= 0) {
      state = state.copyWith(uploading: false);
    }
  }
}

final photoUploadQueueProvider =
    StateNotifierProvider<PhotoUploadQueue, PhotoUploadState>(
  (ref) => PhotoUploadQueue(ref.read(inspectionRepositoryProvider)),
);