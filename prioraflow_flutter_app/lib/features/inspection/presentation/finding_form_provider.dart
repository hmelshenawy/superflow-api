import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:prioraflow_tech/features/inspection/data/inspection_repository.dart';
import 'package:prioraflow_tech/features/inspection/data/models/finding.dart';

class FindingFormState {
  final bool isLoading;
  final String? error;
  final Finding? savedFinding;

  const FindingFormState({this.isLoading = false, this.error, this.savedFinding});

  FindingFormState copyWith({bool? isLoading, String? error, Finding? savedFinding}) {
    return FindingFormState(
      isLoading: isLoading ?? this.isLoading,
      error: error,
      savedFinding: savedFinding ?? this.savedFinding,
    );
  }
}

final findingFormProvider = StateNotifierProvider<FindingFormNotifier, FindingFormState>((ref) {
  return FindingFormNotifier(ref.watch(inspectionRepositoryProvider));
});

class FindingFormNotifier extends StateNotifier<FindingFormState> {
  final InspectionRepository _repo;

  FindingFormNotifier(this._repo) : super(const FindingFormState());

  Future<bool> submit({
    required String concernId,
    required FindingType type,
    String? description,
    int? estimatedMinutes,
  }) async {
    state = const FindingFormState(isLoading: true);

    try {
      final finding = await _repo.createFinding(
        concernId: concernId,
        type: type,
        description: description,
        estimatedMinutes: estimatedMinutes,
      );
      state = FindingFormState(savedFinding: finding);
      return true;
    } catch (e) {
      state = FindingFormState(error: e.toString());
      return false;
    }
  }
}