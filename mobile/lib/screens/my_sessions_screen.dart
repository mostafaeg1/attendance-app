import 'package:flutter/material.dart';
import '../services/attendance_service.dart';

class MySessionsScreen extends StatefulWidget {
  const MySessionsScreen({super.key});

  @override
  State<MySessionsScreen> createState() => _MySessionsScreenState();
}

class _MySessionsScreenState extends State<MySessionsScreen> {
  late Future<List<Map<String, dynamic>>> _future;

  @override
  void initState() {
    super.initState();
    _future = AttendanceService.getMyAttendance();
  }

  Future<void> _refresh() async {
    final future = AttendanceService.getMyAttendance();
    setState(() => _future = future);
    await future;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Sessions')),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: FutureBuilder<List<Map<String, dynamic>>>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }

            if (snapshot.hasError) {
              return const _EmptyState(
                message: "Couldn't load your sessions.",
                scrollable: true,
              );
            }

            final rows = snapshot.data ?? [];
            if (rows.isEmpty) {
              return const _EmptyState(
                message: 'No sessions yet. Scan a QR code to check in.',
                scrollable: true,
              );
            }

            final groups = _groupByCourse(rows);

            return ListView(
              padding: const EdgeInsets.symmetric(vertical: 8),
              children: [
                for (var i = 0; i < groups.length; i++) ...[
                  Padding(
                    padding: EdgeInsets.fromLTRB(16, i == 0 ? 8 : 24, 16, 8),
                    child: Text(
                      groups[i].courseName,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  for (var j = 0; j < groups[i].rows.length; j++) ...[
                    _SessionTile(row: groups[i].rows[j]),
                    if (j != groups[i].rows.length - 1)
                      const Divider(height: 1, indent: 16, endIndent: 16),
                  ],
                ],
              ],
            );
          },
        ),
      ),
    );
  }

  static List<_CourseGroup> _groupByCourse(List<Map<String, dynamic>> rows) {
    final groups = <String, _CourseGroup>{};
    for (final row in rows) {
      final session = row['session'] as Map<String, dynamic>?;
      final course = session?['course'] as Map<String, dynamic>?;
      final courseId = course?['id'] as String? ?? 'unknown';
      final courseName = course?['name'] as String? ?? 'Other sessions';

      groups
          .putIfAbsent(courseId, () => _CourseGroup(courseName: courseName))
          .rows
          .add(row);
    }
    // Rows arrive most-recent-first, and Map preserves first-insertion
    // order, so courses come out ordered by their most recent session.
    return groups.values.toList();
  }
}

class _CourseGroup {
  _CourseGroup({required this.courseName});

  final String courseName;
  final List<Map<String, dynamic>> rows = [];
}

class _SessionTile extends StatelessWidget {
  const _SessionTile({required this.row});

  final Map<String, dynamic> row;

  @override
  Widget build(BuildContext context) {
    final session = row['session'] as Map<String, dynamic>?;
    final title = session?['title'] as String? ?? 'Untitled session';
    final date = session?['date'] as String?;
    final startTime = session?['start_time'] as String?;
    final status = row['status'] as String? ?? 'present';

    final subtitleParts = <String>[
      if (date != null) _formatDate(date),
      if (startTime != null) startTime.substring(0, 5),
    ];

    return ListTile(
      title: Text(title),
      subtitle: subtitleParts.isEmpty ? null : Text(subtitleParts.join(' · ')),
      trailing: _StatusBadge(status: status),
    );
  }

  static String _formatDate(String isoDate) {
    final parsed = DateTime.tryParse(isoDate);
    if (parsed == null) return isoDate;
    return '${parsed.month}/${parsed.day}/${parsed.year}';
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final color = switch (status) {
      'present' => const Color(0xFF16A34A),
      'excused' => const Color(0xFF6B7280),
      _ => const Color(0xFFDC2626),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        status,
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.message, this.scrollable = false});

  final String message;
  final bool scrollable;

  @override
  Widget build(BuildContext context) {
    final text = Padding(
      padding: const EdgeInsets.all(24),
      child: Text(
        message,
        style: Theme.of(context).textTheme.bodyMedium,
        textAlign: TextAlign.center,
      ),
    );

    if (!scrollable) {
      return Center(child: text);
    }

    // Keeps RefreshIndicator's pull-to-refresh gesture working even when
    // there's no list content to scroll.
    return LayoutBuilder(
      builder: (context, constraints) => SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: constraints.maxHeight),
          child: Center(child: text),
        ),
      ),
    );
  }
}
