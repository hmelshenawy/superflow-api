import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:prioraflow_tech/core/theme/app_colors.dart';
import 'package:prioraflow_tech/features/parts/data/parts_repository.dart';

final jobPartsProvider = FutureProvider.family<List<Map<String, dynamic>>, String>((ref, jobId) async {
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
                final part = parts[index];
                return _PartCard(part: part);
              },
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
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
  final Map<String, dynamic> part;

  @override
  Widget build(BuildContext context) {
    final status = part['status'] as String? ?? 'requested';
    final color = _statusColor(status);

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
                    part['part']?['name'] as String? ?? part['name'] as String? ?? 'Unknown Part',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  if (part['quantity'] != null) ...[
                    const SizedBox(height: 4),
                    Text('Qty: ${part['quantity']}', style: Theme.of(context).textTheme.labelSmall),
                  ],
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                _statusLabel(status),
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: color),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _statusColor(String status) {
    switch (status.toLowerCase()) {
      case 'arrived':
      case 'parts_ready':
        return AppColors.success;
      case 'sourcing':
      case 'order_parts':
        return AppColors.warning;
      case 'cancelled':
        return AppColors.danger;
      default:
        return AppColors.textMuted;
    }
  }

  String _statusLabel(String status) {
    switch (status.toLowerCase()) {
      case 'requested':
        return 'Requested';
      case 'sourcing':
        return 'Sourcing';
      case 'arrived':
      case 'parts_ready':
        return 'Arrived';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status.replaceAll('_', ' ').split(' ').map((w) => w[0].toUpperCase() + w.substring(1)).join(' ');
    }
  }
}