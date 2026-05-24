import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:prioraflow_tech/core/theme/app_colors.dart';
import 'package:prioraflow_tech/features/inspection/data/models/inspection_template.dart';

/// Dynamic renderer for a single inspection item, switching UI based on inputType.
class InspectionItemWidget extends StatefulWidget {
  const InspectionItemWidget({
    super.key,
    required this.item,
    this.currentValue,
    this.currentUrgency,
    this.currentNotes,
    this.photoPaths = const [],
    this.onChanged,
    this.onUrgencyChanged,
    this.onNotesChanged,
    this.onPhotoTap,
    this.enabled = true,
  });

  final InspectionItem item;
  final String? currentValue;
  final String? currentUrgency;
  final String? currentNotes;
  final List<String> photoPaths;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onUrgencyChanged;
  final ValueChanged<String>? onNotesChanged;
  final VoidCallback? onPhotoTap;
  final bool enabled;

  @override
  State<InspectionItemWidget> createState() => _InspectionItemWidgetState();
}

class _InspectionItemWidgetState extends State<InspectionItemWidget> {
  late TextEditingController _valueController;
  late TextEditingController _notesController;

  @override
  void initState() {
    super.initState();
    _valueController = TextEditingController(text: widget.currentValue ?? '');
    _notesController = TextEditingController(text: widget.currentNotes ?? '');
  }

  @override
  void didUpdateWidget(InspectionItemWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Sync controllers when parent value changes externally (e.g., draft load)
    if (widget.currentValue != oldWidget.currentValue &&
        widget.currentValue != _valueController.text) {
      _valueController.text = widget.currentValue ?? '';
    }
    if (widget.currentNotes != oldWidget.currentNotes &&
        widget.currentNotes != _notesController.text) {
      _notesController.text = widget.currentNotes ?? '';
    }
  }

  @override
  void dispose() {
    _valueController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  bool get _needsUrgency =>
      widget.currentValue != null &&
      widget.currentValue != '' &&
      widget.currentValue != 'pass' &&
      widget.currentValue != 'yes' &&
      widget.currentValue != 'ok' &&
      widget.item.inputType != InspectionItemType.photo &&
      widget.item.inputType != InspectionItemType.number &&
      widget.item.inputType != InspectionItemType.text &&
      widget.item.inputType != InspectionItemType.odometer;

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: widget.enabled ? 1.0 : 0.6,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildLabel(),
            const SizedBox(height: 8),
            _buildInput(),
            if (widget.currentUrgency != null || _needsUrgency) ...[
              const SizedBox(height: 8),
              _buildUrgencySelector(),
            ],
            if (widget.item.inputType != InspectionItemType.text &&
                widget.item.inputType != InspectionItemType.photo) ...[
              const SizedBox(height: 8),
              _buildNotesField(),
            ],
            if (widget.item.inputType != InspectionItemType.photo) ...[
              const SizedBox(height: 8),
              _buildPhotoButton(),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildLabel() {
    return Row(
      children: [
        Expanded(
          child: Text(
            widget.item.label ?? 'Unnamed Item',
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: AppColors.foreground,
            ),
          ),
        ),
        if (widget.item.unit != null)
          Text(
            widget.item.unit!,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.textMuted,
            ),
          ),
      ],
    );
  }

  Widget _buildInput() {
    return switch (widget.item.inputType) {
      InspectionItemType.passFail => _buildSegmented(
          options: const [('Pass', 'pass', AppColors.success), ('Fail', 'fail', AppColors.danger)],
        ),
      InspectionItemType.yesNo => _buildSegmented(
          options: const [('Yes', 'yes', AppColors.success), ('No', 'no', AppColors.danger)],
        ),
      InspectionItemType.okWarnFail => _buildSegmented(
          options: const [
            ('OK', 'ok', AppColors.success),
            ('Warn', 'warn', AppColors.warning),
            ('Fail', 'fail', AppColors.danger),
          ],
        ),
      InspectionItemType.toggle => _buildToggle(),
      InspectionItemType.number => _buildNumberField(),
      InspectionItemType.text => _buildTextField(),
      InspectionItemType.odometer => _buildOdometerField(),
      InspectionItemType.fuelLevel => _buildFuelLevel(),
      InspectionItemType.photo => _buildPhotoButton(),
    };
  }

