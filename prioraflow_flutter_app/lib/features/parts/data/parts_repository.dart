import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:prioraflow_tech/core/api/api_constants.dart';
import 'package:prioraflow_tech/core/api/dio_client.dart';
import 'package:prioraflow_tech/core/errors/error_handler.dart';
import 'package:prioraflow_tech/features/parts/data/models/part.dart';

class PartsRepository {

  PartsRepository(this._dio);
  final Dio _dio;

  Future<List<JobPart>> getJobParts(String jobId) async {
    try {
      final response = await _dio.get(ApiConstants.jobParts(jobId));
      final data = response.data;
      final items = data is Map
          ? (data['items'] ?? data['data'] ?? <dynamic>[]) as List<dynamic>
          : data as List<dynamic>;
      return items
          .map((e) => JobPart.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (e) {
      throw handleError(e);
    }
  }

  Future<Map<String, dynamic>> searchParts(String query) async {
    try {
      final response = await _dio.get(
        ApiConstants.partsSearch,
        queryParameters: {'q': query},
      );
      return response.data as Map<String, dynamic>;
    } catch (e) {
      throw handleError(e);
    }
  }
}

final partsRepositoryProvider = Provider<PartsRepository>((ref) {
  return PartsRepository(ref.watch(dioProvider));
});