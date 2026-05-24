class ApiConstants {
  ApiConstants._();

  static String get baseUrl => const String.fromEnvironment(
        'API_BASE_URL',
        defaultValue: 'http://10.0.2.2:3000/api',
      );

  // Auth
  static const login = '/auth/login';
  static const refresh = '/auth/refresh';
  static const me = '/auth/me';
  static const logout = '/auth/logout';

  // Jobs
  static const jobs = '/jobs';

  // Concerns (nested under jobs)
  static String jobConcerns(String jobId) => '/jobs/$jobId/concerns';

  // Media
  static const mediaPresign = '/media/presign';
  static const mediaConfirm = '/media/confirm';
  static const mediaUploadDirect = '/media/upload-direct';

  // Job Parts
  static String jobParts(String jobId) => '/job-parts/job/$jobId';
}