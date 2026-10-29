import 'package:geolocator/geolocator.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class CheckInResult {
  const CheckInResult({
    required this.sessionId,
    required this.courseId,
    required this.courseName,
    required this.sessionTitle,
    required this.alreadyCheckedIn,
  });

  final String sessionId;
  final String courseId;
  final String? courseName;
  final String? sessionTitle;
  final bool alreadyCheckedIn;
}

class AttendanceService {
  /// Extracts the session token from a scanned QR value. The web app's QR
  /// encodes a full "{origin}/scan/{token}" URL, but this also accepts a
  /// bare token so a directly-encoded value still works.
  static String extractToken(String scanned) {
    final uri = Uri.tryParse(scanned.trim());
    if (uri != null && uri.pathSegments.isNotEmpty) {
      return uri.pathSegments.last;
    }
    return scanned.trim();
  }

  /// Whether a scanned value is a course's permanent "fixed" QR code
  /// ("{origin}/scan/fixed/{courseId}") rather than a per-session one.
  static bool _isFixedScan(String scanned) {
    final segments = Uri.tryParse(scanned.trim())?.pathSegments ?? const [];
    return segments.length >= 2 && segments[segments.length - 2] == 'fixed';
  }

  /// Best-effort current position for location-constrained sessions. Returns
  /// null on denied/disabled permissions or a timeout — the server decides
  /// whether a location was actually required for this session.
  static Future<Position?> _getCurrentLocation() async {
    try {
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        return null;
      }
      if (!await Geolocator.isLocationServiceEnabled()) {
        return null;
      }
      return await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 10),
        ),
      );
    } catch (_) {
      return null;
    }
  }

  /// Calls the `check_in` RPC (per-session QR) or `fixed_check_in` RPC
  /// (permanent, printable per-course QR — see
  /// supabase/migrations/012_fixed_check_in.sql), auto-enrolling the
  /// attendee and recording attendance either way.
  static Future<CheckInResult> checkIn(String scannedValue) async {
    final Map<String, dynamic> response;
    if (_isFixedScan(scannedValue)) {
      final courseId = Uri.parse(scannedValue.trim()).pathSegments.last;
      response = await Supabase.instance.client
          .rpc('fixed_check_in', params: {'p_course_id': courseId})
          .single();
    } else {
      final token = extractToken(scannedValue);
      final position = await _getCurrentLocation();
      response = await Supabase.instance.client.rpc('check_in', params: {
        'p_token': token,
        if (position != null) 'p_lat': position.latitude,
        if (position != null) 'p_lng': position.longitude,
      }).single();
    }

    final courseId = response['out_course_id'] as String;
    String? courseName;
    try {
      final course = await Supabase.instance.client
          .from('courses')
          .select('name')
          .eq('id', courseId)
          .maybeSingle();
      courseName = course?['name'] as String?;
    } catch (_) {
      courseName = null;
    }

    return CheckInResult(
      sessionId: response['out_session_id'] as String,
      courseId: courseId,
      courseName: courseName,
      sessionTitle: response['out_session_title'] as String?,
      alreadyCheckedIn: response['out_already_checked_in'] as bool,
    );
  }

  /// The signed-in attendee's attendance history, most recent session
  /// first — real check-ins plus a synthesized "absent" entry for every
  /// ended session in an enrolled course that has no check-in at all.
  static Future<List<Map<String, dynamic>>> getMyAttendance() async {
    final client = Supabase.instance.client;
    final userId = client.auth.currentUser?.id;
    if (userId == null) return [];

    final attendanceRows = List<Map<String, dynamic>>.from(
      await client
          .from('attendance')
          .select(
            'status, scanned_at, session:sessions(id, title, date, start_time, end_time, course:courses(id, name))',
          )
          .eq('attendee_id', userId) as List,
    );

    final attendedSessionIds = attendanceRows
        .map((row) => (row['session'] as Map<String, dynamic>?)?['id'] as String?)
        .whereType<String>()
        .toSet();

    final enrollments = List<Map<String, dynamic>>.from(
      await client
          .from('course_enrollments')
          .select('course_id')
          .eq('attendee_id', userId) as List,
    );
    final courseIds = enrollments
        .map((row) => row['course_id'] as String?)
        .whereType<String>()
        .toList();

    final missedRows = <Map<String, dynamic>>[];
    if (courseIds.isNotEmpty) {
      final endedSessions = List<Map<String, dynamic>>.from(
        await client
            .from('sessions')
            .select('id, title, date, start_time, end_time, course:courses(id, name)')
            .inFilter('course_id', courseIds)
            .eq('is_active', false) as List,
      );

      for (final session in endedSessions) {
        if (attendedSessionIds.contains(session['id'] as String?)) continue;
        missedRows.add({'status': 'absent', 'scanned_at': null, 'session': session});
      }
    }

    final combined = [...attendanceRows, ...missedRows];
    combined.sort((a, b) => _sessionSortKey(b).compareTo(_sessionSortKey(a)));
    return combined;
  }

  static DateTime _sessionSortKey(Map<String, dynamic> row) {
    final session = row['session'] as Map<String, dynamic>?;
    final date = session?['date'] as String?;
    if (date == null) return DateTime.fromMillisecondsSinceEpoch(0);
    final startTime = (session?['start_time'] as String?) ?? '00:00:00';
    final time = startTime.length >= 8 ? startTime.substring(0, 8) : startTime;
    return DateTime.tryParse('${date}T$time') ?? DateTime.fromMillisecondsSinceEpoch(0);
  }
}
