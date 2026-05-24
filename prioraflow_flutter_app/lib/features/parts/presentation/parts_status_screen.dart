import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:prioraflow_tech/core/theme/app_colors.dart';
import 'package:prioraflow_tech/features/parts/data/models/part.dart';
import 'package:prioraflow_tech/features/parts/data/parts_repository.dart';
import 'package:shimmer/shimmer.dart';

final jobPartsProvider = FutureProvider.family<List<JobPart>, String>((ref, jobId) async {
  final repo = ref.watch(partsRepositoryProvider);
  return repo.getJobParts(jobId);
});

class PartsStatusScreen extends ConsumerWidget {

  const PartsStatusScreen({required this.jobId, super.key});
  final String jobId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final partsAsync = ref.watch(jobPartsProvider(jobId));

    return Scaffold(
      appBar: AppBar(title: const Text('Parts Status')),
      body: partsAsync.when(
        data: (parts) {
          if (parts.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.inventory_2_outlined, size: 64, color: AppColors.textMuted),
                  const SizedBox(height: 16),
                  Text('No parts requested', style: Theme.of(context).textTheme.titleMedium?.copyWith(color: AppColors.textMuted)),
                ],
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(jobPartsProvider(jobId));
            },
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: parts.length,
              itemBuilder: (context, index) {
                return _PartCard(part: parts[index]);
              },
            ),
          );
        },
        loading: () => Shimmer.fromColors(
          baseColor: AppColors.surfaceLight,
          highlightColor: AppColors.border,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: List.generate(4, (_) => Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: Container(height: 60, padding: const EdgeInsets.all(16)),
            )),
          ),
        ),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Failed to load parts'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.invalidate(jobPartsProvider(jobId)),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PartCard extends StatelessWidget {

  const _PartCard({required this.part});
  final JobPart part;

  @override
  Widget build(BuildContext context) {
    final statusColor = _statusColor(part.status);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    part.displayName,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  if (part.quantity != null) ...[
                    const SizedBox(height: 4),
                    Text('Qty: ${part.quantity}', style: Theme.of(context).textTheme.labelSmall),
                  ],
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: statusColor.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                part.status.label,
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: statusColor),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _statusColor(PartStatus status) {
    return switch (status) {
      PartStatus.arrived || PartStatus.partsReady => AppColors.success,
      PartStatus.sourcing || PartStatus.orderParts => AppColors.warning,
      PartStatus.cancelled => AppColors.danger,
      _ => AppColors.textMuted,
    };
  }
}