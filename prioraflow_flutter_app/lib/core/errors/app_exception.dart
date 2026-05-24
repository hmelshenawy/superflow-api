class AppException implements Exception {
  final String message;
  final int? statusCode;
  final String? errorCode;

  const AppException({
    required this.message,
    this.statusCode,
    this.errorCode,
  });

  @override
  String toString() => 'AppException($statusCode): $message';
}

class NetworkException extends AppException {
  const NetworkException({super.message = 'Unable to connect to server'})
      : super(errorCode: 'NETWORK_ERROR');
}

class UnauthorizedException extends AppException {
  const UnauthorizedException({super.message = 'Session expired. Please log in again.'})
      : super(statusCode: 401, errorCode: 'UNAUTHORIZED');
}

class ForbiddenException extends AppException {
  const ForbiddenException({super.message = 'You do not have permission for this action.'})
      : super(statusCode: 403, errorCode: 'FORBIDDEN');
}

class ServerException extends AppException {
  const ServerException({super.message = 'Server error. Please try again later.'})
      : super(statusCode: 500, errorCode: 'SERVER_ERROR');
}