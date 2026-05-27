import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:prioraflow_tech/core/api/api_constants.dart';
import 'package:prioraflow_tech/core/errors/error_handler.dart';
import 'package:prioraflow_tech/core/theme/app_colors.dart';
import 'package:prioraflow_tech/core/theme/snackbar.dart';
import 'package:prioraflow_tech/core/upload/photo_upload_queue.dart';
import 'package:prioraflow_tech/core/utils/haptic.dart';
import 'package:prioraflow_tech/features/inspection/data/models/qc_checklist.dart';
import 'package:prioraflow_tech/features/inspection/presentation/qc_checklist_provider.dart';

/// Workspace screen for filling out a QC checklist.
class QcChecklistWorkspaceScreen extends ConsumerStatefulWidget {
  const QcChecklistWorkspaceScreen({
    super.key,
    required this.checklistId,
  });

  final String checklistId;

  @override
  ConsumerState<QcChecklistWorkspaceScreen> createState() =>
      _QcChecklistWorkspaceScreenState();
}

class _QcChecklistWorkspaceScreenState
    extends ConsumerState<QcChecklistWorkspaceScreen> {
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
    final detailState = ref.read(qcChecklistDetailProvider(widget.checklistId));
    detailState.whenData((checklist) {
      ref.read(qcFormProvider.notifier).loadFromChecklist(checklist);
      final draft = ref
          .read(qcChecklistDetailProvider(widget.checklistId).notifier)
          .loadDraft();
      if (draft != null) {
        ref.read(qcFormProvider.notifier).loadFromDraft(draft);
      }
    });
  }

  bool get _isLocked {
    final detailState = ref.read(qcChecklistDetailProvider(widget.checklistId));
    return detailState.valueOrNull?.isLocked ?? false;
  }

  String? get _jobId {
    final detailState = ref.read(qcChecklistDetailProvider(widget.checklistId));
    return detailState.valueOrNull?.jobId;
  }

  int get _passCount {
    final form = ref.read(qcFormProvider);
    int count = 0;
    for (final r in form.responses.entries) {
      final v = r.value['value'] as String?;
      if (v == 'pass' || v == 'yes' || v == 'ok') count++;
      else if (v != null && v.isNotEmpty &&
          v != 'fail' && v != 'no' && v != 'warn') count++;
    }
    return count;
  }

  int get _failCount {
    final form = ref.read(qcFormProvider);
    int count = 0;
    for (final r in form.responses.entries) {
      final v = r.value['value'] as String?;
      if (v == 'fail' || v == 'no') count++;
    }
    return count;
  }

  int get _totalItems {
    return ref
            .read(qcChecklistDetailProvider(widget.checklistId))
            .valueOrNull
            ?.template
            ?.sections
            .fold<int>(
              0,
              (sum, s) => sum +
                  s.items
                      .where((i) => i.inputType != QcChecklistItemType.photo)
                      .length,
            ) ??
        0;
  }

  int get _unsetCount => _totalItems - _passCount - _failCount;

  String _mediaProxyUrl(String mediaId) {
    return '${ApiConstants.baseUrl}${ApiConstants.mediaDownload(mediaId)}';
  }

  /// Get all photo sources for an item: local pending paths + server media URLs.
  List<String> _getPhotoPaths(String itemId) {
    final paths = <String>[];
    final form = ref.read(qcFormProvider);

    // Local pending uploads.
    final localPaths = form.responses[itemId]?['photo_paths'] as List<dynamic>?;
    if (localPaths != null) {
      for (final p in localPaths) {
        if (p is String && File(p).existsSync()) paths.add(p);
      }
    }

    // Server media files.
    final detailState = ref.read(qcChecklistDetailProvider(widget.checklistId));
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

  Future<void> _pickQcPhoto(String itemId) async {
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

    final form = ref.read(qcFormProvider);
    final existing = form.responses[itemId] ?? <String, dynamic>{};
    final currentPaths = List<String>.from(existing['photo_paths'] as List<dynamic>? ?? []);
    currentPaths.add(xFile.path);
    ref.read(qcFormProvider.notifier).setResponse(
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
    final form = ref.read(qcFormProvider);
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
        uploadedIndexes.add(i);
        final updated = Map<String, dynamic>.from(data)
          ..['uploaded_indexes'] = uploadedIndexes.toList();
        ref.read(qcFormProvider.notifier).setResponse(itemId, updated);
      }
    }

    if (photos.isEmpty) return;

    ref.read(photoUploadQueueProvider.notifier).enqueueQcPhotos(
      jobId: jobId,
      checklistId: widget.checklistId,
      photos: photos,
    );
  }

  Future<void> _saveDraft() async {
    setState(() => _saving = true);
    try {
      _enqueuePendingPhotos();
      final form = ref.read(qcFormProvider);
      await ref
          .read(qcChecklistDetailProvider(widget.checklistId).notifier)
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
    final unset = _unsetCount;
    if (unset > 0) {
      final confirm = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: AppColors.surface,
          title: const Text('Incomplete Items',
              style: TextStyle(color: AppColors.foreground)),
          content: Text(
            '$unset item(s) still have no response. Submit anyway?',
            style: const TextStyle(color: AppColors.textSecondary),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Submit',
                  style: TextStyle(color: AppColors.danger)),
            ),
          ],
        ),
      );
      if (confirm != true) return;
    }

    setState(() => _submitting = true);
    try {
      _enqueuePendingPhotos();
      final form = ref.read(qcFormProvider);
      await ref
          .read(qcChecklistDetailProvider(widget.checklistId).notifier)
          .saveAndSubmit(responses: form.toResponseList());
      if (mounted) {
        hapticMedium();
        showSuccessSnackBar(context, 'QC checklist submitted');
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
    final detailAsync =
        ref.watch(qcChecklistDetailProvider(widget.checklistId));
    final formState = ref.watch(qcFormProvider);
    final isLocked = _isLocked;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          ref.read(qcChecklistDetailProvider(widget.checklistId)).valueOrNull
                  ?.template?.name ??
              'QC Checklist',
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
            child: Row(
              children: [
                _buildCountChip('Pass', _passCount, AppColors.success),
                const SizedBox(width: 12),
                _buildCountChip('Fail', _failCount, AppColors.danger),
                if (_unsetCount > 0) ...[
                  const SizedBox(width: 12),
                  _buildCountChip('Pending', _unsetCount, AppColors.textMuted),
                ],
              ],
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
                onPressed: () => ref.invalidate(qcChecklistDetailProvider(widget.checklistId)),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (checklist) {
          final template = checklist.template;
          if (template == null) {
            return const Center(
              child: Text('No template data available',
                  style: TextStyle(color: AppColors.textMuted)),
            );
          }
          return RefreshIndicator(
            onRefresh: () => ref
                .read(qcChecklistDetailProvider(widget.checklistId).notifier)
                .refresh(),
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: template.sections.length,
              itemBuilder: (context, index) {
                final section = template.sections[index];
                return _QcSectionCard(
                  section: section,
                  checklist: checklist,
                  formState: formState,
                  enabled: !isLocked,
                  getPhotoPaths: (itemId) => _getPhotoPaths(itemId),
                  onValueChanged: (itemId, value) {
                    final existing =
                        formState.responses[itemId] ?? <String, dynamic>{};
                    ref.read(qcFormProvider.notifier).setResponse(
                          itemId,
                          {...existing, 'item_id': itemId, 'value': value},
                        );
                  },
                  onNotesChanged: (itemId, notes) {
                    final existing =
                        formState.responses[itemId] ?? <String, dynamic>{};
                    ref.read(qcFormProvider.notifier).setResponse(
                          itemId,
                          {...existing, 'item_id': itemId, 'notes': notes},
                        );
                  },
                  onPhotoTap: (itemId) => _pickQcPhoto(itemId),
                  initiallyExpanded: index == 0,
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
                    'Checklist locked — view only',
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
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Colors.white),
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

  Widget _buildCountChip(String label, int count, Color color) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 4),
        Text(
          '$count $label',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: color,
          ),
        ),
      ],
    );
  }
}

