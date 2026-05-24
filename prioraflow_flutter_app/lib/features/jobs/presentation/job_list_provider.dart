import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:prioraflow_tech/features/jobs/data/job_repository.dart';
import 'package:prioraflow_tech/features/jobs/data/models/job.dart';

final jobListProvider = AsyncNotifierProvider<JobListNotifier, List<Job>>(() {
  return JobListNotifier();
});

class JobListNotifier extends AsyncNotifier<List<Job>> {
  String? _statusFilter;
  String? _search;
  int _page = 1;
  bool _hasMore = true;

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
    return result.items;
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
      state = AsyncData(result.items);
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
    if (!_hasMore) return;
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
      state = AsyncData([...current, ...result.items]);
    } catch (e, st) {
      _page--;
      state = AsyncError(e, st);
    }
  }
}