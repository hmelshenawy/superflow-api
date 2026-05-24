import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:prioraflow_tech/features/jobs/data/job_repository.dart';
import 'package:prioraflow_tech/features/jobs/data/models/job.dart';
import 'package:prioraflow_tech/features/jobs/data/models/job_status.dart';

final jobListProvider = AsyncNotifierProvider<JobListNotifier, List<Job>>(() {
  return JobListNotifier();
});

/// Whether the job list is currently fetching the next page.
final jobListLoadingMoreProvider = StateProvider<bool>((ref) => false);

class JobListNotifier extends AsyncNotifier<List<Job>> {
  String? _statusFilter;
  String? _search;
  int _page = 1;
  bool _hasMore = true;

  List<Job> _filterHidden(List<Job> jobs) =>
      jobs.where((j) => !j.status.isHidden).toList();

  @override
  Future<List<Job>> build() async {
    _page = 1;
    _hasMore = true;
    final repo = ref.watch(jobRepositoryProvider);
    final result = await repo.getMyJobs(
      status: _statusFilter,
      search: _search,
      page: _page,
    );
    _hasMore = result.hasMore;
    return _filterHidden(result.items);
  }

  Future<void> refresh() async {
    _page = 1;
    _hasMore = true;
    state = const AsyncLoading();
    try {
      final repo = ref.read(jobRepositoryProvider);
      final result = await repo.getMyJobs(
        status: _statusFilter,
        search: _search,
        page: _page,
      );
      _hasMore = result.hasMore;
      state = AsyncData(_filterHidden(result.items));
    } catch (e, st) {
      state = AsyncError(e, st);
    }
  }

  Future<void> filterByStatus(String? status) async {
    _statusFilter = status;
    await refresh();
  }

  Future<void> search(String? query) async {
    _search = query;
    await refresh();
  }

  Future<void> loadMore() async {
    if (!_hasMore || ref.read(jobListLoadingMoreProvider)) return;
    ref.read(jobListLoadingMoreProvider.notifier).state = true;
    final current = state.valueOrNull ?? [];
    _page++;
    try {
      final repo = ref.read(jobRepositoryProvider);
      final result = await repo.getMyJobs(
        status: _statusFilter,
        search: _search,
        page: _page,
      );
      _hasMore = result.hasMore;
      state = AsyncData([...current, ..._filterHidden(result.items)]);
    } catch (e, st) {
      _page--;
      state = AsyncError(e, st);
    } finally {
      ref.read(jobListLoadingMoreProvider.notifier).state = false;
    }
  }
}