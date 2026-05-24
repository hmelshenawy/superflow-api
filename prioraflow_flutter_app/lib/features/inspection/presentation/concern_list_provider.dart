import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:prioraflow_tech/features/inspection/data/inspection_repository.dart';
import 'package:prioraflow_tech/features/inspection/data/models/concern.dart';

final concernListProvider = AsyncNotifierProvider.family<ConcernListNotifier, List<Concern>, String>(
  ConcernListNotifier.new,
);

class ConcernListNotifier extends FamilyAsyncNotifier<List<Concern>, String> {
  @override
  Future<List<Concern>> build(String arg) async {
    final repo = ref.watch(inspectionRepositoryProvider);
    return repo.getConcerns(arg);
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    try {
      final repo = ref.read(inspectionRepositoryProvider);
      final concerns = await repo.getConcerns(arg);
      state = AsyncData(concerns);
    } catch (e, st) {
      state = AsyncError(e, st);
    }
  }
}