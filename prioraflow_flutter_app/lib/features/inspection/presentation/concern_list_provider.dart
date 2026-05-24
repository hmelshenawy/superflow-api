import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:prioraflow_tech/features/inspection/data/models/concern.dart';
import 'package:prioraflow_tech/features/jobs/presentation/job_detail_provider.dart';

final concernListProvider = AsyncNotifierProvider.family<ConcernListNotifier, List<Concern>, String>(
  ConcernListNotifier.new,
);

class ConcernListNotifier extends FamilyAsyncNotifier<List<Concern>, String> {
  @override
  Future<List<Concern>> build(String arg) async {
    // Derive concerns from the already-fetched job detail
    final job = await ref.watch(jobDetailProvider(arg).future);
    return job.concerns;
  }

  Future<void> refresh() async {
    await ref.read(jobDetailProvider(arg).notifier).refresh();
    ref.invalidateSelf();
  }
}