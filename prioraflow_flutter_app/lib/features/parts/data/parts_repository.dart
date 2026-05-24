import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:prioraflow_tech/core/api/api_constants.dart';
import 'package:prioraflow_tech/core/api/dio_client.dart';

class PartsRepository {

  PartsRepository(this._dio);
  final Dio _dio;

  Future<List<Map<String, dynamic>>> getJobParts(String jobId) async {
    final response = await _dio.get(ApiConstants.jobParts(jobId));
    final data = response.data;
    final items = data is Map
        ? (data['items'] ?? data['data'] ?? <dynamic>[]) as List<dynamic>
        : data as List<dynamic>;
    return items.cast<Map<String, dynamic>>();
  }

  Future<Map<String, dynamic>> searchParts(String query) async {
    final response = await _dio.get(
      ApiConstants.partsSearch,
      queryParameters: {'q': query},
    );
    return response.data as Map<String, dynamic>;
  }
}

final partsRepositoryProvider = Provider<PartsRepository>((ref) {
  return PartsRepository(ref.watch(dioProvider));
});