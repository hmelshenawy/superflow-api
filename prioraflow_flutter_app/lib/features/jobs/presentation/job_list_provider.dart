import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:prioraflow_tech/features/jobs/data/job_repository.dart';
import 'package:prioraflow_tech/features/jobs/data/models/job.dart';

final jobListProvider = AsyncNotifierProvider<JobListNotifier, List<Job>>(() {
  return JobListNotifier();
});

class JobListNotifier extends AsyncNotifier<List<Job>> {
  @override
  Future<List<Job>> build() async {
    final repo = ref.watch(jobRepositoryProvider);
    return repo.getMyJobs();
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    try {
      final repo = ref.read(jobRepositoryProvider);
      final jobs = await repo.getMyJobs();
      state = AsyncData(jobs);
    } catch (e, st) {
      state = AsyncError(e, st);
    }
  }

  Future<void> filterByStatus(String? status) async {
    state = const AsyncLoading();
    try {
      final repo = ref.read(jobRepositoryProvider);
      final jobs = await repo.getMyJobs(status: status);
      state = AsyncData(jobs);
    } catch (e, st) {
      state = AsyncError(e, st);
    }
  }
}