import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:prioraflow_tech/core/theme/app_colors.dart';
import 'package:prioraflow_tech/features/inspection/data/models/finding.dart';
import 'package:prioraflow_tech/features/inspection/presentation/finding_form_provider.dart';
import 'package:prioraflow_tech/features/inspection/presentation/photo_capture_widget.dart';

class FindingFormScreen extends ConsumerStatefulWidget {
  const FindingFormScreen({
    required this.jobId,
    required this.concernId,
    required this.concernDescription,
    super.key,
  });

  final String jobId;
  final String concernId;
  final String concernDescription;

  @override
  ConsumerState<FindingFormScreen> createState() => _FindingFormScreenState();
}

class _FindingFormScreenState extends ConsumerState<FindingFormScreen> {
  FindingType _selectedType = FindingType.ok;
  final _descriptionController = TextEditingController();
  final _estimatedMinutesController = TextEditingController();
  bool _needsPart = false;
  final _partNameController = TextEditingController();
  final _partQuantityController = TextEditingController(text: '1');
  final _partNotesController = TextEditingController();
  List<File> _photos = [];

  @override
  void dispose() {
    _descriptionController.dispose();
    _estimatedMinutesController.dispose();
    _partNameController.dispose();
    _partQuantityController.dispose();
    _partNotesController.dispose();
    super.dispose();
  }

  Future<void> _saveFinding() async {
    if (_selectedType != FindingType.ok &&
        _descriptionController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Description is required for non-OK findings')),
      );
      return;
    }

    final notifier = ref.read(findingFormProvider.notifier);
    final success = await notifier.submit(
      concernId: widget.concernId,
      jobId: widget.jobId,
      type: _selectedType,
      description: _descriptionController.text.trim().isEmpty
          ? null
          : _descriptionController.text.trim(),
      estimatedMinutes: _estimatedMinutesController.text.isNotEmpty
          ? int.tryParse(_estimatedMinutesController.text)
          : null,
      photos: _photos.isNotEmpty ? _photos : null,
      partName: _needsPart ? _partNameController.text.trim() : null,
      partQuantity: _needsPart
          ? int.tryParse(_partQuantityController.text) ?? 1
          : null,
      partNotes: _needsPart ? _partNotesController.text.trim() : null,
    );

    if (!mounted) return;

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Finding saved')),
      );
      Navigator.of(context).pop();
    } else {
      final error = ref.read(findingFormProvider).error;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error ?? 'Failed to save finding')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(findingFormProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Inspection Finding')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Concern description (read-only)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Concern',
                        style: Theme.of(context)
                            .textTheme
                            .labelSmall
                            ?.copyWith(color: AppColors.textMuted)),
                    const SizedBox(height: 4),
                    Text(widget.concernDescription,
                        style: Theme.of(context).textTheme.bodyMedium),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Finding type selector
            Text('Finding Type',
                style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: FindingType.values.map((type) {
                final selected = type == _selectedType;
                return ChoiceChip(
                  label: Text(type.label),
                  selected: selected,
                  onSelected: (_) => setState(() => _selectedType = type),
                  selectedColor: _typeColor(type).withValues(alpha: 0.2),
                );
              }).toList(),
            ),
            const SizedBox(height: 16),

            // Description (required for non-OK)
            if (_selectedType != FindingType.ok) ...[
              TextFormField(
                controller: _descriptionController,
                decoration: const InputDecoration(
                  labelText: 'Description',
                  hintText: 'Describe the finding...',
                  alignLabelWithHint: true,
                ),
                maxLines: 3,
                textCapitalization: TextCapitalization.sentences,
              ),
              const SizedBox(height: 16),
            ],

            // Estimated time
            TextFormField(
              controller: _estimatedMinutesController,
              decoration: const InputDecoration(
                labelText: 'Estimated Time (minutes)',
                hintText: 'Optional',
              ),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 16),

            // Photo capture
            PhotoCaptureWidget(
              onPhotosChanged: (photos) {
                setState(() => _photos = photos);
              },
            ),
            const SizedBox(height: 16),

            // Parts request toggle
            if (_selectedType != FindingType.ok) ...[
              SwitchListTile(
                title: const Text('Request Parts'),
                subtitle: _needsPart
                    ? null
                    : const Text('Toggle if this finding requires parts'),
                value: _needsPart,
                onChanged: (v) => setState(() => _needsPart = v),
                contentPadding: EdgeInsets.zero,
                controlAffinity: ListTileControlAffinity.leading,
              ),
              if (_needsPart) ...[
                const SizedBox(height: 8),
                TextFormField(
                  controller: _partNameController,
                  decoration: const InputDecoration(labelText: 'Part Name'),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _partQuantityController,
                  decoration: const InputDecoration(labelText: 'Quantity'),
                  keyboardType: TextInputType.number,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _partNotesController,
                  decoration: const InputDecoration(
                    labelText: 'Notes',
                    hintText: 'Optional notes about the part',
                  ),
                  maxLines: 2,
                ),
              ],
              const SizedBox(height: 16),
            ],

            // Photo upload progress
            if (state.isUploadingPhotos) ...[
              LinearProgressIndicator(
                value:
                    state.photosTotal > 0
                        ? state.photosUploaded / state.photosTotal
                        : 0,
              ),
              const SizedBox(height: 4),
              Text(
                'Uploading photo ${state.photosUploaded}/${state.photosTotal}',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: AppColors.textMuted,
                    ),
              ),
              const SizedBox(height: 16),
            ],

            // Submit
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed:
                    state.isLoading ? null : _saveFinding,
                child: state.isLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white),
                      )
                    : const Text('Save Finding'),
              ),
            ),

            if (state.error != null) ...[
              const SizedBox(height: 12),
              Text(state.error!,
                  style: const TextStyle(
                      color: AppColors.danger, fontSize: 13)),
            ],
          ],
        ),
      ),
    );
  }

  Color _typeColor(FindingType type) {
    switch (type) {
      case FindingType.ok:
        return AppColors.success;
      case FindingType.needsAttention:
        return AppColors.warning;
      case FindingType.critical:
        return AppColors.danger;
      case FindingType.deferred:
        return AppColors.textMuted;
    }
  }
}