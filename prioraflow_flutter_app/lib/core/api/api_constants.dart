import 'package:flutter_dotenv/flutter_dotenv.dart';

class ApiConstants {
  ApiConstants._();

  static String get baseUrl {
    final fromEnv = dotenv.env['API_BASE_URL'];
    if (fromEnv != null && fromEnv.isNotEmpty) return fromEnv;
    return const String.fromEnvironment(
      'API_BASE_URL',
      defaultValue: 'https://prioraflow.com/api',
    );
  }

  // Auth
  static const login = '/auth/login';
  static const refresh = '/auth/refresh';
  static const me = '/auth/me';
  static const logout = '/auth/logout';
  static const selectWorkshop = '/auth/select-workshop';

  // Jobs
  static const jobs = '/jobs';
  static String jobStatus(String jobId) => '/jobs/$jobId/status';
  static String jobConcerns(String jobId) => '/jobs/$jobId/concerns';
  static String jobConcern(String jobId, String concernId) =>
      '/jobs/$jobId/concerns/$concernId';
  static String createConcern(String jobId) => '/jobs/$jobId/concerns';

  // Media
  static const mediaPresign = '/media/presign';
  static const mediaConfirm = '/media/confirm';
  static const mediaUploadDirect = '/media/upload-direct';
  static String mediaDownload(String mediaId) => '/media/$mediaId/download';

  // Job Parts
  static String jobParts(String jobId) => '/job-parts/job/$jobId';
  static const jobPartsReserve = '/job-parts/reserve';

  // Parts
  static const partsSearch = '/parts/search';

  // Inspection Templates
  static const inspectionTemplates = '/inspection-templates';
  static String inspectionTemplate(String id) => '/inspection-templates/$id';

  // Inspections
  static const inspections = '/inspections';
  static String inspection(String id) => '/inspections/$id';
  static String inspectionResponses(String id) => '/inspections/$id/responses';
  static String inspectionSubmit(String id) => '/inspections/$id/submit';
  static String inspectionReopen(String id) => '/inspections/$id/reopen';

  // QC Checklist Templates
  static const qcChecklistTemplates = '/qc-checklist-templates';
  static String qcChecklistTemplate(String id) => '/qc-checklist-templates/$id';

  // QC Checklists
  static const qcChecklists = '/qc-checklists';
  static String qcChecklist(String id) => '/qc-checklists/$id';
  static String qcChecklistResponses(String id) => '/qc-checklists/$id/responses';
  static String qcChecklistSubmit(String id) => '/qc-checklists/$id/submit';
  static String qcChecklistReopen(String id) => '/qc-checklists/$id/reopen';
}