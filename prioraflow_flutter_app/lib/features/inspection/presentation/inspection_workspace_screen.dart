import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:prioraflow_tech/core/api/api_constants.dart';
import 'package:prioraflow_tech/core/errors/error_handler.dart';
import 'package:prioraflow_tech/core/theme/app_colors.dart';
import 'package:prioraflow_tech/core/theme/snackbar.dart';
import 'package:prioraflow_tech/core/upload/photo_upload_queue.dart';
import 'package:prioraflow_tech/core/utils/haptic.dart';
import 'package:prioraflow_tech/features/inspection/data/models/inspection.dart';
import 'package:prioraflow_tech/features/inspection/data/models/inspection_template.dart';
import 'package:prioraflow_tech/features/inspection/presentation/inspection_provider.dart';
import 'package:prioraflow_tech/features/inspection/presentation/widgets/inspection_section_card.dart';
import 'package:prioraflow_tech/features/inspection/presentation/widgets/inspection_summary_bar.dart';

/// The core workspace screen for filling out a DVI inspection.
class InspectionWorkspaceScreen extends ConsumerStatefulWidget {
  const InspectionWorkspaceScreen({
    super.key,
    required this.inspectionId,
  });

  final String inspectionId;

  @override
  ConsumerState<InspectionWorkspaceScreen> createState() =>
      _InspectionWorkspaceScreenState();
}