class _QcSectionCard extends StatefulWidget {
  const _QcSectionCard({
    required this.section,
    required this.checklist,
    required this.formState,
    required this.onValueChanged,
    required this.onNotesChanged,
    this.onPhotoTap,
    this.getPhotoPaths,
    this.enabled = true,
    this.initiallyExpanded = false,
  });

  final QcChecklistSection section;
  final QcChecklist checklist;
  final QcFormState formState;
  final void Function(String itemId, String value) onValueChanged;
  final void Function(String itemId, String notes) onNotesChanged;
  final void Function(String itemId)? onPhotoTap;
  final List<String> Function(String itemId)? getPhotoPaths;
  final bool enabled;
  final bool initiallyExpanded;

  @override
  State<_QcSectionCard> createState() => _QcSectionCardState();
}

class _QcSectionCardState extends State<_QcSectionCard> {
  late bool _expanded;

  @override
  void initState() {
    super.initState();
    _expanded = widget.initiallyExpanded;
  }

  int get _completedCount {
    int count = 0;
    for (final item in widget.section.items) {
      final value = widget.formState.responses[item.id]?['value'] as String?;
      if (value != null && value.isNotEmpty) count++;
    }
    return count;
  }

  @override
  Widget build(BuildContext context) {
    final total = widget.section.items.length;
    final completed = _completedCount;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          Material(
            color: Colors.transparent,
            borderRadius: BorderRadius.circular(16),
            child: InkWell(
              borderRadius: BorderRadius.circular(16),
              onTap: () => setState(() => _expanded = !_expanded),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 14, 12, 14),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        widget.section.name ?? 'Section',
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: AppColors.foreground,
                        ),
                      ),
                    ),
                    Container(
                      padding:
                          const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: completed == total
                            ? AppColors.success.withOpacity(0.15)
                            : AppColors.surfaceLight,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: completed == total
                              ? AppColors.success
                              : AppColors.border,
                        ),
                      ),
                      child: Text(
                        '$completed/$total',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: completed == total
                              ? AppColors.success
                              : AppColors.textMuted,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Icon(
                      _expanded ? Icons.expand_less : Icons.expand_more,
                      color: AppColors.textMuted,
                      size: 20,
                    ),
                  ],
                ),
              ),
            ),
          ),
          if (_expanded) ...[
            const Divider(height: 1, color: AppColors.border),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  for (final item in widget.section.items) ...[
                    _QcItemRow(
                      item: item,
                      value: widget.formState.responses[item.id]?['value'] as String?,
                      notes: widget.formState.responses[item.id]?['notes'] as String?,
                      hasPhoto: widget.formState.responses[item.id]?['value'] == 'photo' ||
                          (widget.formState.responses[item.id]?['photo_paths'] as List?)?.isNotEmpty == true,
                      photoPaths: widget.getPhotoPaths?.call(item.id) ?? [],
                      enabled: widget.enabled,
                      onValueChanged: (v) => widget.onValueChanged(item.id, v),
                      onNotesChanged: (n) => widget.onNotesChanged(item.id, n),
                      onPhotoTap: widget.onPhotoTap != null
                          ? () => widget.onPhotoTap!(item.id)
                          : null,
                    ),
                    if (item != widget.section.items.last)
                      const Divider(height: 24, color: AppColors.border),
                  ],
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _QcItemRow extends StatefulWidget {
  const _QcItemRow({
    required this.item,
    this.value,
    this.notes,
    this.hasPhoto = false,
    this.photoPaths = const [],
    required this.onValueChanged,
    required this.onNotesChanged,
    this.onPhotoTap,
    this.enabled = true,
  });

  final QcChecklistItem item;
  final String? value;
  final String? notes;
  final bool hasPhoto;
  final List<String> photoPaths;
  final ValueChanged<String> onValueChanged;
  final ValueChanged<String> onNotesChanged;
  final VoidCallback? onPhotoTap;
  final bool enabled;

  @override
  State<_QcItemRow> createState() => _QcItemRowState();
}

class _QcItemRowState extends State<_QcItemRow> {
  late TextEditingController _notesController;
  late TextEditingController _textController;

  @override
  void initState() {
    super.initState();
    _notesController = TextEditingController(text: widget.notes ?? '');
    _textController = TextEditingController(text: widget.value ?? '');
  }

  @override
  void didUpdateWidget(_QcItemRow oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.notes != oldWidget.notes && widget.notes != _notesController.text) {
      _notesController.text = widget.notes ?? '';
    }
    if (widget.value != oldWidget.value && widget.value != _textController.text) {
      _textController.text = widget.value ?? '';
    }
  }

  @override
  void dispose() {
    _notesController.dispose();
    _textController.dispose();
    super.dispose();
  }

  bool get _hasAnyPhoto => widget.hasPhoto || widget.photoPaths.isNotEmpty;

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: widget.enabled ? 1.0 : 0.6,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            widget.item.label ?? 'Item',
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: AppColors.foreground,
            ),
          ),
          const SizedBox(height: 8),
          _buildInput(),
          if (widget.item.inputType != QcChecklistItemType.photo &&
              widget.item.inputType != QcChecklistItemType.text) ...[
            const SizedBox(height: 8),
            TextField(
              enabled: widget.enabled,
              maxLines: 2,
              decoration: InputDecoration(
                hintText: 'Notes',
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
              controller: _notesController,
              onChanged: widget.onNotesChanged,
            ),
          ],
          if (widget.item.inputType != QcChecklistItemType.photo) ...[
            const SizedBox(height: 8),
            _buildPhotoButton(),
          ],
        ],
      ),
    );
  }

  Widget _buildInput() {
    return switch (widget.item.inputType) {
      QcChecklistItemType.passFail => _buildSegmented([
          ('Pass', 'pass', AppColors.success),
          ('Fail', 'fail', AppColors.danger),
        ]),
      QcChecklistItemType.yesNo => _buildSegmented([
          ('Yes', 'yes', AppColors.success),
          ('No', 'no', AppColors.danger),
        ]),
      QcChecklistItemType.okFail => _buildSegmented([
          ('OK', 'ok', AppColors.success),
          ('Fail', 'fail', AppColors.danger),
        ]),
      QcChecklistItemType.photo => Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildPhotoButton(),
          ],
        ),
      QcChecklistItemType.text => TextField(
          enabled: widget.enabled,
          maxLines: 2,
          decoration: InputDecoration(
            hintText: 'Enter notes',
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
          style: const TextStyle(color: AppColors.foreground, fontSize: 14),
          controller: _textController,
          onChanged: widget.onValueChanged,
        ),
    };
  }

  Widget _buildSegmented(List<(String, String, Color)> options) {
    return Row(
      children: options.map((opt) {
        final (label, val, color) = opt;
        final isSelected = widget.value == val;
        return Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Material(
              color: isSelected ? color.withOpacity(0.2) : AppColors.surfaceLight,
              borderRadius: BorderRadius.circular(10),
              child: InkWell(
                onTap: widget.enabled ? () => widget.onValueChanged(val) : null,
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: isSelected ? color : AppColors.border,
                      width: isSelected ? 1.5 : 1,
                    ),
                  ),
                  child: Center(
                    child: Text(
                      label,
                      style: TextStyle(
                        color: isSelected ? color : AppColors.textMuted,
                        fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildPhotoButton() {
    final hasPhoto = _hasAnyPhoto;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (hasPhoto && widget.photoPaths.isNotEmpty) ...[
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: List.generate(widget.photoPaths.length, (index) {
              final path = widget.photoPaths[index];
              final isLocalFile = path.startsWith('/') || path.startsWith('C:\\') || File(path).existsSync();
              return GestureDetector(
                onTap: () => context.push('/gallery', extra: {
                  'urls': widget.photoPaths,
                  'initialIndex': index,
                }),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: isLocalFile
                      ? Image.file(
                          File(path),
                          width: 64,
                          height: 64,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            width: 64,
                            height: 64,
                            color: AppColors.surfaceLight,
                            child: const Icon(Icons.broken_image, size: 24, color: AppColors.textMuted),
                          ),
                        )
                      : Image.network(
                          path,
                          width: 64,
                          height: 64,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            width: 64,
                            height: 64,
                            color: AppColors.surfaceLight,
                            child: const Icon(Icons.broken_image, size: 24, color: AppColors.textMuted),
                          ),
                        ),
                ),
              );
            }),
          ),
          const SizedBox(height: 6),
        ],
        GestureDetector(
          onTap: widget.enabled ? widget.onPhotoTap : null,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                hasPhoto ? Icons.add_a_photo_outlined : Icons.camera_alt_outlined,
                size: 18,
                color: AppColors.primary,
              ),
              const SizedBox(width: 4),
              Text(
                hasPhoto ? 'Add another photo' : 'Add photo',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}