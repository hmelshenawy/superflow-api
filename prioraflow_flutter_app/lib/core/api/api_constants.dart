import 'package:flutter_dotenv/flutter_dotenv.dart';

class ApiConstants {
  ApiConstants._();

  static String get baseUrl {
    final fromEnv = dotenv.env['API_BASE_URL'];
    if (fromEnv != null && fromEnv.isNotEmpty) return fromEnv;
    return const String.fromEnvironment(
      'API_BASE_URL',
      defaultValue: 'http://10.0.2.2:3000/api',
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

  // Job Parts
  static String jobParts(String jobId) => '/job-parts/job/$jobId';
  static const jobPartsReserve = '/job-parts/reserve';

  // Parts
  static const partsSearch = '/parts/search';
}