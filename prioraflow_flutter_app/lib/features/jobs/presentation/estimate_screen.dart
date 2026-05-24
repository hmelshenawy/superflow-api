import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:prioraflow_tech/core/theme/app_colors.dart';
import 'package:prioraflow_tech/core/theme/snackbar.dart';
import 'package:prioraflow_tech/core/utils/haptic.dart';
import 'package:prioraflow_tech/features/jobs/data/models/job.dart';
import 'package:prioraflow_tech/features/jobs/data/models/job_status.dart';
import 'package:prioraflow_tech/features/jobs/presentation/job_detail_provider.dart';

/// Screen for jobs in estimateSent status — shows estimate details and
/// approve/reject actions.
class EstimateScreen extends ConsumerWidget {
  const EstimateScreen({required this.jobId, super.key});
  final String jobId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final jobAsync = ref.watch(jobDetailProvider(jobId));

    return Scaffold(
      appBar: AppBar(title: const Text('Estimate')),
      body: jobAsync.when(
        data: (job) => RefreshIndicator(
          onRefresh: () => ref.read(jobDetailProvider(jobId).notifier).refresh(),
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Vehicle & status header
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.foreground.withOpacity(0.1)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: AppColors.muted,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(Icons.request_quote_outlined,
                                color: AppColors.statusEstimateSent, size: 24),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  job.vehicle?.displayName ?? job.displayTitle,
                                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                        fontWeight: FontWeight.w600,
                                      ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Estimate Sent · Awaiting Approval',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: AppColors.statusEstimateSent,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      if (job.customerConcern != null) ...[
                        const SizedBox(height: 12),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppColors.muted,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Icon(Icons.record_voice_over,
                                  size: 16, color: AppColors.statusChecking),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(job.customerConcern!,
                                    style: Theme.of(context).textTheme.bodyMedium),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Concerns summary
                if (job.inspectionConcerns.isNotEmpty) ...[
                  Text(
                    'INSPECTION FINDINGS',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.15,
                      color: AppColors.textMuted,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ...job.inspectionConcerns.map((c) => Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.foreground.withOpacity(0.1)),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: c.status == 'critical' ? AppColors.danger
                                  : c.status == 'needs_attention' ? AppColors.warning
                                  : AppColors.success,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(c.displayTitle,
                                style: Theme.of(context).textTheme.bodyMedium),
                          ),
                        ],
                      ),
                    ),
                  )),
                  const SizedBox(height: 20),
                ],

                // Actions
                Text(
                  'ACTIONS',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.15,
                    color: AppColors.textMuted,
                  ),
                ),
                const SizedBox(height: 8),
                ElevatedButton(
                  onPressed: () async {
                    hapticMedium();
                    final notifier = ref.read(jobDetailProvider(jobId).notifier);
                    final success = await notifier.transitionStatus(JobStatus.approved);
                    if (context.mounted) {
                      if (success) {
                        showSuccessSnackBar(context, 'Estimate approved');
                        context.pop();
                      } else {
                        showErrorSnackBar(context, 'Failed to approve estimate');
                      }
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.success,
                    foregroundColor: Colors.white,
                    minimumSize: const Size(double.infinity, 48),
                  ),
                  child: const Text('Approve Estimate'),
                ),
                const SizedBox(height: 12),
                OutlinedButton(
                  onPressed: () async {
                    hapticLight();
                    final notifier = ref.read(jobDetailProvider(jobId).notifier);
                    final confirm = await showDialog<bool>(
                      context: context,
                      builder: (ctx) => AlertDialog(
                        title: const Text('Reject Estimate?'),
                        content: const Text(
                            'The job will return to checking for revision.'),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(ctx, false),
                            child: const Text('Cancel'),
                          ),
                          TextButton(
                            onPressed: () => Navigator.pop(ctx, true),
                            style: TextButton.styleFrom(
                                foregroundColor: AppColors.danger),
                            child: const Text('Reject'),
                          ),
                        ],
                      ),
                    );
                    if (confirm != true) return;
                    final success = await notifier.transitionStatus(JobStatus.checking);
                    if (context.mounted) {
                      if (success) {
                        showSuccessSnackBar(context, 'Estimate returned for revision');
                        context.pop();
                      } else {
                        showErrorSnackBar(context, 'Failed to reject estimate');
                      }
                    }
                  },
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.danger,
                    minimumSize: const Size(double.infinity, 48),
                  ),
                  child: const Text('Reject / Needs Revision'),
                ),
              ],
            ),
          ),
        ),
        loading: () => const Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Failed to load estimate',
                  style: TextStyle(color: AppColors.danger)),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.read(jobDetailProvider(jobId).notifier).refresh(),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}