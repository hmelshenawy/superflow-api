import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:prioraflow_tech/core/auth/role_guards.dart';
import 'package:prioraflow_tech/core/errors/error_handler.dart';
import 'package:prioraflow_tech/core/theme/app_colors.dart';
import 'package:prioraflow_tech/core/theme/snackbar.dart';
import 'package:prioraflow_tech/core/utils/date_utils.dart' as app_date;
import 'package:prioraflow_tech/core/utils/haptic.dart';
import 'package:prioraflow_tech/features/jobs/data/models/job.dart';
import 'package:prioraflow_tech/features/jobs/data/models/job_status.dart';
import 'package:prioraflow_tech/features/jobs/presentation/job_detail_provider.dart';
import 'package:prioraflow_tech/features/inspection/data/models/inspection.dart';
import 'package:shimmer/shimmer.dart';

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
                _InspectionPhaseCard(job: job),
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
                const SizedBox(height: 8),
                if (job.customer != null)
                  OutlinedButton.icon(
                    onPressed: () => context.push('/jobs/$jobId/customer', extra: {
                      'customer': job.customer!,
                      'vehicle': job.vehicle,
                    }),
                    icon: const Icon(Icons.person_outline, size: 18),
                    label: const Text('Customer Details'),
                  ),
                if (job.status == JobStatus.estimateSent) ...[
                  const SizedBox(height: 8),
                  ElevatedButton.icon(
                    onPressed: () => context.push('/jobs/$jobId/estimate'),
                    icon: const Icon(Icons.request_quote_outlined, size: 18),
                    label: const Text('View Estimate'),
                  ),
                ],
              ],
            ),
          ),
        ),
        loading: () => Shimmer.fromColors(
          baseColor: AppColors.surfaceLight,
          highlightColor: AppColors.border,
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(height: 80, decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(16))),
                const SizedBox(height: 16),
                Container(height: 120, decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(16))),
                const SizedBox(height: 16),
                Container(height: 60, decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(16))),
                const SizedBox(height: 16),
                Container(height: 150, decoration: BoxDecoration(color: AppColors.surface, borderRadius: BorderRadius.circular(16))),
              ],
            ),
          ),
        ),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(handleError(e).message, style: Theme.of(context).textTheme.bodyLarge),
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

class _InspectionPhaseCard extends StatelessWidget {
  const _InspectionPhaseCard({required this.job});
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
            Text(
              'INSPECTIONS',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.15,
                color: AppColors.textMuted,
              ),
            ),
            const SizedBox(height: 12),
            _PhaseRow(
              icon: Icons.assignment_outlined,
              label: 'Reception DVI',
              statusLabel: _dviStatusLabel(job),
              statusColor: _dviStatusColor(job),
              onTap: _canStartDvi(job) || job.inspection != null
                  ? () => _navigateToDvi(context, job)
                  : null,
            ),
            const SizedBox(height: 8),
            _PhaseRow(
              icon: Icons.search,
              label: 'Tech Findings',
              statusLabel: _findingsStatusLabel(job),
              statusColor: _findingsStatusColor(job),
              onTap: _canViewConcerns(job)
                  ? () => context.push('/jobs/${job.id}/concerns')
                  : null,
            ),
            const SizedBox(height: 8),
            _PhaseRow(
              icon: Icons.verified_user_outlined,
              label: 'QC Checklist',
              statusLabel: _qcStatusLabel(job),
              statusColor: _qcStatusColor(job),
              onTap: _canStartQc(job) || job.qcChecklist != null
                  ? () => _navigateToQc(context, job)
                  : null,
            ),
          ],
        ),
      ),
    );
  }

  bool _canStartDvi(Job job) =>
      job.status == JobStatus.booked || job.status == JobStatus.checking;

  bool _canViewConcerns(Job job) =>
      job.status != JobStatus.booked &&
      job.status != JobStatus.closed &&
      job.status != JobStatus.noShow;

  bool _canStartQc(Job job) => job.status == JobStatus.qualityCheck;

  String _dviStatusLabel(Job job) {
    if (job.inspection != null) {
      return job.inspection!.isLocked ? 'Completed' : 'In Progress';
    }
    return _canStartDvi(job) ? 'Start' : 'Not available';
  }

  Color _dviStatusColor(Job job) {
    if (job.inspection != null) {
      return job.inspection!.isLocked ? AppColors.success : AppColors.statusChecking;
    }
    return _canStartDvi(job) ? AppColors.primary : AppColors.textMuted;
  }

  String _findingsStatusLabel(Job job) {
    if (!_canViewConcerns(job)) return 'Not available';
    final count = job.inspectionConcerns.length;
    return count > 0 ? '$count finding${count > 1 ? 's' : ''}' : 'View';
  }

  Color _findingsStatusColor(Job job) {
    if (!_canViewConcerns(job)) return AppColors.textMuted;
    return AppColors.primary;
  }

  String _qcStatusLabel(Job job) {
    if (job.qcChecklist != null) {
      return job.qcChecklist!.status == 'submitted' ||
              job.qcChecklist!.status == 'approved'
          ? 'Completed'
          : 'In Progress';
    }
    return _canStartQc(job) ? 'Start' : 'Not available';
  }

  Color _qcStatusColor(Job job) {
    if (job.qcChecklist != null) {
      final s = job.qcChecklist!.status;
      return s == 'submitted' || s == 'approved'
          ? AppColors.success
          : AppColors.statusChecking;
    }
    return _canStartQc(job) ? AppColors.primary : AppColors.textMuted;
  }

  void _navigateToDvi(BuildContext context, Job job) {
    if (job.inspection != null) {
      context.push('/jobs/${job.id}/inspection/${job.inspection!.id}');
    } else {
      context.push('/jobs/${job.id}/inspection/new');
    }
  }

  void _navigateToQc(BuildContext context, Job job) {
    if (job.qcChecklist != null) {
      context.push('/jobs/${job.id}/qc-checklist/${job.qcChecklist!.id}');
    } else {
      context.push('/jobs/${job.id}/qc-checklist/new');
    }
  }
}

