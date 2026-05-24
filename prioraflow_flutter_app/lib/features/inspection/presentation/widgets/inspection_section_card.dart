import 'package:flutter/material.dart';
import 'package:prioraflow_tech/core/theme/app_colors.dart';
import 'package:prioraflow_tech/features/inspection/data/models/inspection_template.dart';
import 'package:prioraflow_tech/features/inspection/presentation/widgets/inspection_item_widget.dart';

/// Collapsible section card showing a group of inspection items.
class InspectionSectionCard extends StatefulWidget {
  const InspectionSectionCard({
    super.key,
    required this.section,
    this.getResponseValue,
    this.getResponseUrgency,
    this.getResponseNotes,
    this.getPhotoPaths,
    this.onChanged,
    this.onUrgencyChanged,
    this.onNotesChanged,
    this.onPhotoTap,
    this.enabled = true,
    this.initiallyExpanded = false,
  });

  final InspectionSection section;
  final String? Function(String itemId)? getResponseValue;
  final String? Function(String itemId)? getResponseUrgency;
  final String? Function(String itemId)? getResponseNotes;
  final List<String> Function(String itemId)? getPhotoPaths;
  final void Function(String itemId, String value)? onChanged;
  final void Function(String itemId, String urgency)? onUrgencyChanged;
  final void Function(String itemId, String notes)? onNotesChanged;
  final void Function(String itemId)? onPhotoTap;
  final bool enabled;
  final bool initiallyExpanded;

  @override
  State<InspectionSectionCard> createState() => _InspectionSectionCardState();
}

class _InspectionSectionCardState extends State<InspectionSectionCard> {
  late bool _expanded;

  @override
  void initState() {
    super.initState();
    _expanded = widget.initiallyExpanded;
  }

  int get _completedCount {
    int count = 0;
    for (final item in widget.section.items) {
      final value = widget.getResponseValue?.call(item.id);
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
                    if (widget.section.icon != null)
                      Padding(
                        padding: const EdgeInsets.only(right: 10),
                        child: Text(
                          widget.section.icon!,
                          style: const TextStyle(fontSize: 20),
                        ),
                      ),
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
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
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
                      _expanded
                          ? Icons.expand_less
                          : Icons.expand_more,
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
                    InspectionItemWidget(
                      item: item,
                      currentValue: widget.getResponseValue?.call(item.id),
                      currentUrgency:
                          widget.getResponseUrgency?.call(item.id),
                      currentNotes: widget.getResponseNotes?.call(item.id),
                      photoPaths: widget.getPhotoPaths?.call(item.id) ?? [],
                      onChanged: (value) =>
                          widget.onChanged?.call(item.id, value),
                      onUrgencyChanged: (urgency) =>
                          widget.onUrgencyChanged?.call(item.id, urgency),
                      onNotesChanged: (notes) =>
                          widget.onNotesChanged?.call(item.id, notes),
                      onPhotoTap: () => widget.onPhotoTap?.call(item.id),
                      enabled: widget.enabled,
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