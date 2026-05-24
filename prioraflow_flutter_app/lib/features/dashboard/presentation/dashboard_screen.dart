import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:prioraflow_tech/core/theme/app_colors.dart';
import 'package:prioraflow_tech/features/jobs/data/models/job.dart';
import 'package:prioraflow_tech/features/jobs/data/models/job_status.dart';
import 'package:prioraflow_tech/features/jobs/presentation/job_list_provider.dart';

/// Dashboard tab showing KPIs and today's activity summary.
class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final jobsAsync = ref.watch(jobListProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Dashboard')),
      body: jobsAsync.when(
        data: (jobs) {
          final byStatus = <JobStatus, int>{};
          for (final job in jobs) {
            byStatus[job.status] = (byStatus[job.status] ?? 0) + 1;
          }

          final overdue = jobs.where((j) {
            if (j.promisedAt == null) return false;
            return j.promisedAt!.isBefore(DateTime.now()) &&
                j.status != JobStatus.closed &&
                j.status != JobStatus.noShow;
          }).toList();

          final idle = jobs.where((j) => _isIdle(j)).toList();
          final totalActive = jobs.length;

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(jobListProvider),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Summary row
                Row(
                  children: [
                    _StatCard(
                      label: 'Active',
                      value: totalActive.toString(),
                      icon: Icons.assignment,
                      color: AppColors.primary,
                    ),
                    const SizedBox(width: 12),
                    _StatCard(
                      label: 'Overdue',
                      value: overdue.length.toString(),
                      icon: Icons.warning_amber,
                      color: overdue.isNotEmpty ? AppColors.danger : AppColors.textMuted,
                    ),
                    const SizedBox(width: 12),
                    _StatCard(
                      label: 'Idle',
                      value: idle.length.toString(),
                      icon: Icons.schedule,
                      color: idle.isNotEmpty ? AppColors.warning : AppColors.textMuted,
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Status breakdown
                Text(
                  'BY STATUS',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.15,
                    color: AppColors.textMuted,
                  ),
                ),
                const SizedBox(height: 8),
                ...JobStatus.values
                    .where((s) => !s.isHidden)
                    .map((status) {
                  final count = byStatus[status] ?? 0;
                  return _StatusRow(
                    status: status,
                    count: count,
                    onTap: count > 0
                        ? () {
                            ref.read(jobListProvider.notifier).filterByStatus(status.apiValue);
                            // Switch to Jobs tab
                            context.go('/');
                          }
                        : null,
                  );
                }),

                // Overdue section
                if (overdue.isNotEmpty) ...[
                  const SizedBox(height: 20),
                  Text(
                    'OVERDUE',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.15,
                      color: AppColors.danger,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ...overdue.map((job) => _OverdueCard(job: job)),
                ],

                // Idle section
                if (idle.isNotEmpty) ...[
                  const SizedBox(height: 20),
                  Text(
                    'IDLE (>24h)',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.15,
                      color: AppColors.warning,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ...idle.map((job) => _IdleCard(job: job)),
                ],
              ],
            ),
          );
        },
        loading: () => const Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Failed to load dashboard',
                  style: TextStyle(color: AppColors.danger)),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.invalidate(jobListProvider),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  bool _isIdle(Job job) {
    if (job.updatedAt == null) return false;
    if (job.status == JobStatus.closed || job.status == JobStatus.noShow) return false;
    final idleDuration = DateTime.now().difference(job.updatedAt!);
    return idleDuration.inHours > 24;
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.foreground.withOpacity(0.1)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 8),
            Text(value,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: color,
                    )),
            const SizedBox(height: 2),
            Text(label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textMuted,
                )),
          ],
        ),
      ),
    );
  }
}

class _StatusRow extends StatelessWidget {
  const _StatusRow({required this.status, required this.count, this.onTap});
  final JobStatus status;
  final int count;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Material(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(10),
        child: InkWell(
          borderRadius: BorderRadius.circular(10),
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.foreground.withOpacity(0.1)),
            ),
            child: Row(
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(shape: BoxShape.circle, color: status.color),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(status.label,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: AppColors.foreground,
                      )),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                  decoration: BoxDecoration(
                    color: status.color.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text('$count',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: status.color,
                      )),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _OverdueCard extends StatelessWidget {
  const _OverdueCard({required this.job});
  final Job job;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.danger.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.danger.withValues(alpha: 0.2)),
        ),
        child: Row(
          children: [
            Icon(Icons.warning_amber, color: AppColors.danger, size: 18),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(job.displayTitle,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                          )),
                  Text('${job.status.label} · Promised: ${_formatDate(job.promisedAt)}',
                      style: TextStyle(fontSize: 11, color: AppColors.danger)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime? d) {
    if (d == null) return '—';
    return '${d.month}/${d.day} ${d.hour}:${d.minute.toString().padLeft(2, '0')}';
  }
}

class _IdleCard extends StatelessWidget {
  const _IdleCard({required this.job});
  final Job job;

  @override
  Widget build(BuildContext context) {
    final hours = job.updatedAt != null
        ? DateTime.now().difference(job.updatedAt!).inHours
        : 0;
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.warning.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.warning.withValues(alpha: 0.2)),
        ),
        child: Row(
          children: [
            Icon(Icons.schedule, color: AppColors.warning, size: 18),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(job.displayTitle,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                          )),
                  Text('${job.status.label} · Idle ${hours}h',
                      style: TextStyle(fontSize: 11, color: AppColors.warning)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}