import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:prioraflow_tech/core/api/api_constants.dart';
import 'package:prioraflow_tech/core/api/dio_client.dart';
import 'package:prioraflow_tech/features/inspection/data/models/concern.dart';
import 'package:prioraflow_tech/features/inspection/data/models/finding.dart';

class InspectionRepository {

  InspectionRepository(this._dio);
  final Dio _dio;

  Future<List<Concern>> getConcerns(String jobId) async {
    final response = await _dio.get(ApiConstants.jobConcerns(jobId));
    final data = response.data;
    final items = data is Map
        ? (data['items'] ?? data['data'] ?? <dynamic>[]) as List<dynamic>
        : data as List<dynamic>;
    return items.map((e) => Concern.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Finding> createFinding({
    required String concernId,
    required FindingType type,
    String? description,
    int? estimatedMinutes,
  }) async {
    final response = await _dio.post(
      '/concerns/$concernId/findings',
      data: {
        'type': type.name,
        if (description != null) 'description': description,
        if (estimatedMinutes != null) 'estimated_minutes': estimatedMinutes,
      },
    );
    return Finding.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Finding> updateFinding({
    required String findingId,
    FindingType? type,
    String? description,
    int? estimatedMinutes,
  }) async {
    final response = await _dio.patch(
      '/findings/$findingId',
      data: {
        if (type != null) 'type': type.name,
        if (description != null) 'description': description,
        if (estimatedMinutes != null) 'estimated_minutes': estimatedMinutes,
      },
    );
    return Finding.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> uploadFindingPhoto({
    required String findingId,
    required String filePath,
    required String fileName,
  }) async {
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(filePath, filename: fileName),
      'finding_id': findingId,
    });
    await _dio.post('/findings/$findingId/photos', data: formData);
  }
}

final inspectionRepositoryProvider = Provider<InspectionRepository>((ref) {
  return InspectionRepository(ref.watch(dioProvider));
});