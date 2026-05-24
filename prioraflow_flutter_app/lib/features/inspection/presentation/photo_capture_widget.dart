import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:prioraflow_tech/core/theme/app_colors.dart';

class PhotoCaptureWidget extends StatefulWidget {
  const PhotoCaptureWidget({
    required this.onPhotosChanged,
    this.maxPhotos = 5,
    super.key,
  });

  final void Function(List<File> photos) onPhotosChanged;
  final int maxPhotos;

  @override
  State<PhotoCaptureWidget> createState() => _PhotoCaptureWidgetState();
}

class _PhotoCaptureWidgetState extends State<PhotoCaptureWidget> {
  final _picker = ImagePicker();
  List<File> _photos = [];

  Future<void> _pickImage(ImageSource source) async {
    if (_photos.length >= widget.maxPhotos) return;

    final xFile = await _picker.pickImage(
      source: source,
      maxWidth: 1920,
      maxHeight: 1920,
      imageQuality: 85,
    );
    if (xFile == null) return;

    setState(() {
      _photos.add(File(xFile.path));
    });
    widget.onPhotosChanged(_photos);
  }

  void _removePhoto(int index) {
    setState(() {
      _photos.removeAt(index);
    });
    widget.onPhotosChanged(_photos);
  }

  @override
  Widget build(BuildContext context) {
    final remaining = widget.maxPhotos - _photos.length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text('Photos', style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(width: 8),
            Text(
              '${_photos.length}/${widget.maxPhotos}',
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: AppColors.textMuted,
                  ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (_photos.isNotEmpty)
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: List.generate(_photos.length, (i) {
              return _PhotoThumbnail(
                file: _photos[i],
                onRemove: () => _removePhoto(i),
              );
            }),
          ),
        if (remaining > 0) ...[
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _pickImage(ImageSource.camera),
                  icon: const Icon(Icons.camera_alt, size: 18),
                  label: const Text('Camera'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _pickImage(ImageSource.gallery),
                  icon: const Icon(Icons.photo_library, size: 18),
                  label: const Text('Gallery'),
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }
}

class _PhotoThumbnail extends StatelessWidget {
  const _PhotoThumbnail({required this.file, required this.onRemove});
  final File file;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: Image.file(
            file,
            width: 100,
            height: 100,
            fit: BoxFit.cover,
          ),
        ),
        Positioned(
          top: 4,
          right: 4,
          child: GestureDetector(
            onTap: onRemove,
            child: Container(
              padding: const EdgeInsets.all(2),
              decoration: const BoxDecoration(
                color: AppColors.danger,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.close, size: 16, color: Colors.white),
            ),
          ),
        ),
      ],
    );
  }
}