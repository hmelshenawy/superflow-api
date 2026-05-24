import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:prioraflow_tech/core/auth/auth_provider.dart';
import 'package:prioraflow_tech/core/theme/app_colors.dart';
import 'package:prioraflow_tech/core/utils/date_utils.dart' as app_date;
import 'package:prioraflow_tech/core/utils/priority_utils.dart';
import 'package:prioraflow_tech/features/jobs/data/models/job.dart';
import 'package:prioraflow_tech/features/jobs/data/models/job_status.dart';
import 'package:prioraflow_tech/features/jobs/presentation/job_list_provider.dart';
import 'package:prioraflow_tech/features/jobs/presentation/job_detail_screen.dart';
import 'package:shimmer/shimmer.dart';

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
      drawer: const _AppDrawer(),
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
              loading: () => Shimmer.fromColors(
                baseColor: AppColors.surfaceLight,
                highlightColor: AppColors.border,
                child: ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  itemCount: 5,
                  itemBuilder: (_, __) => Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: Container(height: 100, padding: const EdgeInsets.all(16)),
                  ),
                ),
              ),
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

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border(left: BorderSide(color: job.status.color, width: 4)),
        boxShadow: [
          BoxShadow(
            color: AppColors.foreground.withOpacity(0.04),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
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
                    if (job.jobNumber != null) ...[
                      Text(
                        job.jobNumber!,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.08,
                          color: AppColors.textMuted,
                        ),
                      ),
                      const SizedBox(width: 8),
                    ],
                    Expanded(
                      child: Text(
                        job.displayTitle,
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                      ),
                    ),
                    _PriorityPill(priority: job.priorityLevel),
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
                    _StatusPill(status: job.status),
                    const Spacer(),
                    if (job.vehicle?.plateNumber != null) ...[
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.muted,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppColors.foreground.withOpacity(0.08)),
                        ),
                        child: Text(
                          job.vehicle!.plateNumber!,
                          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                letterSpacing: 0.04,
                              ),
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
      ),
    );
  }
}

class _PriorityPill extends StatelessWidget {

  const _PriorityPill({required this.priority});
  final PriorityLevel priority;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: priority.color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: priority.color.withOpacity(0.3)),
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

class _AppDrawer extends ConsumerWidget {
  const _AppDrawer();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final user = authState.user;
    final name = user?['name']?.toString() ?? 'Technician';
    final role = (user?['role']?['name'] ?? 'technician').toString();

    return Drawer(
      backgroundColor: AppColors.background,
      child: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 24,
                    backgroundColor: AppColors.foreground,
                    child: Text(
                      name.substring(0, 1).toUpperCase(),
                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.background),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(name, style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.statusApproved.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            role.toUpperCase(),
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 0.1,
                              color: AppColors.statusApproved,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Divider(height: 1, color: AppColors.foreground.withOpacity(0.1)),
            ListTile(
              leading: Icon(Icons.assignment_outlined, color: AppColors.foreground),
              title: const Text('My Jobs'),
              selectedTileColor: AppColors.foreground.withOpacity(0.1),
              onTap: () => Navigator.of(context).pop(),
            ),
            ListTile(
              leading: Icon(Icons.person_outline, color: AppColors.foregroundMuted),
              title: Text('Profile', style: TextStyle(color: AppColors.foregroundMuted)),
              onTap: () {
                Navigator.of(context).pop();
                context.push('/profile');
              },
            ),
            const Spacer(),
            Divider(height: 1, color: AppColors.foreground.withOpacity(0.1)),
            ListTile(
              leading: const Icon(Icons.logout, color: AppColors.danger),
              title: const Text('Sign Out', style: TextStyle(color: AppColors.danger)),
              onTap: () async {
                await ref.read(authProvider.notifier).logout();
                if (context.mounted) context.go('/login');
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}