class _PhaseRow extends StatelessWidget {
  const _PhaseRow({
    required this.icon,
    required this.label,
    required this.statusLabel,
    required this.statusColor,
    this.onTap,
  });

  final IconData icon;
  final String label;
  final String statusLabel;
  final Color statusColor;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surfaceLight,
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AppColors.border),
          ),
          child: Row(
            children: [
              Icon(icon, size: 18, color: statusColor),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.foreground,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: statusColor.withOpacity(0.3)),
                ),
                child: Text(
                  statusLabel,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: statusColor,
                  ),
                ),
              ),
              if (onTap != null) ...[
                const SizedBox(width: 4),
                Icon(Icons.chevron_right, size: 16, color: AppColors.textMuted),
              ],
            ],
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

  Future<void> _transition(
    BuildContext context,
    WidgetRef ref,
    JobStatus newStatus, {
    String? successMessage,
  }) async {
    final notifier = ref.read(jobDetailProvider(jobId).notifier);
    final success = await notifier.transitionStatus(newStatus);
    if (success) hapticMedium();
    if (context.mounted) {
      if (success) {
        showSuccessSnackBar(context, successMessage ?? 'Status updated');
      } else {
        showErrorSnackBar(context, 'Failed to update status. Please try again.');
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifier = ref.read(jobDetailProvider(jobId).notifier);
    final isAdmin = ref.watch(isAdminProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Primary action per status
        switch (job.status) {
          JobStatus.booked => _PrimaryButton(
              label: 'Start Inspection',
              onPressed: () => context.push('/jobs/$jobId/inspection/new')),
          JobStatus.checking => _PrimaryButton(
              label: 'Mark Approved',
              onPressed: isAdmin ? () => _transition(context, ref, JobStatus.approved, successMessage: 'Job approved') : null),
          JobStatus.estimateSent => _PrimaryButton(
              label: 'Mark Approved',
              onPressed: isAdmin ? () => _transition(context, ref, JobStatus.approved, successMessage: 'Job approved') : null),
          JobStatus.approved => _PrimaryButton(
              label: 'Start Work',
              onPressed: () => _transition(context, ref, JobStatus.inProgress, successMessage: 'Work started')),
          JobStatus.inProgress => _PrimaryButton(
              label: 'Hand to QC',
              onPressed: () async {
                final success = await notifier.transitionStatus(JobStatus.qualityCheck);
                if (success) hapticMedium();
                if (context.mounted) {
                  if (success) {
                    showSuccessSnackBar(context, 'Moved to QC');
                  } else {
                    showErrorSnackBar(context, 'Failed to update status');
                  }
                  if (success) context.push('/jobs/$jobId/qc-checklist/new');
                }
              }),
          JobStatus.waitingParts => _PrimaryButton(
              label: 'Resume Work',
              onPressed: () => _transition(context, ref, JobStatus.inProgress, successMessage: 'Work resumed')),
          JobStatus.qualityCheck => _PrimaryButton(
              label: 'Mark Ready',
              onPressed: () => _transition(context, ref, JobStatus.ready, successMessage: 'Marked as ready')),
          JobStatus.ready => _PrimaryButton(
              label: 'Close Job',
              onPressed: isAdmin ? () => _transition(context, ref, JobStatus.closed, successMessage: 'Job closed') : null),
          JobStatus.closed || JobStatus.noShow => const SizedBox.shrink(),
        },
        const SizedBox(height: 8),

        // View Concerns button (always visible for active jobs)
        if (_canViewConcerns) ...[
          ElevatedButton(
            onPressed: () => context.push('/jobs/$jobId/concerns'),
            child: const Text('View Concerns'),
          ),
          const SizedBox(height: 8),
        ],

        // Secondary actions
        if (job.status == JobStatus.booked && isAdmin) ...[
          OutlinedButton(
            onPressed: () => _transition(context, ref, JobStatus.noShow, successMessage: 'Marked as no-show'),
            style: OutlinedButton.styleFrom(foregroundColor: AppColors.statusChecking),
            child: const Text('No Show'),
          ),
          const SizedBox(height: 8),
        ],
        if (job.status == JobStatus.inProgress) ...[
          OutlinedButton(
            onPressed: () => _transition(context, ref, JobStatus.waitingParts, successMessage: 'Marked as waiting parts'),
            child: const Text('Waiting Parts'),
          ),
          const SizedBox(height: 8),
        ],
        if (job.status == JobStatus.qualityCheck) ...[
          OutlinedButton(
            onPressed: () => _transition(context, ref, JobStatus.inProgress, successMessage: 'Job reopened'),
            child: const Text('Reopen'),
          ),
          const SizedBox(height: 8),
        ],
        if (job.status == JobStatus.checking && isAdmin) ...[
          OutlinedButton(
            onPressed: () => _transition(context, ref, JobStatus.estimateSent, successMessage: 'Estimate sent'),
            child: const Text('Send Estimate'),
          ),
          const SizedBox(height: 8),
        ],

        // Cancel/close for active jobs (admin only)
        if (isAdmin && job.status != JobStatus.booked &&
            job.status != JobStatus.closed &&
            job.status != JobStatus.noShow) ...[
          OutlinedButton(
            onPressed: () => _confirmClose(context, ref),
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

  void _confirmClose(BuildContext context, WidgetRef ref) {
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
              _transition(context, ref, JobStatus.closed, successMessage: 'Job closed');
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
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: onPressed,
      child: Text(label),
    );
  }
}