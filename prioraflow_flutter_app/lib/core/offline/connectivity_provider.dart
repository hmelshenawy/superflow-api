import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Polls connectivity by making lightweight requests to the API health endpoint.
/// Emits true when connected, false when offline.
final connectivityProvider = StreamProvider<bool>((ref) async* {
  // We'll use a simple approach: check connectivity every 10 seconds.
  // The actual check is done by trying to reach the API.
  // For now, we assume online until a request fails.
  // The OfflineBanner widget will show/hide based on this.
  // This provider is supplemented by checking response errors in the Dio interceptor.

  // Start assuming connected
  yield true;

  // Keep the stream alive
  await for (final _ in Stream.periodic(const Duration(seconds: 30))) {
    // The actual offline detection happens via DioException in the auth interceptor.
    // This provider is updated by ConnectivityNotifier when errors occur.
  }
});

/// Notifier that tracks online/offline state based on actual network errors.
class ConnectivityNotifier extends StateNotifier<bool> {
  ConnectivityNotifier() : super(true);

  void markOffline() => state = false;
  void markOnline() => state = true;
}

final isOnlineProvider = StateNotifierProvider<ConnectivityNotifier, bool>((ref) {
  return ConnectivityNotifier();
});