import 'package:flutter/material.dart';

class CheckInSuccessScreen extends StatelessWidget {
  const CheckInSuccessScreen({
    super.key,
    required this.courseName,
    required this.sessionTitle,
  });

  final String courseName;
  final String sessionTitle;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(),
      body: Column(
        children: [
          const SizedBox(height: 16),
          FractionallySizedBox(
            widthFactor: 0.8,
            child: Text(
              courseName,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w700),
            ),
          ),
          const SizedBox(height: 8),
          FractionallySizedBox(
            widthFactor: 0.4,
            child: Text(
              sessionTitle,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
            ),
          ),
          Expanded(
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.check_circle,
                    color: Color(0xFF16A34A),
                    size: 120,
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'You are checked in',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
