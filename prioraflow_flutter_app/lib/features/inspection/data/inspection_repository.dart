import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:prioraflow_tech/core/api/api_constants.dart';
import 'package:prioraflow_tech/core/api/dio_client.dart';
import 'package:prioraflow_tech/features/inspection/data/models/concern.dart';

class InspectionRepository {
  InspectionRepository(this._dio);
  final Dio _dio;

  /// Update a concern with technician finding data.
  /// Uses PATCH /jobs/:jobId/concerns/:concernId
  Future<Concern> updateConcern({
    required String jobId,
    required String concernId,
    String? status,
    String? technicianFinding,
    String? workNote,
    String? qcNote,
  }) async {
    final response = await _dio.patch(
      ApiConstants.jobConcern(jobId, concernId),
      data: {
        if (status != null) 'status': status,
        if (technicianFinding != null) 'technician_finding': technicianFinding,
        if (workNote != null) 'work_note': workNote,
        if (qcNote != null) 'qc_note': qcNote,
      },
    );
    return Concern.fromJson(response.data as Map<String, dynamic>);
  }

  /// Create a new concern on a job.
  /// Uses POST /jobs/:jobId/concerns
  Future<Concern> createConcern({
    required String jobId,
    String? title,
    String? description,
    String? code,
    String? status,
    String? technicianFinding,
    String? workNote,
    int? sortOrder,
  }) async {
    final response = await _dio.post(
      ApiConstants.createConcern(jobId),
      data: {
        if (title != null) 'title': title,
        if (description != null) 'description': description,
        if (code != null) 'code': code,
        if (status != null) 'status': status,
        if (technicianFinding != null) 'technician_finding': technicianFinding,
        if (workNote != null) 'work_note': workNote,
        if (sortOrder != null) 'sort_order': sortOrder,
      },
    );
    return Concern.fromJson(response.data as Map<String, dynamic>);
  }

  /// Delete a concern from a job.
  /// Uses DELETE /jobs/:jobId/concerns/:concernId
  Future<void> deleteConcern({
    required String jobId,
    required String concernId,
  }) async {
    await _dio.delete(ApiConstants.jobConcern(jobId, concernId));
  }

  /// Upload a photo to a concern via the media module (direct upload).
  Future<Map<String, dynamic>> uploadConcernPhoto({
    required String jobId,
    required String concernId,
    required File file,
  }) async {
    final fileName = file.path.split('/').last.split('\\').last;
    final ext = fileName.split('.').last.toLowerCase();
    final mimeType = switch (ext) {
      'jpg' || 'jpeg' => 'image/jpeg',
      'png' => 'image/png',
      'gif' => 'image/gif',
      'webp' => 'image/webp',
      'heic' || 'heif' => 'image/heic',
      _ => 'image/jpeg',
    };
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(file.path, filename: fileName),
      'job_id': jobId,
      'file_type': 'photo',
      'filename': fileName,
      'concern_id': concernId,
      'mime_type': mimeType,
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