  Widget _buildSegmented({
    required List<(String, String, Color)> options,
  }) {
    return Row(
      children: options.map((opt) {
        final (label, value, color) = opt;
        final isSelected = widget.currentValue == value;
        return Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: _SegmentButton(
              label: label,
              color: color,
              selected: isSelected,
              enabled: widget.enabled,
              onTap: widget.enabled ? () => widget.onChanged?.call(value) : null,
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildToggle() {
    final isOn = widget.currentValue == 'true' || widget.currentValue == '1' || widget.currentValue == 'yes';
    return Switch(
      value: isOn,
      onChanged: widget.enabled ? (v) => widget.onChanged?.call(v ? 'true' : 'false') : null,
      activeColor: AppColors.success,
    );
  }

  Widget _buildNumberField() {
    return TextField(
      enabled: widget.enabled,
      keyboardType: TextInputType.number,
      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
      decoration: InputDecoration(
        hintText: 'Enter ${widget.item.label ?? 'value'}',
        suffixText: widget.item.unit,
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
      controller: _valueController,
      onChanged: widget.onChanged,
    );
  }

  Widget _buildTextField() {
    return TextField(
      enabled: widget.enabled,
      maxLines: 3,
      decoration: InputDecoration(
        hintText: 'Enter ${widget.item.label ?? 'notes'}',
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
      controller: _valueController,
      onChanged: widget.onChanged,
    );
  }

  Widget _buildOdometerField() {
    return TextField(
      enabled: widget.enabled,
      keyboardType: TextInputType.number,
      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
      decoration: InputDecoration(
        hintText: 'Odometer reading',
        suffixText: 'km',
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
      style: const TextStyle(
        color: AppColors.foreground,
        fontSize: 24,
        fontWeight: FontWeight.bold,
      ),
      controller: _valueController,
      onChanged: widget.onChanged,
    );
  }

  Widget _buildFuelLevel() {
    const levels = [('E', '0'), ('¼', '25'), ('½', '50'), ('¾', '75'), ('F', '100')];
    return Row(
      children: levels.map((lvl) {
        final (label, value) = lvl;
        final isSelected = widget.currentValue == value;
        return Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 3),
            child: _SegmentButton(
              label: label,
              color: isSelected ? AppColors.primary : AppColors.textMuted,
              selected: isSelected,
              enabled: widget.enabled,
              onTap: widget.enabled ? () => widget.onChanged?.call(value) : null,
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildPhotoButton() {
    final hasPhotos = widget.photoPaths.isNotEmpty;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (hasPhotos) ...[
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
                hasPhotos ? Icons.add_a_photo_outlined : Icons.camera_alt_outlined,
                size: 18,
                color: AppColors.primary,
              ),
              const SizedBox(width: 4),
              Text(
                hasPhotos ? 'Add another photo' : 'Add photo',
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

  Widget _buildUrgencySelector() {
    const urgencies = [
      ('None', 'none'),
      ('Low', 'low'),
      ('Medium', 'medium'),
      ('High', 'high'),
      ('Critical', 'critical'),
    ];
    const colors = [
      AppColors.textMuted,
      AppColors.info,
      AppColors.warning,
      AppColors.danger,
      Color(0xFFDC2626),
    ];

    return Wrap(
      spacing: 6,
      children: List.generate(urgencies.length, (i) {
        final (label, value) = urgencies[i];
        final isSelected = widget.currentUrgency == value;
        return ChoiceChip(
          label: Text(label, style: TextStyle(
            fontSize: 11,
            color: isSelected ? AppColors.foreground : colors[i],
          )),
          selected: isSelected,
          selectedColor: colors[i].withOpacity(0.3),
          backgroundColor: AppColors.surfaceLight,
          side: BorderSide(
            color: isSelected ? colors[i] : AppColors.border,
          ),
          onSelected: widget.enabled
              ? (_) => widget.onUrgencyChanged?.call(value)
              : null,
        );
      }),
    );
  }

  Widget _buildNotesField() {
    return TextField(
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
    );
  }
}

class _SegmentButton extends StatelessWidget {
  const _SegmentButton({
    required this.label,
    required this.color,
    required this.selected,
    this.enabled = true,
    this.onTap,
  });

  final String label;
  final Color color;
  final bool selected;
  final bool enabled;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? color.withOpacity(0.2) : AppColors.surfaceLight,
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        onTap: enabled ? onTap : null,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: selected ? color : AppColors.border,
              width: selected ? 1.5 : 1,
            ),
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                color: selected ? color : AppColors.textMuted,
                fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
                fontSize: 13,
              ),
            ),
          ),
        ),
      ),
    );
  }
}