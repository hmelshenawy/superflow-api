import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:prioraflow_tech/core/api/api_constants.dart';
import 'package:prioraflow_tech/core/api/dio_client.dart';
import 'package:prioraflow_tech/core/errors/error_handler.dart';
import 'package:prioraflow_tech/features/inspection/data/models/concern.dart';
import 'package:prioraflow_tech/features/inspection/data/models/inspection.dart';
import 'package:prioraflow_tech/features/inspection/data/models/inspection_template.dart';
import 'package:prioraflow_tech/features/inspection/data/models/qc_checklist.dart';

class InspectionRepository {
  InspectionRepository(this._dio);
  final Dio _dio;

  // ── Concerns ──────────────────────────────────────────────────────────

  Future<Concern> updateConcern({
    required String jobId,
    required String concernId,
    String? status,
    String? technicianFinding,
    String? workNote,
    String? qcNote,
  }) async {
    try {
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
    } catch (e) {
      throw handleError(e);
    }
  }

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
    try {
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
    } catch (e) {
      throw handleError(e);
    }
  }

  Future<void> deleteConcern({
    required String jobId,
    required String concernId,
  }) async {
    try {
      await _dio.delete(ApiConstants.jobConcern(jobId, concernId));
    } catch (e) {
      throw handleError(e);
    }
  }

  Future<Map<String, dynamic>> uploadConcernPhoto({
    required String jobId,
    required String concernId,
    required File file,
  }) async {
    try {
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
    } catch (e) {
      throw handleError(e);
    }
  }

  // ── Inspection Templates ──────────────────────────────────────────────

  /// Fetch all DVI templates for the technician's workshop.
  Future<List<InspectionTemplate>> fetchTemplates({String? vehicleType}) async {
    try {
      final queryParams = <String, dynamic>{};
      if (vehicleType != null) queryParams['vehicleType'] = vehicleType;
      final response = await _dio.get(
        ApiConstants.inspectionTemplates,
        queryParameters: queryParams.isNotEmpty ? queryParams : null,
      );
      final list = response.data as List<dynamic>;
      return list
          .map((e) => InspectionTemplate.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (e) {
      throw handleError(e);
    }
  }

  /// Fetch a single DVI template with sections and items.
  Future<InspectionTemplate> fetchTemplate(String id) async {
    try {
      final response = await _dio.get(ApiConstants.inspectionTemplate(id));
      return InspectionTemplate.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      throw handleError(e);
    }
  }

  // ── Inspections (DVI) ─────────────────────────────────────────────────

  /// Start a new DVI inspection for a job.
  Future<Inspection> startInspection({
    required String jobId,
    required String templateId,
  }) async {
    try {
      final response = await _dio.post(
        ApiConstants.inspections,
        data: {'jobId': jobId, 'templateId': templateId},
      );
      return Inspection.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      throw handleError(e);
    }
  }

  /// Fetch a full inspection with responses and nested template.
  Future<Inspection> fetchInspection(String id) async {
    try {
      final response = await _dio.get(ApiConstants.inspection(id));
      return Inspection.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      throw handleError(e);
    }
  }

  /// Save inspection responses (batch) — used for draft saving.
  Future<void> saveResponses({
    required String inspectionId,
    required List<Map<String, dynamic>> responses,
    String? offlineDraft,
  }) async {
    try {
      await _dio.put(
        ApiConstants.inspectionResponses(inspectionId),
        data: {
          'responses': responses,
          if (offlineDraft != null) 'offline_draft': offlineDraft,
        },
      );
    } catch (e) {
      throw handleError(e);
    }
  }

  /// Submit (lock) an inspection.
  Future<void> submitInspection(String id, {String? advisorNote}) async {
    try {
      await _dio.post(
        ApiConstants.inspectionSubmit(id),
        data: {if (advisorNote != null) 'advisor_note': advisorNote},
      );
    } catch (e) {
      throw handleError(e);
    }
  }

  /// Reopen a submitted inspection for edits.
  Future<Inspection> reopenInspection(String id) async {
    try {
      final response = await _dio.post(ApiConstants.inspectionReopen(id));
      return Inspection.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      throw handleError(e);
    }
  }

  /// Upload a photo for an inspection item.
  Future<Map<String, dynamic>> uploadInspectionPhoto({
    required String jobId,
    required String inspectionId,
    required String itemId,
    required File file,
  }) async {
    try {
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
        'inspection_id': inspectionId,
        'item_id': itemId,
        'mime_type': mimeType,
      });
      final response = await _dio.post(
        ApiConstants.mediaUploadDirect,
        data: formData,
      );
      return response.data as Map<String, dynamic>;
    } catch (e) {
      throw handleError(e);
    }
  }

  // ── QC Checklist Templates ────────────────────────────────────────────

  /// Fetch all QC checklist templates for the technician's workshop.
  Future<List<QcChecklistTemplate>> fetchQcTemplates() async {
    try {
      final response = await _dio.get(ApiConstants.qcChecklistTemplates);
      final list = response.data as List<dynamic>;
      return list
          .map((e) => QcChecklistTemplate.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (e) {
      throw handleError(e);
    }
  }

  /// Fetch a single QC checklist template with sections and items.
  Future<QcChecklistTemplate> fetchQcTemplate(String id) async {
    try {
      final response = await _dio.get(ApiConstants.qcChecklistTemplate(id));
      return QcChecklistTemplate.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      throw handleError(e);
    }
  }

  // ── QC Checklists ─────────────────────────────────────────────────────

  /// Start a new QC checklist for a job.
  Future<QcChecklist> startQcChecklist({
    required String jobId,
    required String templateId,
  }) async {
    try {
      final response = await _dio.post(
        ApiConstants.qcChecklists,
        data: {'jobId': jobId, 'templateId': templateId},
      );
      return QcChecklist.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      throw handleError(e);
    }
  }

  /// Fetch a full QC checklist with responses and nested template.
  Future<QcChecklist> fetchQcChecklist(String id) async {
    try {
      final response = await _dio.get(ApiConstants.qcChecklist(id));
      return QcChecklist.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      throw handleError(e);
    }
  }

  /// Save QC checklist responses (batch).
  Future<void> saveQcResponses({
    required String checklistId,
    required List<Map<String, dynamic>> responses,
  }) async {
    try {
      await _dio.put(
        ApiConstants.qcChecklistResponses(checklistId),
        data: {'responses': responses},
      );
    } catch (e) {
      throw handleError(e);
    }
  }

  /// Submit (lock) a QC checklist.
  Future<void> submitQcChecklist(String id, {String? notes}) async {
    try {
      await _dio.post(
        ApiConstants.qcChecklistSubmit(id),
        data: {if (notes != null) 'notes': notes},
      );
    } catch (e) {
      throw handleError(e);
    }
  }

  /// Reopen a submitted QC checklist for edits.
  Future<QcChecklist> reopenQcChecklist(String id) async {
    try {
      final response = await _dio.post(ApiConstants.qcChecklistReopen(id));
      return QcChecklist.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      throw handleError(e);
    }
  }

  /// Upload a photo for a QC checklist item.
  Future<Map<String, dynamic>> uploadQcPhoto({
    required String jobId,
    required String checklistId,
    required String itemId,
    required File file,
  }) async {
    try {
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
        'qc_checklist_id': checklistId,
        'item_id': itemId,
        'mime_type': mimeType,
      });
      final response = await _dio.post(
        ApiConstants.mediaUploadDirect,
        data: formData,
      );
      return response.data as Map<String, dynamic>;
    } catch (e) {
      throw handleError(e);
    }
  }
}

final inspectionRepositoryProvider = Provider<InspectionRepository>((ref) {
  return InspectionRepository(ref.watch(dioProvider));
});