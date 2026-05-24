import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:prioraflow_tech/core/theme/app_colors.dart';
import 'package:prioraflow_tech/features/inspection/data/models/concern.dart';
import 'package:prioraflow_tech/features/inspection/presentation/concern_list_provider.dart';
import 'package:prioraflow_tech/features/inspection/presentation/finding_form_screen.dart';

class ConcernListScreen extends ConsumerWidget {

  const ConcernListScreen({required this.jobId, super.key});
  final String jobId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final concernsAsync = ref.watch(concernListProvider(jobId));

    return Scaffold(
      appBar: AppBar(title: const Text('Concerns')),
      body: concernsAsync.when(
        data: (concerns) {
          if (concerns.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.checklist_outlined, size: 64, color: AppColors.textMuted),
                  const SizedBox(height: 16),
                  Text('No concerns logged', style: Theme.of(context).textTheme.titleMedium?.copyWith(color: AppColors.textMuted)),
                ],
              ),
            );
          }
          final inspected = concerns.where((c) => c.findingStatus != null).length;
          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Text(
                      '$inspected of ${concerns.length} inspected',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.textMuted),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: () => ref.read(concernListProvider(jobId).notifier).refresh(),
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: concerns.length,
                    itemBuilder: (context, index) => _ConcernCard(
                      concern: concerns[index],
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => FindingFormScreen(
                            jobId: jobId,
                            concernId: concerns[index].id,
                            concernDescription: concerns[index].description,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Failed to load concerns'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.read(concernListProvider(jobId).notifier).refresh(),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ConcernCard extends StatelessWidget {

  const _ConcernCard({required this.concern, required this.onTap});
  final Concern concern;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final isInspected = concern.findingStatus != null;
    final statusColor = isInspected ? AppColors.success : AppColors.textMuted;
    final statusLabel = isInspected ? 'Inspected' : 'Not inspected';

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(shape: BoxShape.circle, color: statusColor),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      concern.description,
                      style: Theme.of(context).textTheme.bodyMedium,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (concern.category != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        concern.category!,
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(color: AppColors.textMuted),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Text(
                statusLabel,
                style: Theme.of(context).textTheme.labelSmall?.copyWith(color: statusColor),
              ),
              const Icon(Icons.chevron_right, color: AppColors.textMuted),
            ],
          ),
        ),
      ),
    );
  }
}