import 'package:flutter/material.dart';

/// Sleek, minimal white design: black/near-black for primary actions and
/// text, a single green accent reserved for the sign-up CTA, thin light-gray
/// borders, no elevation.
class AppColors {
  AppColors._();

  static const ink = Color(0xFF111111);
  static const muted = Color(0xFF6B7280);
  static const border = Color(0xFFE5E7EB);
  static const green = Color(0xFF16A34A);
  static const error = Color(0xFFDC2626);
}

ThemeData buildAppTheme() {
  final colorScheme = const ColorScheme.light().copyWith(
    primary: AppColors.ink,
    onPrimary: Colors.white,
    secondary: AppColors.green,
    onSecondary: Colors.white,
    surface: Colors.white,
    onSurface: AppColors.ink,
    outline: AppColors.border,
    error: AppColors.error,
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: Colors.white,
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.white,
      foregroundColor: AppColors.ink,
      elevation: 0,
      surfaceTintColor: Colors.transparent,
      centerTitle: false,
    ),
    textTheme: const TextTheme(
      headlineMedium: TextStyle(
        fontWeight: FontWeight.w600,
        color: AppColors.ink,
      ),
      bodyLarge: TextStyle(color: AppColors.ink),
      bodyMedium: TextStyle(color: AppColors.muted),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: false,
      contentPadding: const EdgeInsets.symmetric(
        horizontal: 16,
        vertical: 16,
      ),
      labelStyle: const TextStyle(color: AppColors.muted),
      helperStyle: const TextStyle(color: AppColors.muted),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.ink, width: 1.5),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.error),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.error, width: 1.5),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: AppColors.green,
        foregroundColor: Colors.white,
        minimumSize: const Size.fromHeight(52),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        textStyle: const TextStyle(
          fontWeight: FontWeight.w600,
          fontSize: 16,
        ),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(foregroundColor: AppColors.ink),
    ),
  );
}
