import 'package:flutter/material.dart';

abstract final class NestColors {
  static const base    = Color(0xFF0B0E14);
  static const surface = Color(0xFF141925);
  static const sidebar = Color(0xFF0E121B);

  static const indigo  = Color(0xFF6366F1);
  static const indigoL = Color(0xFF818CF8);
  static const teal    = Color(0xFF2DD4BF);

  static const income  = Color(0xFF34D399);
  static const expense = Color(0xFFFB7185);
  static const amber   = Color(0xFFFBBF24);
  static const violet  = Color(0xFFA78BFA);
  static const sky     = Color(0xFF38BDF8);

  static const text1   = Color(0xFFEEF1F6);
  static const text2   = Color(0xFFC4CBD6);
  static const text3   = Color(0xFF98A2B3);
  static const text4   = Color(0xFF5B6573);
  static const text5   = Color(0xFF4B5462);

  static const border  = Color(0x12FFFFFF); // ~7% white
}

final nestTheme = ThemeData(
  brightness: Brightness.dark,
  scaffoldBackgroundColor: NestColors.base,
  colorScheme: ColorScheme.dark(
    primary: NestColors.indigo,
    secondary: NestColors.teal,
    surface: NestColors.surface,
    error: NestColors.expense,
    onPrimary: NestColors.base,
    onSurface: NestColors.text1,
  ),
  fontFamily: 'Inter',
  useMaterial3: true,
  appBarTheme: const AppBarTheme(
    backgroundColor: NestColors.base,
    foregroundColor: NestColors.text1,
    elevation: 0,
    scrolledUnderElevation: 0,
  ),
  navigationBarTheme: NavigationBarThemeData(
    backgroundColor: NestColors.sidebar,
    indicatorColor: NestColors.indigo.withOpacity(0.15),
    labelTextStyle: WidgetStateProperty.all(
      const TextStyle(fontSize: 10, fontWeight: FontWeight.w600),
    ),
    iconTheme: WidgetStateProperty.resolveWith((states) {
      if (states.contains(WidgetState.selected)) {
        return const IconThemeData(color: NestColors.indigoL, size: 23);
      }
      return const IconThemeData(color: NestColors.text4, size: 23);
    }),
  ),
  cardTheme: CardThemeData(
    color: NestColors.surface,
    elevation: 0,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(16),
      side: BorderSide(color: NestColors.border),
    ),
  ),
  inputDecorationTheme: InputDecorationTheme(
    filled: true,
    fillColor: NestColors.surface,
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: BorderSide(color: NestColors.border),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: BorderSide(color: NestColors.border),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: const BorderSide(color: NestColors.indigo),
    ),
    labelStyle: const TextStyle(color: NestColors.text3),
    hintStyle: const TextStyle(color: NestColors.text4),
  ),
  textTheme: const TextTheme(
    displayLarge: TextStyle(
      fontFamily: 'InterTight',
      fontWeight: FontWeight.w800,
      fontSize: 34,
      letterSpacing: -1.0,
      color: NestColors.text1,
    ),
    headlineMedium: TextStyle(
      fontWeight: FontWeight.w700,
      fontSize: 20,
      color: NestColors.text1,
    ),
    titleMedium: TextStyle(
      fontWeight: FontWeight.w600,
      fontSize: 15,
      color: NestColors.text1,
    ),
    bodyMedium: TextStyle(
      fontWeight: FontWeight.w400,
      fontSize: 14,
      color: NestColors.text2,
    ),
    labelSmall: TextStyle(
      fontWeight: FontWeight.w500,
      fontSize: 11,
      color: NestColors.text3,
    ),
  ),
);
