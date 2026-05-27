import 'package:flutter/material.dart';
import 'package:prioraflow_tech/core/theme/app_colors.dart';

/// Traffic-light summary showing counts of ok/pass, warn, fail, and unset items.
class InspectionSummaryBar extends StatelessWidget {
  const InspectionSummaryBar({
    super.key,
    this.passCount = 0,
    this.warnCount = 0,
    this.failCount = 0,
    this.unsetCount = 0,
  });

  final int passCount;
  final int warnCount;
  final int failCount;
  final int unsetCount;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          _CountChip(
            label: 'Pass',
            count: passCount,
            color: AppColors.success,
          ),
          const SizedBox(width: 12),
          _CountChip(
            label: 'Warn',
            count: warnCount,
            color: AppColors.warning,
          ),
          const SizedBox(width: 12),
          _CountChip(
            label: 'Fail',
            count: failCount,
            color: AppColors.danger,
          ),
          if (unsetCount > 0) ...[
            const SizedBox(width: 12),
            _CountChip(
              label: 'Pending',
              count: unsetCount,
              color: AppColors.textMuted,
            ),
          ],
        ],
      ),
    );
  }
}

class _CountChip extends StatelessWidget {
  const _CountChip({
    required this.label,
    required this.count,
    required this.color,
  });

  final String label;
  final int count;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
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