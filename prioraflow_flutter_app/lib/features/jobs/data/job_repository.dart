import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:prioraflow_tech/core/api/api_constants.dart';
import 'package:prioraflow_tech/core/api/dio_client.dart';
import 'package:prioraflow_tech/features/jobs/data/models/job.dart';
import 'package:prioraflow_tech/features/jobs/data/models/job_status.dart';

class JobRepository {
  final Dio _dio;

  JobRepository(this._dio);

  Future<List<Job>> getMyJobs({String? status}) async {
    final queryParameters = <String, dynamic>{};
    if (status != null) queryParameters['status'] = status;

    final response = await _dio.get(
      ApiConstants.jobs,
      queryParameters: queryParameters,
    );

    final data = response.data;
    final List<dynamic> items = data is Map
        ? (data['items'] ?? data['data'] ?? <dynamic>[]) as List<dynamic>
        : data as List<dynamic>;
    return items.map((e) => Job.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Job> getJobDetail(String jobId) async {
    final response = await _dio.get('${ApiConstants.jobs}/$jobId');
    return Job.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Job> updateJobStatus(String jobId, JobStatus newStatus, {String? reason}) async {
    final response = await _dio.patch(
      '${ApiConstants.jobs}/$jobId/status',
      data: {
        'to_status': newStatus.name,
        if (reason != null) 'reason': reason,
      },
    );
    return Job.fromJson(response.data as Map<String, dynamic>);
  }
}

final jobRepositoryProvider = Provider<JobRepository>((ref) {
  return JobRepository(ref.watch(dioProvider));
});