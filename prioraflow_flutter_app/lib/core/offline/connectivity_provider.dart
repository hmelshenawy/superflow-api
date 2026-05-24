import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Real-time connectivity state based on connectivity_plus.
/// Emits true when any network is available, false when completely offline.
final connectivityProvider = StreamProvider<bool>((ref) {
  return Connectivity().onConnectivityChanged.map(
    (results) => results.any((r) => r != ConnectivityResult.none),
  );
});

/// Notifier that tracks online/offline state.
/// Updated by both the connectivity stream (proactive) and the Dio interceptor (reactive on errors).
class ConnectivityNotifier extends StateNotifier<bool> {
  ConnectivityNotifier() : super(true);

  void markOffline() => state = false;
  void markOnline() => state = true;
}

/// Combined online/offline state.
/// - Proactive: listens to connectivity_plus for network changes.
/// - Reactive: the auth interceptor calls markOffline/markOnline on Dio errors/successes.
final isOnlineProvider = StateNotifierProvider<ConnectivityNotifier, bool>((ref) {
  final notifier = ConnectivityNotifier();

  // Listen to connectivity_plus stream and sync.
  ref.listen(connectivityProvider, (_, asyncValue) {
    asyncValue.whenData((isOnline) {
      if (isOnline && !notifier.state) {
        notifier.markOnline();
      } else if (!isOnline) {
        notifier.markOffline();
      }
    });
  });

  return notifier;
});