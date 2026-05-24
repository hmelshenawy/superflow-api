import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:prioraflow_tech/core/theme/app_colors.dart';
import 'package:prioraflow_tech/features/inspection/data/models/concern.dart';
import 'package:prioraflow_tech/features/inspection/data/models/finding.dart';
import 'package:prioraflow_tech/features/jobs/presentation/job_detail_provider.dart';
import 'package:shimmer/shimmer.dart';

class ConcernListScreen extends ConsumerWidget {
  const ConcernListScreen({required this.jobId, super.key});
  final String jobId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final jobAsync = ref.watch(jobDetailProvider(jobId));

    return Scaffold(
      appBar: AppBar(title: const Text('Concerns')),
      body: jobAsync.when(
        data: (job) {
          final advisorConcerns = job.advisorConcerns;
          final inspectionConcerns = job.inspectionConcerns;
          final hasCustomerConcern =
              job.customerConcern != null && job.customerConcern!.isNotEmpty;
          final hasCheckinSection =
              hasCustomerConcern || advisorConcerns.isNotEmpty;
          final totalInspected =
              job.concerns.where((c) => c.hasFinding).length;

          if (job.concerns.isEmpty && !hasCustomerConcern) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.checklist_outlined,
                      size: 64, color: AppColors.textMuted),
                  const SizedBox(height: 16),
                  Text('No concerns logged',
                      style: Theme.of(context)
                          .textTheme
                          .titleMedium
                          ?.copyWith(color: AppColors.textMuted)),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () =>
                ref.read(jobDetailProvider(jobId).notifier).refresh(),
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              children: [
                // Progress counter
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(
                    '$totalInspected of ${job.concerns.length} inspected',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppColors.textMuted,
                    ),
                  ),
                ),

                // Check-in Notes section
                if (hasCheckinSection) ...[
                  _SectionHeader(
                    title: 'CHECK-IN NOTES',
                    icon: Icons.assignment_outlined,
                    color: AppColors.statusChecking,
                  ),
                  const SizedBox(height: 8),
                  if (hasCustomerConcern)
                    _CustomerConcernCard(text: job.customerConcern!),
                  ...advisorConcerns.map((c) => _ConcernCard(
                        concern: c,
                        sourceBadge: ConcernSource.advisor,
                        jobId: jobId,
                      )),
                  const SizedBox(height: 16),
                ],

                // Inspection Findings section
                if (inspectionConcerns.isNotEmpty) ...[
                  _SectionHeader(
                    title: 'INSPECTION FINDINGS',
                    icon: Icons.search,
                    color: AppColors.statusApproved,
                  ),
                  const SizedBox(height: 8),
                  ...inspectionConcerns.map((c) => _ConcernCard(
                        concern: c,
                        sourceBadge: ConcernSource.inspection,
                        jobId: jobId,
                      )),
                ] else ...[
                  _SectionHeader(
                    title: 'INSPECTION FINDINGS',
                    icon: Icons.search,
                    color: AppColors.statusApproved,
                  ),
                  const SizedBox(height: 8),
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Text(
                        'No inspection findings yet',
                        style: Theme.of(context)
                            .textTheme
                            .bodyMedium
                            ?.copyWith(color: AppColors.textMuted),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          );
        },
        loading: () => Shimmer.fromColors(
          baseColor: AppColors.surfaceLight,
          highlightColor: AppColors.border,
          child: ListView(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            children: List.generate(4, (_) => Container(
              height: 72,
              margin: const EdgeInsets.only(bottom: 8),
              decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(16)),
            )),
          ),
        ),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Failed to load concerns'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () =>
                    ref.read(jobDetailProvider(jobId).notifier).refresh(),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }

}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({
    required this.title,
    required this.icon,
    required this.color,
  });

  final String title;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 16, color: color),
        const SizedBox(width: 6),
        Text(title,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.15,
              color: color,
            )),
      ],
    );
  }
}

