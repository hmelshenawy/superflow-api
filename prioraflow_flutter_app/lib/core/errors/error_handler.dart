import 'package:dio/dio.dart';
import 'app_exception.dart';

AppException handleError(dynamic error) {
  if (error is DioException) {
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.connectionError:
        return const NetworkException();
      case DioExceptionType.badResponse:
        final status = error.response?.statusCode;
        final data = error.response?.data;
        final msg = data is Map ? data['message'] ?? data['error'] : null;

        if (status == 401) {
          return UnauthorizedException(message: msg?.toString() ?? 'Unauthorized');
        }
        if (status == 403) {
          return ForbiddenException(message: msg?.toString() ?? 'Forbidden');
        }
        if (status != null && status >= 500) {
          return ServerException(message: msg?.toString() ?? 'Server error');
        }
        return AppException(
          message: msg?.toString() ?? 'Request failed',
          statusCode: status,
        );
      default:
        return const NetworkException();
    }
  }
  if (error is AppException) return error;
  return AppException(message: error.toString());
}