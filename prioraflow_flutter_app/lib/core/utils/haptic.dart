import 'package:flutter/services.dart';

/// Light impact for button taps, chip selections, and navigation.
Future<void> hapticLight() => HapticFeedback.lightImpact();

/// Medium impact for successful form submissions, status transitions.
Future<void> hapticMedium() => HapticFeedback.mediumImpact();

/// Heavy impact for destructive or high-importance confirmations.
Future<void> hapticHeavy() => HapticFeedback.heavyImpact();

/// Selection click for toggle/segmented control changes.
Future<void> hapticSelection() => HapticFeedback.selectionClick();