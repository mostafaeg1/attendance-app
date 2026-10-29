import 'package:supabase_flutter/supabase_flutter.dart';

/// Ensures a `public.users` profile row exists for the signed-in attendee.
/// Mirrors the web app's `ensureTeacherProfile` (web/lib/supabase/profile.ts),
/// but for the `attendee` role, keyed by phone number (no email — the mobile
/// app signs students up/in via phone + SMS OTP). Called on every successful
/// OTP verification so a profile row missing for any reason self-heals.
class ProfileService {
  /// Whether a `public.users` row already exists for this account. New
  /// phone sign-ups have none yet — the app uses this to decide whether to
  /// show the "complete your profile" (name + ID number) step.
  static Future<bool> hasProfile(String userId) async {
    final row = await Supabase.instance.client
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();
    return row != null;
  }

  /// The attendee's display name from `public.users`, for greeting them by
  /// name once signed in.
  static Future<String?> getName(String userId) async {
    final row = await Supabase.instance.client
        .from('users')
        .select('name')
        .eq('id', userId)
        .maybeSingle();
    return row?['name'] as String?;
  }

  static Future<void> ensureAttendeeProfile(
    User user, {
    String? name,
    String? idNumber,
  }) async {
    final displayName = _firstNonEmpty([
          name,
          user.userMetadata?['name'] as String?,
          user.phone != null ? 'Student ${_lastDigits(user.phone!, 4)}' : null,
        ]) ??
        'Student';

    final trimmedIdNumber = idNumber?.trim();

    await Supabase.instance.client.from('users').upsert({
      'id': user.id,
      'phone': user.phone,
      'name': displayName,
      'role': 'attendee',
      // Only set id_number when provided, so a self-heal upsert for an
      // existing profile (no idNumber passed) never blanks it out.
      if (trimmedIdNumber != null && trimmedIdNumber.isNotEmpty)
        'id_number': trimmedIdNumber,
    });
  }

  static String? _firstNonEmpty(List<String?> values) {
    for (final value in values) {
      final trimmed = value?.trim();
      if (trimmed != null && trimmed.isNotEmpty) return trimmed;
    }
    return null;
  }

  static String _lastDigits(String phone, int count) {
    final digits = phone.replaceAll(RegExp(r'\D'), '');
    return digits.length <= count
        ? digits
        : digits.substring(digits.length - count);
  }
}