class _InspectionWorkspaceScreenState
    extends ConsumerState<InspectionWorkspaceScreen> {
  bool _saving = false;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadExistingResponses();
    });
  }

  void _loadExistingResponses() {
    final detailState = ref.read(inspectionDetailProvider(widget.inspectionId));
    detailState.whenData((inspection) {
      ref.read(inspectionFormProvider.notifier).loadFromInspection(inspection);
      final draft = ref
          .read(inspectionDetailProvider(widget.inspectionId).notifier)
          .loadDraft();
      if (draft != null) {
        ref.read(inspectionFormProvider.notifier).loadFromDraft(draft);
      }
    });
  }

  InspectionTemplate? get _template {
    final detailState = ref.read(inspectionDetailProvider(widget.inspectionId));
    return detailState.valueOrNull?.template;
  }

  bool get _isLocked {
    final detailState = ref.read(inspectionDetailProvider(widget.inspectionId));
    return detailState.valueOrNull?.isLocked ?? false;
  }

  String? get _jobId {
    final detailState = ref.read(inspectionDetailProvider(widget.inspectionId));
    return detailState.valueOrNull?.jobId;
  }

  int get _passCount {
    final form = ref.read(inspectionFormProvider);
    int count = 0;
    for (final r in form.responses.entries) {
      final v = r.value['value'] as String?;
      if (v == 'pass' || v == 'yes' || v == 'ok') count++;
      else if (v != null && v.isNotEmpty &&
          v != 'fail' && v != 'no' && v != 'warn') count++;
    }
    return count;
  }

  int get _warnCount {
    final form = ref.read(inspectionFormProvider);
    int count = 0;
    for (final r in form.responses.entries) {
      final v = r.value['value'] as String?;
      if (v == 'warn') count++;
    }
    return count;
  }

  int get _failCount {
    final form = ref.read(inspectionFormProvider);
    int count = 0;
    for (final r in form.responses.entries) {
      final v = r.value['value'] as String?;
      if (v == 'fail' || v == 'no') count++;
    }
    return count;
  }

  int get _totalItems {
    return _template?.sections.fold<int>(
            0,
            (sum, s) => sum +
                s.items
                    .where((i) => i.inputType != InspectionItemType.photo)
                    .length) ??
        0;
  }

  int get _unsetCount => _totalItems - _passCount - _warnCount - _failCount;

  /// Build a full proxy URL for a server-side media file.
  String _mediaProxyUrl(String mediaId) {
    return '${ApiConstants.baseUrl}${ApiConstants.mediaDownload(mediaId)}';
  }

  /// Get all photo sources for an item: local pending paths + server media URLs.
  List<String> _getPhotoPaths(String itemId) {
    final paths = <String>[];
    final form = ref.read(inspectionFormProvider);

    // Local pending uploads.
    final localPaths = form.responses[itemId]?['photo_paths'] as List<dynamic>?;
    if (localPaths != null) {
      for (final p in localPaths) {
        if (p is String && File(p).existsSync()) paths.add(p);
      }
    }

    // Server media files.
    final detailState = ref.read(inspectionDetailProvider(widget.inspectionId));
    final response = detailState.valueOrNull?.responses
        .where((r) => r.itemId == itemId || r.id == itemId)
        .firstOrNull;
    if (response != null) {
      for (final media in response.mediaFiles) {
        if (media.url != null) {
          if (media.url!.startsWith('/')) {
            paths.add('${ApiConstants.baseUrl}${media.url}');
          } else {
            paths.add(media.url!);
          }
        } else {
          paths.add(_mediaProxyUrl(media.id));
        }
      }
    }

    return paths;
  }

  Future<void> _pickInspectionPhoto(String itemId) async {
    final picker = ImagePicker();
    final source = (!Platform.isWindows && !Platform.isLinux && !kIsWeb)
        ? ImageSource.camera
        : ImageSource.gallery;
    final xFile = await picker.pickImage(
      source: source,
      maxWidth: 1920,
      maxHeight: 1920,
      imageQuality: 85,
    );
    if (xFile == null || !mounted) return;

    // Append to photo_paths list. Keep existing value.
    final form = ref.read(inspectionFormProvider);
    final existing = form.responses[itemId] ?? <String, dynamic>{};
    final currentPaths = List<String>.from(existing['photo_paths'] as List<dynamic>? ?? []);
    currentPaths.add(xFile.path);
    ref.read(inspectionFormProvider.notifier).setResponse(
      itemId,
      {
        ...existing,
        'item_id': itemId,
        if (!existing.containsKey('value') || (existing['value'] as String?) == null)
          'value': 'photo',
        'photo_paths': currentPaths,
      },
    );

    if (mounted) {
      showSuccessSnackBar(context, 'Photo attached');
    }
  }

  /// Enqueue pending photos for background upload. Returns immediately.
  void _enqueuePendingPhotos() {
    final form = ref.read(inspectionFormProvider);
    final jobId = _jobId;
    if (jobId == null) return;

    final photos = <({String itemId, String path})>[];
    for (final entry in form.responses.entries) {
      final itemId = entry.key;
      final data = entry.value;
      final localPaths = List<String>.from(data['photo_paths'] as List<dynamic>? ?? []);
      final uploadedIndexes = Set<int>.from(data['uploaded_indexes'] as List<dynamic>? ?? []);

      for (var i = 0; i < localPaths.length; i++) {
        if (uploadedIndexes.contains(i)) continue;
        final localPath = localPaths[i];
        if (!File(localPath).existsSync()) continue;
        photos.add((itemId: itemId, path: localPath));
        // Mark as uploaded immediately so we don't re-enqueue.
        uploadedIndexes.add(i);
        final updated = Map<String, dynamic>.from(data)
          ..['uploaded_indexes'] = uploadedIndexes.toList();
        ref.read(inspectionFormProvider.notifier).setResponse(itemId, updated);
      }
    }

    if (photos.isEmpty) return;

    ref.read(photoUploadQueueProvider.notifier).enqueueInspectionPhotos(
      jobId: jobId,
      inspectionId: widget.inspectionId,
      photos: photos,
    );
  }

  Future<void> _saveDraft() async {
    setState(() => _saving = true);
    try {
      _enqueuePendingPhotos();
      final form = ref.read(inspectionFormProvider);
      await ref
          .read(inspectionDetailProvider(widget.inspectionId).notifier)
          .saveResponses(responses: form.toResponseList());
      if (mounted) {
        hapticLight();
        showSuccessSnackBar(context, 'Draft saved');
      }
    } catch (e) {
      if (mounted) {
        showErrorSnackBar(context, handleError(e).message);
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _submit() async {
    final advisorNoteController = TextEditingController();
    final unset = _unsetCount;

    final confirmed = await showDialog<Map<String, dynamic>?>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: unset > 0
            ? const Text('Incomplete Items',
                style: TextStyle(color: AppColors.foreground))
            : const Text('Submit Inspection',
                style: TextStyle(color: AppColors.foreground)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (unset > 0)
              Text(
                '$unset item(s) still have no response. Submit anyway?',
                style: const TextStyle(color: AppColors.textSecondary),
              ),
            const SizedBox(height: 16),
            TextField(
              controller: advisorNoteController,
              maxLines: 2,
              decoration: InputDecoration(
                hintText: 'Note to advisor (optional)',
                isDense: true,
                filled: true,
                fillColor: AppColors.surfaceLight,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: AppColors.border),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: AppColors.border),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: AppColors.primary),
                ),
              ),
              style: const TextStyle(color: AppColors.foreground, fontSize: 13),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, null),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, {
              'confirmed': true,
              'advisorNote': advisorNoteController.text,
            }),
            child: const Text('Submit',
                style: TextStyle(color: AppColors.danger)),
          ),
        ],
      ),
    );
    if (confirmed == null || confirmed['confirmed'] != true) return;

    final advisorNote = (confirmed['advisorNote'] as String?)?.trim();

    setState(() => _submitting = true);
    try {
      _enqueuePendingPhotos();
      final form = ref.read(inspectionFormProvider);
      await ref
          .read(inspectionDetailProvider(widget.inspectionId).notifier)
          .saveAndSubmit(
            responses: form.toResponseList(),
            advisorNote: advisorNote?.isNotEmpty == true ? advisorNote : null,
          );
      if (mounted) {
        hapticMedium();
        showSuccessSnackBar(context, 'Inspection submitted');
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (mounted) {
        showErrorSnackBar(context, handleError(e).message);
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final detailAsync = ref.watch(inspectionDetailProvider(widget.inspectionId));
    final formState = ref.watch(inspectionFormProvider);
    final isLocked = _isLocked;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          _template?.name ?? 'Inspection',
          style: const TextStyle(fontSize: 16),
        ),
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.foreground,
        elevation: 0,
        actions: [
          if (!isLocked && formState.changed)
            TextButton(
              onPressed: _saving ? null : _saveDraft,
              child: _saving
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Save',
                      style: TextStyle(color: AppColors.primary)),
            ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(44),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            child: InspectionSummaryBar(
              passCount: _passCount,
              warnCount: _warnCount,
              failCount: _failCount,
              unsetCount: _unsetCount,
            ),
          ),
        ),
      ),
      body: detailAsync.when(
        loading: () => const Center(
            child: CircularProgressIndicator(color: AppColors.primary)),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(handleError(e).message,
                  style: const TextStyle(color: AppColors.danger)),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.invalidate(inspectionDetailProvider(widget.inspectionId)),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (inspection) {
          final template = inspection.template;
          if (template == null) {
            return const Center(
              child: Text('No template data available',
                  style: TextStyle(color: AppColors.textMuted)),
            );
          }
          return RefreshIndicator(
            onRefresh: () => ref
                .read(inspectionDetailProvider(widget.inspectionId).notifier)
                .refresh(),
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: template.sections.length,
              itemBuilder: (context, index) {
                final section = template.sections[index];
                return InspectionSectionCard(
                  section: section,
                  initiallyExpanded: index == 0,
                  enabled: !isLocked,
                  getResponseValue: (itemId) =>
                      formState.responses[itemId]?['value'] as String?,
                  getResponseUrgency: (itemId) =>
                      formState.responses[itemId]?['urgency'] as String?,
                  getResponseNotes: (itemId) =>
                      formState.responses[itemId]?['tech_notes'] as String?,
                  getPhotoPaths: (itemId) => _getPhotoPaths(itemId),
                  onChanged: (itemId, value) {
                    final existing =
                        formState.responses[itemId] ?? <String, dynamic>{};
                    ref.read(inspectionFormProvider.notifier).setResponse(
                          itemId,
                          {...existing, 'item_id': itemId, 'value': value},
                        );
                  },
                  onUrgencyChanged: (itemId, urgency) {
                    final existing =
                        formState.responses[itemId] ?? <String, dynamic>{};
                    ref.read(inspectionFormProvider.notifier).setResponse(
                          itemId,
                          {...existing, 'item_id': itemId, 'urgency': urgency},
                        );
                  },
                  onNotesChanged: (itemId, notes) {
                    final existing =
                        formState.responses[itemId] ?? <String, dynamic>{};
                    ref.read(inspectionFormProvider.notifier).setResponse(
                          itemId,
                          {...existing, 'item_id': itemId, 'tech_notes': notes},
                        );
                  },
                  onPhotoTap: (itemId) => _pickInspectionPhoto(itemId),
                );
              },
            ),
          );
        },
      ),
      bottomNavigationBar: isLocked
          ? Container(
              padding: const EdgeInsets.all(16),
              color: AppColors.surface,
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.lock_outline, color: AppColors.textMuted, size: 18),
                  SizedBox(width: 8),
                  Text(
                    'Inspection locked — view only',
                    style: TextStyle(
                      color: AppColors.textMuted,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            )
          : Container(
              padding: EdgeInsets.fromLTRB(16, 12, 16, MediaQuery.of(context).viewPadding.bottom + 12),
              color: AppColors.surface,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Consumer(builder: (context, ref, _) {
                    final uploadState = ref.watch(photoUploadQueueProvider);
                    if (!uploadState.hasPending) return const SizedBox.shrink();
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        children: [
                          SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: AppColors.primary,
                              value: uploadState.total > 0
                                  ? uploadState.completed / uploadState.total
                                  : null,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Uploading photos ${uploadState.completed}/${uploadState.total}',
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: _saving ? null : _saveDraft,
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.primary,
                            side: const BorderSide(color: AppColors.primary),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                          child: _saving
                              ? const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : const Text('Save Draft'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: _submitting ? null : _submit,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                          child: _submitting
                              ? const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child:
                                      CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                )
                              : const Text('Submit'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
    );
  }
}