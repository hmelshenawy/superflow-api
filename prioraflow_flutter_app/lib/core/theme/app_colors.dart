import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // Background — neutral dark palette matching web dark mode
  static const background = Color(0xFF171717);
  static const surface = Color(0xFF1E1E1E);
  static const surfaceLight = Color(0xFF262626);

  // Foreground — near-white for dark mode
  static const foreground = Color(0xFFFAFAFA);
  static const foregroundMuted = Color(0xFFA1A1AA);

  // Muted backgrounds (web's bg-muted equivalent)
  static const muted = Color(0xFF262626);
  static const mutedForeground = Color(0xFFA1A1AA);

  // Primary — brand blue matching web's #0A66FF
  static const primary = Color(0xFF0A66FF);
  static const primaryLight = Color(0xFF3B82F6);
  static const primaryDark = Color(0xFF0757DD);

  // Status — semantic colors matching web's STATUS_META
  static const success = Color(0xFF10B981);
  static const warning = Color(0xFFF59E0B);
  static const danger = Color(0xFFEF4444);
  static const info = Color(0xFF0EA5E9);

  // Job status colors — matching web's dark-mode STATUS_META
  static const statusBooked = Color(0xFF94A3B8);       // slate-400
  static const statusChecking = Color(0xFFF59E0B);      // amber-500
  static const statusEstimateSent = Color(0xFFF43F5E);   // rose-500
  static const statusApproved = Color(0xFF10B981);       // emerald-500
  static const statusInProgress = Color(0xFF3B82F6);     // blue-500
  static const statusWaitingParts = Color(0xFFA855F7);   // purple-500
  static const statusQualityCheck = Color(0xFF06B6D4);  // cyan-500
  static const statusReady = Color(0xFF14B8A6);          // teal-500
  static const statusClosed = Color(0xFF64748B);         // slate-500
  static const statusNoShow = Color(0xFF94A3B8);         // slate-400

  // Priority — matching web's priority tones
  static const priorityLow = Color(0xFF64748B);        // slate-500
  static const priorityNormal = Color(0xFF3B82F6);     // blue-500
  static const priorityHigh = Color(0xFFF59E0B);        // amber-500
  static const priorityCritical = Color(0xFFF43F5E);   // rose-500

  // Text — neutral palette
  static const textPrimary = Color(0xFFFAFAFA);
  static const textSecondary = Color(0xFFCBD5E1);
  static const textMuted = Color(0xFF94A3B8);

  // Border — ring-1 ring-foreground/10 equivalent (white at 10% opacity)
  static const border = Color(0x1AFFFFFF);   // foreground 10%
  static const borderLight = Color(0x26FFFFFF); // foreground 15%

  // Light theme overrides
  static const lightBackground = Color(0xFFFAFAFA);
  static const lightSurface = Color(0xFFFFFFFF);
  static const lightBorder = Color(0xFFE5E5E5);
  static const lightTextPrimary = Color(0xFF171717);
  static const lightTextSecondary = Color(0xFF525252);
  static const lightTextMuted = Color(0xFFA1A1AA);

  // Semantic helper — background tint at 12% opacity for status badges
  static Color statusBg(Color statusColor) => statusColor.withOpacity(0.12);
}