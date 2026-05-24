import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:prioraflow_tech/features/jobs/data/job_repository.dart';
import 'package:prioraflow_tech/features/jobs/data/models/job.dart';
import 'package:prioraflow_tech/features/jobs/data/models/job_status.dart';

final jobDetailProvider = AsyncNotifierProvider.family<JobDetailNotifier, Job, String>(
  JobDetailNotifier.new,
);

class JobDetailNotifier extends FamilyAsyncNotifier<Job, String> {
  @override
  Future<Job> build(String arg) async {
    final repo = ref.watch(jobRepositoryProvider);
    return repo.getJobDetail(arg);
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    try {
      final repo = ref.read(jobRepositoryProvider);
      final job = await repo.getJobDetail(arg);
      state = AsyncData(job);
    } catch (e, st) {
      state = AsyncError(e, st);
    }
  }

  Future<bool> transitionStatus(JobStatus newStatus, {String? reason}) async {
    try {
      final repo = ref.read(jobRepositoryProvider);
      final updated = await repo.updateJobStatus(arg, newStatus, reason: reason);
      state = AsyncData(updated);
      return true;
    } catch (_) {
      return false;
    }
  }
}