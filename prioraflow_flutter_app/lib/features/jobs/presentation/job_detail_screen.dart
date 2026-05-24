import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:prioraflow_tech/core/theme/app_colors.dart';
import 'package:prioraflow_tech/core/utils/date_utils.dart' as app_date;
import 'package:prioraflow_tech/features/jobs/data/models/job.dart';
import 'package:prioraflow_tech/features/jobs/data/models/job_status.dart';
import 'package:prioraflow_tech/features/jobs/presentation/job_detail_provider.dart';
import 'package:prioraflow_tech/features/inspection/presentation/concern_list_screen.dart';

class JobDetailScreen extends ConsumerWidget {

  const JobDetailScreen({required this.jobId, super.key});
  final String jobId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final jobAsync = ref.watch(jobDetailProvider(jobId));

    return Scaffold(
      appBar: AppBar(title: const Text('Job Detail')),
      body: jobAsync.when(
        data: (job) => RefreshIndicator(
          onRefresh: () => ref.read(jobDetailProvider(jobId).notifier).refresh(),
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _VehicleHeader(job: job),
                const SizedBox(height: 16),
                if (job.concerns.isNotEmpty || (job.customerConcern != null && job.customerConcern!.isNotEmpty))
                  _CheckinSummaryCard(job: job),
                if (job.concerns.isNotEmpty || (job.customerConcern != null && job.customerConcern!.isNotEmpty))
                  const SizedBox(height: 16),
                _PhaseProgress(status: job.status),
                const SizedBox(height: 16),
                _JobInfoCard(job: job),
                const SizedBox(height: 16),
                _ActionButtons(jobId: jobId, job: job),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: () => context.push('/jobs/$jobId/parts'),
                  icon: const Icon(Icons.inventory_2_outlined, size: 18),
                  label: const Text('View Parts Status'),
                ),
              ],
            ),
          ),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Failed to load job'),
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

class _VehicleHeader extends StatelessWidget {

  const _VehicleHeader({required this.job});
  final Job job;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.foreground.withOpacity(0.1)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
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
                  child: Icon(Icons.directions_car, color: AppColors.primary, size: 24),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (job.jobNumber != null)
                        Text(
                          job.jobNumber!,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.08,
                            color: AppColors.textMuted,
                          ),
                        ),
                      Text(
                        job.vehicle?.displayName ?? 'Unknown Vehicle',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                      ),
                      if (job.vehicle?.plateNumber != null)
                        Text(
                          job.vehicle!.plateNumber!,
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: AppColors.textMuted,
                              ),
                        ),
                    ],
                  ),
                ),
                _StatusPill(status: job.status),
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
                  border: Border.all(color: AppColors.foreground.withOpacity(0.08)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.record_voice_over, size: 16, color: AppColors.statusChecking),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        job.customerConcern!,
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _StatusPill extends StatelessWidget {

  const _StatusPill({required this.status});
  final JobStatus status;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: status.bgColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: status.color.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: status.color,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            status.label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: status.color,
            ),
          ),
        ],
      ),
    );
  }
}

class _PhaseProgress extends StatelessWidget {

  const _PhaseProgress({required this.status});
  final JobStatus status;

  static const _phases = [
    ('Received', Icons.inbox),
    ('Checked In', Icons.fact_check_outlined),
    ('Inspection', Icons.search),
    ('Approval', Icons.thumb_up_outlined),
    ('In Progress', Icons.build_outlined),
    ('Completed', Icons.check_circle_outline),
  ];

  @override
  Widget build(BuildContext context) {
    final currentIndex = status.phaseIndex;

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.foreground.withOpacity(0.1)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'PROGRESS',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.15,
                color: AppColors.textMuted,
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: List.generate(_phases.length, (i) {
                final isComplete = i <= currentIndex;
                final isCurrent = i == currentIndex;
                return Expanded(
                  child: Column(
                    children: [
                      Container(
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: isComplete ? status.color : AppColors.muted,
                          border: isCurrent ? Border.all(color: status.color.withOpacity(0.5), width: 3) : null,
                        ),
                        child: Icon(
                          isComplete ? Icons.check : _phases[i].$2,
                          size: 14,
                          color: isComplete ? Colors.white : AppColors.textMuted,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _phases[i].$1,
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                              color: isComplete ? AppColors.foreground : AppColors.textMuted,
                              fontWeight: isCurrent ? FontWeight.w700 : null,
                            ),
                      ),
                    ],
                  ),
                );
              }),
            ),
          ],
        ),
      ),
    );
  }
}

