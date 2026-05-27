import 'dart:io';
import 'package:flutter/material.dart';
import 'package:prioraflow_tech/core/theme/app_colors.dart';

/// Full-screen photo viewer with pinch-to-zoom and swipe navigation.
class PhotoGalleryScreen extends StatefulWidget {
  const PhotoGalleryScreen({
    required this.urls,
    this.initialIndex = 0,
    super.key,
  });

  final List<String> urls;
  final int initialIndex;

  @override
  State<PhotoGalleryScreen> createState() => _PhotoGalleryScreenState();
}

class _PhotoGalleryScreenState extends State<PhotoGalleryScreen> {
  late PageController _controller;
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
    _controller = PageController(initialPage: widget.initialIndex);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Text('${_currentIndex + 1} / ${widget.urls.length}'),
      ),
      body: widget.urls.isEmpty
          ? const Center(
              child: Text('No photos', style: TextStyle(color: AppColors.textMuted)),
            )
          : PageView.builder(
              controller: _controller,
              itemCount: widget.urls.length,
              onPageChanged: (i) => setState(() => _currentIndex = i),
              itemBuilder: (context, index) {
                final source = widget.urls[index];
                final isLocalFile = source.startsWith('/') || source.startsWith('C:\\') || File(source).existsSync();
                return InteractiveViewer(
                  minScale: 0.5,
                  maxScale: 4.0,
                  child: Center(
                    child: isLocalFile
                        ? Image.file(
                            File(source),
                            fit: BoxFit.contain,
                            errorBuilder: (_, __, ___) => Container(
                              width: 80,
                              height: 80,
                              color: AppColors.surface,
                              child: const Icon(Icons.broken_image,
                                  size: 40, color: AppColors.textMuted),
                            ),
                          )
                        : Image.network(
                            source,
                            fit: BoxFit.contain,
                            errorBuilder: (_, __, ___) => Container(
                              width: 80,
                              height: 80,
                              color: AppColors.surface,
                              child: const Icon(Icons.broken_image,
                                  size: 40, color: AppColors.textMuted),
                            ),
                            loadingBuilder: (_, child, progress) {
                              if (progress == null) return child;
                              return Center(
                                child: CircularProgressIndicator(
                                  value: progress.expectedTotalBytes != null
                                      ? progress.cumulativeBytesLoaded /
                                          progress.expectedTotalBytes!
                                      : null,
                                  color: AppColors.primary,
                                ),
                              );
                            },
                          ),
                  ),
                );
              },
            ),
    );
  }
}