import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:prioraflow_tech/core/theme/app_colors.dart';
import 'package:prioraflow_tech/core/utils/date_utils.dart' as app_date;
import 'package:prioraflow_tech/features/jobs/data/models/job.dart';
import 'package:prioraflow_tech/features/jobs/data/models/job_status.dart';
import 'package:prioraflow_tech/features/jobs/presentation/job_detail_provider.dart';
import 'package:prioraflow_tech/features/inspection/presentation/concern_list_screen.dart';

class JobDetailScreen extends ConsumerWidget {
  final String jobId;

  const JobDetailScreen({super.key, required this.jobId});

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
                _PhaseProgress(status: job.status),
                const SizedBox(height: 16),
                _JobInfoCard(job: job),
                const SizedBox(height: 16),
                _ActionButtons(jobId: jobId, job: job),
              ],
            ),
          ),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Failed to load job'),
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
  final Job job;

  const _VehicleHeader({required this.job});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.directions_car, color: AppColors.primary, size: 28),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        job.vehicle?.displayName ?? 'Unknown Vehicle',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w700,
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
                if (job.customer?.name != null)
                  Row(
                    children: [
                      Icon(Icons.person_outline, size: 16, color: AppColors.textMuted),
                      const SizedBox(width: 4),
                      Text(job.customer!.name!, style: Theme.of(context).textTheme.bodySmall),
                    ],
                  ),
              ],
            ),
            if (job.customerConcern != null) ...[
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.surfaceLight,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  job.customerConcern!,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _PhaseProgress extends StatelessWidget {
  final JobStatus status;

  const _PhaseProgress({required this.status});

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

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Progress', style: Theme.of(context).textTheme.titleSmall),
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
                          color: isComplete ? AppColors.primary : AppColors.border,
                          border: isCurrent ? Border.all(color: AppColors.primaryLight, width: 2) : null,
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
                              color: isComplete ? AppColors.textPrimary : AppColors.textMuted,
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
  final Job job;

  const _JobInfoCard({required this.job});

  @override
  Widget build(BuildContext context) {
    final countdown = app_date.AppDateUtils.countdown(job.promisedAt);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Details', style: Theme.of(context).textTheme.titleSmall),
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
  final IconData icon;
  final String label;
  final String value;
  final Color? valueColor;

  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
    this.valueColor,
  });

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
                    color: valueColor ?? AppColors.textPrimary,
                  ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}

class _ActionButtons extends ConsumerWidget {
  final String jobId;
  final Job job;

  const _ActionButtons({required this.jobId, required this.job});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifier = ref.read(jobDetailProvider(jobId).notifier);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (job.status == JobStatus.booked)
          ElevatedButton(
            onPressed: () => notifier.transitionStatus(JobStatus.checking),
            child: const Text('Start Inspection'),
          ),
        if (job.status == JobStatus.checking)
          ElevatedButton(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => ConcernListScreen(jobId: jobId),
              ),
            ),
            child: const Text('View Concerns'),
          ),
        if (job.status == JobStatus.approved)
          ElevatedButton(
            onPressed: () => notifier.transitionStatus(JobStatus.inProgress),
            child: const Text('Start Work'),
          ),
        if (job.status == JobStatus.inProgress)
          ElevatedButton(
            onPressed: () => notifier.transitionStatus(JobStatus.qualityCheck),
            child: const Text('Hand to QC'),
          ),
        if (job.status == JobStatus.qualityCheck)
          ElevatedButton(
            onPressed: () => notifier.transitionStatus(JobStatus.ready),
            child: const Text('Mark Ready'),
          ),
        const SizedBox(height: 8),
        OutlinedButton(
          onPressed: () => ref.read(jobDetailProvider(jobId).notifier).refresh(),
          child: const Text('Refresh'),
        ),
      ],
    );
  }
}