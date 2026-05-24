import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:prioraflow_tech/core/api/api_constants.dart';
import 'package:prioraflow_tech/core/api/dio_client.dart';
import 'package:prioraflow_tech/features/inspection/data/models/finding.dart';

class InspectionRepository {
  InspectionRepository(this._dio);
  final Dio _dio;

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

  /// Upload a photo to a concern via the media module (direct upload).
  Future<Map<String, dynamic>> uploadConcernPhoto({
    required String jobId,
    required String concernId,
    required File file,
  }) async {
    final fileName = file.path.split('/').last.split('\\').last;
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(file.path, filename: fileName),
      'job_id': jobId,
      'file_type': 'photo',
      'filename': fileName,
      'concern_id': concernId,
    });
    final response = await _dio.post(
      ApiConstants.mediaUploadDirect,
      data: formData,
    );
    return response.data as Map<String, dynamic>;
  }
}

final inspectionRepositoryProvider = Provider<InspectionRepository>((ref) {
  return InspectionRepository(ref.watch(dioProvider));
});