class _CustomerConcernCard extends StatelessWidget {
  const _CustomerConcernCard({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.statusChecking.withOpacity(0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.statusChecking.withOpacity(0.2)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.record_voice_over, size: 16, color: AppColors.statusChecking),
          const SizedBox(width: 8),
          Expanded(
            child: Text(text, style: Theme.of(context).textTheme.bodyMedium),
          ),
        ],
      ),
    );
  }
}

class _ConcernCard extends StatelessWidget {
  const _ConcernCard({
    required this.concern,
    required this.sourceBadge,
    required this.jobId,
  });

  final Concern concern;
  final ConcernSource sourceBadge;
  final String jobId;

  @override
  Widget build(BuildContext context) {
    final findingType = findingTypeFromConcernStatus(concern.status);
    final isInspected = concern.hasFinding;
    final mediaUrls = concern.mediaFiles
            ?.where((m) => m.url != null)
            .map((m) => m.url!)
            .toList() ??
        [];

    Color statusColor;
    String statusLabel;
    if (findingType != null) {
      statusColor = _typeColor(findingType);
      statusLabel = findingType.label;
    } else {
      statusColor = AppColors.textMuted;
      statusLabel = 'Not inspected';
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.foreground.withOpacity(0.1)),
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () {
            final params = <String, String>{
              'description': concern.displayTitle,
            };
            if (findingType != null) {
              params['initialType'] = findingType.statusName;
            }
            if (concern.technicianFinding != null && concern.technicianFinding!.isNotEmpty) {
              params['initialFinding'] = concern.technicianFinding!;
            }
            context.push(Uri(
              path: '/jobs/$jobId/concerns/${concern.id}/finding',
              queryParameters: params,
            ).toString());
          },
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration:
                      BoxDecoration(shape: BoxShape.circle, color: statusColor),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              concern.displayTitle,
                              style: Theme.of(context).textTheme.bodyMedium,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      if (concern.code != null) ...[
                        const SizedBox(height: 2),
                        Text(
                          concern.code!,
                          style: Theme.of(context)
                              .textTheme
                              .labelSmall
                              ?.copyWith(color: AppColors.textMuted),
                        ),
                      ],
                      if (mediaUrls.isNotEmpty) ...[
                        const SizedBox(height: 6),
                        GestureDetector(
                          onTap: () => context.push('/gallery', extra: {
                            'urls': mediaUrls,
                            'initialIndex': 0,
                          }),
                          child: Row(
                            children: [
                              Icon(Icons.photo_library, size: 14, color: AppColors.primary),
                              const SizedBox(width: 4),
                              Text(
                                '${mediaUrls.length} photo${mediaUrls.length > 1 ? 's' : ''}',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.primary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                _SourceBadgeWidget(source: sourceBadge),
                const SizedBox(width: 4),
                Text(
                  statusLabel,
                  style: Theme.of(context)
                      .textTheme
                      .labelSmall
                      ?.copyWith(color: statusColor),
                ),
                const Icon(Icons.chevron_right, color: AppColors.textMuted),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Color _typeColor(FindingType type) {
    switch (type) {
      case FindingType.ok:
        return AppColors.statusApproved;
      case FindingType.needsAttention:
        return AppColors.statusChecking;
      case FindingType.critical:
        return AppColors.danger;
      case FindingType.deferred:
        return AppColors.textMuted;
    }
  }
}

class _SourceBadgeWidget extends StatelessWidget {
  const _SourceBadgeWidget({required this.source});

  final ConcernSource source;

  @override
  Widget build(BuildContext context) {
    final color =
        source == ConcernSource.advisor ? AppColors.statusChecking : AppColors.statusApproved;
    final label =
        source == ConcernSource.advisor ? 'Advisor' : 'Inspection';
    final icon =
        source == ConcernSource.advisor ? Icons.support_agent : Icons.search;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 2),
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}