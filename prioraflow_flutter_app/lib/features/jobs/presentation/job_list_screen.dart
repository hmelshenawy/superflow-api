import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:prioraflow_tech/core/theme/app_colors.dart';
import 'package:prioraflow_tech/core/utils/date_utils.dart' as app_date;
import 'package:prioraflow_tech/core/utils/priority_utils.dart';
import 'package:prioraflow_tech/features/jobs/data/models/job.dart';
import 'package:prioraflow_tech/features/jobs/data/models/job_status.dart';
import 'package:prioraflow_tech/features/jobs/presentation/job_list_provider.dart';
import 'package:prioraflow_tech/features/jobs/presentation/job_detail_screen.dart';

final _searchDebounceProvider = StateProvider<String>((_) => '');

class JobListScreen extends ConsumerStatefulWidget {
  const JobListScreen({super.key});

  @override
  ConsumerState<JobListScreen> createState() => _JobListScreenState();
}

class _JobListScreenState extends ConsumerState<JobListScreen> {
  final _searchController = TextEditingController();
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      ref.read(jobListProvider.notifier).loadMore();
    }
  }

  void _onSearchChanged(String query) {
    ref.read(jobListProvider.notifier).search(query.isEmpty ? null : query);
  }

  @override
  Widget build(BuildContext context) {
    final jobsAsync = ref.watch(jobListProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('My Jobs')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search jobs...',
                prefixIcon: const Icon(Icons.search, size: 20),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 20),
                        onPressed: () {
                          _searchController.clear();
                          _onSearchChanged('');
                        },
                      )
                    : null,
                isDense: true,
                contentPadding: const EdgeInsets.symmetric(vertical: 8),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              onChanged: _onSearchChanged,
            ),
          ),
          const _StatusFilterBar(),
          Expanded(
            child: jobsAsync.when(
              data: (jobs) {
                if (jobs.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.assignment_outlined, size: 64, color: AppColors.textMuted),
                        const SizedBox(height: 16),
                        Text(
                          'No jobs assigned',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                color: AppColors.textMuted,
                              ),
                        ),
                      ],
                    ),
                  );
                }
                return RefreshIndicator(
                  onRefresh: () => ref.read(jobListProvider.notifier).refresh(),
                  child: ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    itemCount: jobs.length,
                    itemBuilder: (context, index) => _JobCard(job: jobs[index]),
                  ),
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('Failed to load jobs', style: Theme.of(context).textTheme.bodyLarge),
                    const SizedBox(height: 8),
                    Text(e.toString(), style: Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.textMuted)),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: () => ref.read(jobListProvider.notifier).refresh(),
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusFilterBar extends ConsumerWidget {
  const _StatusFilterBar();

  static const _filters = [
    ('All', null),
    ('In Progress', 'in_progress'),
    ('Checking', 'checking'),
    ('Waiting Parts', 'waiting_parts'),
    ('QC', 'quality_check'),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return SizedBox(
      height: 48,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        children: _filters.map((f) {
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ActionChip(
              label: Text(f.$1),
              onPressed: () => ref.read(jobListProvider.notifier).filterByStatus(f.$2),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _JobCard extends StatelessWidget {

  const _JobCard({required this.job});
  final Job job;

  @override
  Widget build(BuildContext context) {
    final countdown = app_date.AppDateUtils.countdown(job.promisedAt);
    final isOverdue = countdown == 'Overdue';

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => JobDetailScreen(jobId: job.id)),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      job.displayTitle,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                  ),
                  _PriorityChip(priority: job.priorityLevel),
                ],
              ),
              if (job.customerConcern != null) ...[
                const SizedBox(height: 4),
                Text(
                  job.customerConcern!,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppColors.textSecondary,
                      ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
              const SizedBox(height: 12),
              Row(
                children: [
                  _StatusBadge(status: job.status),
                  const Spacer(),
                  if (job.vehicle?.plateNumber != null) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceLight,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        job.vehicle!.plateNumber!,
                        style: Theme.of(context).textTheme.labelSmall,
                      ),
                    ),
                    const SizedBox(width: 8),
                  ],
                  if (countdown != null)
                    Text(
                      countdown,
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            color: isOverdue ? AppColors.danger : AppColors.textMuted,
                            fontWeight: isOverdue ? FontWeight.w700 : null,
                          ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PriorityChip extends StatelessWidget {

  const _PriorityChip({required this.priority});
  final PriorityLevel priority;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: priority.color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        priority.label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: priority.color,
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {

  const _StatusBadge({required this.status});
  final JobStatus status;

  @override
  Widget build(BuildContext context) {
    final color = switch (status) {
      JobStatus.inProgress => AppColors.primary,
      JobStatus.qualityCheck => AppColors.warning,
      JobStatus.ready => AppColors.success,
      JobStatus.closed => AppColors.textMuted,
      JobStatus.waitingParts => AppColors.warning,
      _ => AppColors.textSecondary,
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        status.label,
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: color),
      ),
    );
  }
}