class _JobInfoCard extends StatelessWidget {

  const _JobInfoCard({required this.job});
  final Job job;

  @override
  Widget build(BuildContext context) {
    final countdown = app_date.AppDateUtils.countdown(job.promisedAt);

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.foreground.withOpacity(0.1)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'DETAILS',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.15,
                color: AppColors.textMuted,
              ),
            ),
            const SizedBox(height: 12),
            if (job.promisedAt != null)
              _InfoRow(
                icon: Icons.schedule,
                label: 'Promise Time',
                value: countdown ?? app_date.AppDateUtils.formatDateTime(job.promisedAt),
                valueColor: countdown == 'Overdue' ? AppColors.danger : null,
              ),
            if (job.vehicle?.vin != null)
              _InfoRow(icon: Icons.confirmation_number, label: 'VIN', value: job.vehicle!.vin!),
            if (job.odometerIn != null)
              _InfoRow(icon: Icons.speed, label: 'Odometer', value: '${job.odometerIn} km'),
            if (job.technician?.name != null)
              _InfoRow(icon: Icons.person, label: 'Technician', value: job.technician!.name!),
            if (job.advisor?.name != null)
              _InfoRow(icon: Icons.support_agent, label: 'Advisor', value: job.advisor!.name!),
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {

  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
    this.valueColor,
  });
  final IconData icon;
  final String label;
  final String value;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(icon, size: 16, color: AppColors.textMuted),
          const SizedBox(width: 8),
          Text(label, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.textMuted)),
          const Spacer(),
          Flexible(
            child: Text(
              value,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: valueColor ?? AppColors.foreground,
                  ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}

class _CheckinSummaryCard extends StatelessWidget {
  const _CheckinSummaryCard({required this.job});
  final Job job;

  @override
  Widget build(BuildContext context) {
    final advisorCount = job.advisorConcerns.length;
    final inspectionCount = job.inspectionConcerns.length;
    final hasCustomerConcern =
        job.customerConcern != null && job.customerConcern!.isNotEmpty;

    return Container(
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
          onTap: () => Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => ConcernListScreen(jobId: job.id)),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.assignment_outlined, size: 18, color: AppColors.statusChecking),
                    const SizedBox(width: 8),
                    Text(
                      'CHECK-IN REPORT',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.15,
                        color: AppColors.statusChecking,
                      ),
                    ),
                    const Spacer(),
                    Icon(Icons.chevron_right, color: AppColors.textMuted),
                  ],
                ),
                if (hasCustomerConcern) ...[
                  const SizedBox(height: 12),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.statusChecking.withOpacity(0.08),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.statusChecking.withOpacity(0.2)),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(Icons.record_voice_over, size: 16, color: AppColors.statusChecking),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(job.customerConcern!,
                              style: Theme.of(context).textTheme.bodyMedium),
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 12),
                Row(
                  children: [
                    if (advisorCount > 0) ...[
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.statusChecking.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: AppColors.statusChecking.withOpacity(0.3)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.support_agent, size: 14, color: AppColors.statusChecking),
                            const SizedBox(width: 4),
                            Text(
                              '$advisorCount advisor note${advisorCount > 1 ? 's' : ''}',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: AppColors.statusChecking,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    if (advisorCount > 0 && inspectionCount > 0)
                      const SizedBox(width: 8),
                    if (inspectionCount > 0) ...[
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.statusApproved.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: AppColors.statusApproved.withOpacity(0.3)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.search, size: 14, color: AppColors.statusApproved),
                            const SizedBox(width: 4),
                            Text(
                              '$inspectionCount finding${inspectionCount > 1 ? 's' : ''}',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: AppColors.statusApproved,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ActionButtons extends ConsumerWidget {

  const _ActionButtons({required this.jobId, required this.job});
  final String jobId;
  final Job job;

  // Concerns are viewable for all statuses except booked, closed, and no-show
  bool get _canViewConcerns => job.status != JobStatus.booked &&
      job.status != JobStatus.closed &&
      job.status != JobStatus.noShow;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifier = ref.read(jobDetailProvider(jobId).notifier);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Primary action per status
        switch (job.status) {
          JobStatus.booked => _PrimaryButton(
              label: 'Start Inspection',
              onPressed: () => notifier.transitionStatus(JobStatus.checking)),
          JobStatus.checking => _PrimaryButton(
              label: 'Mark Approved',
              onPressed: () => notifier.transitionStatus(JobStatus.approved)),
          JobStatus.estimateSent => _PrimaryButton(
              label: 'Mark Approved',
              onPressed: () => notifier.transitionStatus(JobStatus.approved)),
          JobStatus.approved => _PrimaryButton(
              label: 'Start Work',
              onPressed: () => notifier.transitionStatus(JobStatus.inProgress)),
          JobStatus.inProgress => _PrimaryButton(
              label: 'Hand to QC',
              onPressed: () => notifier.transitionStatus(JobStatus.qualityCheck)),
          JobStatus.waitingParts => _PrimaryButton(
              label: 'Resume Work',
              onPressed: () => notifier.transitionStatus(JobStatus.inProgress)),
          JobStatus.qualityCheck => _PrimaryButton(
              label: 'Mark Ready',
              onPressed: () => notifier.transitionStatus(JobStatus.ready)),
          JobStatus.ready => _PrimaryButton(
              label: 'Close Job',
              onPressed: () => notifier.transitionStatus(JobStatus.closed)),
          JobStatus.closed || JobStatus.noShow => const SizedBox.shrink(),
        },
        const SizedBox(height: 8),

        // View Concerns button (always visible for active jobs)
        if (_canViewConcerns) ...[
          ElevatedButton(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => ConcernListScreen(jobId: jobId),
              ),
            ),
            child: const Text('View Concerns'),
          ),
          const SizedBox(height: 8),
        ],

        // Secondary actions
        if (job.status == JobStatus.booked) ...[
          OutlinedButton(
            onPressed: () => notifier.transitionStatus(JobStatus.noShow),
            style: OutlinedButton.styleFrom(foregroundColor: AppColors.statusChecking),
            child: const Text('No Show'),
          ),
          const SizedBox(height: 8),
        ],
        if (job.status == JobStatus.inProgress) ...[
          OutlinedButton(
            onPressed: () => notifier.transitionStatus(JobStatus.waitingParts),
            child: const Text('Waiting Parts'),
          ),
          const SizedBox(height: 8),
        ],
        if (job.status == JobStatus.qualityCheck) ...[
          OutlinedButton(
            onPressed: () => notifier.transitionStatus(JobStatus.inProgress),
            child: const Text('Reopen'),
          ),
          const SizedBox(height: 8),
        ],
        if (job.status == JobStatus.checking) ...[
          OutlinedButton(
            onPressed: () => notifier.transitionStatus(JobStatus.estimateSent),
            child: const Text('Send Estimate'),
          ),
          const SizedBox(height: 8),
        ],

        // Cancel/close for active jobs (not booked/closed/no-show, those have their own flow)
        if (job.status != JobStatus.booked &&
            job.status != JobStatus.closed &&
            job.status != JobStatus.noShow) ...[
          OutlinedButton(
            onPressed: () => _confirmClose(context, notifier),
            style: OutlinedButton.styleFrom(foregroundColor: AppColors.danger),
            child: const Text('Close Job'),
          ),
          const SizedBox(height: 8),
        ],

        // Refresh
        OutlinedButton(
          onPressed: () => ref.read(jobDetailProvider(jobId).notifier).refresh(),
          child: const Text('Refresh'),
        ),
      ],
    );
  }

  void _confirmClose(BuildContext context, dynamic notifier) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Close Job?'),
        content: const Text('This will close the job. This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              notifier.transitionStatus(JobStatus.closed);
            },
            style: TextButton.styleFrom(foregroundColor: AppColors.danger),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }
}

class _PrimaryButton extends StatelessWidget {
  const _PrimaryButton({required this.label, required this.onPressed});
  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: onPressed,
      child: Text(label),
    );
  }
}