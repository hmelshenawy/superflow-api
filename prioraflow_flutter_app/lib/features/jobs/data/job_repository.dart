import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:prioraflow_tech/core/api/api_constants.dart';
import 'package:prioraflow_tech/core/api/dio_client.dart';
import 'package:prioraflow_tech/features/jobs/data/models/job.dart';
import 'package:prioraflow_tech/features/jobs/data/models/job_status.dart';

class PaginatedResult<T> {
  const PaginatedResult({
    required this.items,
    required this.total,
    required this.page,
    required this.limit,
  });

  factory PaginatedResult.fromJson(
    Map<String, dynamic> json,
    T Function(Map<String, dynamic>) fromJsonT,
  ) {
    return PaginatedResult(
      items: (json['items'] as List<dynamic>)
          .map((e) => fromJsonT(e as Map<String, dynamic>))
          .toList(),
      total: json['total'] as int,
      page: json['page'] as int,
      limit: json['limit'] as int,
    );
  }

  final List<T> items;
  final int total;
  final int page;
  final int limit;

  bool get hasMore => page * limit < total;
}

class JobRepository {

  JobRepository(this._dio);
  final Dio _dio;

  Future<PaginatedResult<Job>> getMyJobs({
    int page = 1,
    int limit = 20,
    String? status,
    String? search,
  }) async {
    final queryParameters = <String, dynamic>{
      'page': page,
      'limit': limit,
    };
    if (status != null) queryParameters['status'] = status;
    if (search != null && search.trim().isNotEmpty) {
      queryParameters['search'] = search.trim();
    }

    final response = await _dio.get(
      ApiConstants.jobs,
      queryParameters: queryParameters,
    );

    return PaginatedResult.fromJson(
      response.data as Map<String, dynamic>,
      (json) => Job.fromJson(json),
    );
  }

  Future<Job> getJobDetail(String jobId) async {
    final response = await _dio.get('${ApiConstants.jobs}/$jobId');
    return Job.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Job> updateJobStatus(String jobId, JobStatus newStatus, {String? reason}) async {
    final response = await _dio.patch(
      ApiConstants.jobStatus(jobId),
      data: {
        'to_status': newStatus.apiValue,
        if (reason != null) 'reason': reason,
      },
    );
    return Job.fromJson(response.data as Map<String, dynamic>);
  }
}

final jobRepositoryProvider = Provider<JobRepository>((ref) {
  return JobRepository(ref.watch(dioProvider));
});