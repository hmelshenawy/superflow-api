import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

class AppTheme {
  AppTheme._();

  static ThemeData get dark => ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        colorSchemeSeed: AppColors.primary,
        scaffoldBackgroundColor: AppColors.background,
        cardTheme: const CardThemeData(
          color: AppColors.surface,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(12)),
            side: BorderSide(color: AppColors.border),
          ),
        ),
        appBarTheme: AppBarTheme(
          backgroundColor: AppColors.background,
          foregroundColor: AppColors.textPrimary,
          elevation: 0,
          centerTitle: false,
          titleTextStyle: GoogleFonts.cairo(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
            minimumSize: const Size(double.infinity, 48),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
            textStyle: GoogleFonts.cairo(
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.textPrimary,
            minimumSize: const Size(double.infinity, 48),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
            side: const BorderSide(color: AppColors.border),
            textStyle: GoogleFonts.cairo(
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: AppColors.surfaceLight,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: AppColors.border),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: AppColors.border),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: AppColors.primary),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: AppColors.danger),
          ),
          hintStyle: GoogleFonts.cairo(color: AppColors.textMuted),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        ),
        chipTheme: ChipThemeData(
          backgroundColor: AppColors.surface,
          side: const BorderSide(color: AppColors.border),
          labelStyle: GoogleFonts.cairo(fontSize: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
        textTheme: GoogleFonts.cairoTextTheme().apply(
          bodyColor: AppColors.textPrimary,
          displayColor: AppColors.textPrimary,
        ),
        dividerTheme: const DividerThemeData(color: AppColors.border, thickness: 1),
        bottomSheetTheme: const BottomSheetThemeData(
          backgroundColor: AppColors.surface,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
          ),
        ),
      );

  static ThemeData get light => ThemeData(
        useMaterial3: true,
        brightness: Brightness.light,
        colorSchemeSeed: AppColors.primary,
        scaffoldBackgroundColor: AppColors.lightBackground,
        cardTheme: CardThemeData(
          color: AppColors.lightSurface,
          elevation: 1,
          shape: RoundedRectangleBorder(
            borderRadius: const BorderRadius.all(Radius.circular(12)),
            side: BorderSide(color: AppColors.lightBorder),
          ),
        ),
        appBarTheme: AppBarTheme(
          backgroundColor: AppColors.lightSurface,
          foregroundColor: AppColors.lightTextPrimary,
          elevation: 0,
          centerTitle: false,
          titleTextStyle: GoogleFonts.cairo(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.lightTextPrimary,
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: AppColors.lightBackground,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: AppColors.lightBorder),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: AppColors.lightBorder),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: AppColors.primary),
          ),
          hintStyle: GoogleFonts.cairo(color: AppColors.lightTextMuted),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        ),
        textTheme: GoogleFonts.cairoTextTheme().apply(
          bodyColor: AppColors.lightTextPrimary,
          displayColor: AppColors.lightTextPrimary,
        ),
      );
}