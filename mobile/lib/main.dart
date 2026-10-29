import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'config/supabase_config.dart';
import 'screens/auth_gate.dart';
import 'theme/app_theme.dart';

/// Lets screens (e.g. HomeScreen's QR camera) react to being covered or
/// uncovered by another pushed route, so the camera only runs while its
/// own page is actually the one visible on screen.
final routeObserver = RouteObserver<PageRoute>();

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url: SupabaseConfig.url,
    publishableKey: SupabaseConfig.publishableKey,
  );

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Attendance',
      theme: buildAppTheme(),
      navigatorObservers: [routeObserver],
      home: const AuthGate(),
    );
  }
}
