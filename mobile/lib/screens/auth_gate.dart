import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/profile_service.dart';
import 'complete_profile_screen.dart';
import 'home_screen.dart';
import 'phone_entry_screen.dart';

/// Switches between the auth flow, profile completion, and the signed-in
/// app based on the current Supabase session AND whether a `public.users`
/// profile row exists for it — not session state alone. This is what keeps
/// a user from ever landing in HomeScreen without a completed profile (e.g.
/// by pressing back while on the profile-completion step): that step is
/// rendered here as the gate's own content, not pushed as a route on top of
/// an already-mounted HomeScreen, so there's nothing underneath to reveal.
class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  String? _profileFutureUserId;
  Future<bool>? _profileFuture;

  Future<bool> _profileFutureFor(String userId) {
    if (_profileFutureUserId != userId) {
      _profileFutureUserId = userId;
      _profileFuture = ProfileService.hasProfile(userId);
    }
    return _profileFuture!;
  }

  void _refreshProfile(String userId) {
    setState(() => _profileFuture = ProfileService.hasProfile(userId));
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<AuthState>(
      stream: Supabase.instance.client.auth.onAuthStateChange,
      initialData: AuthState(
        AuthChangeEvent.initialSession,
        Supabase.instance.client.auth.currentSession,
      ),
      builder: (context, snapshot) {
        final user = snapshot.data?.session?.user;
        if (user == null) return const PhoneEntryScreen();

        return FutureBuilder<bool>(
          future: _profileFutureFor(user.id),
          builder: (context, profileSnapshot) {
            if (!profileSnapshot.hasData) {
              return const Scaffold(
                body: Center(child: CircularProgressIndicator()),
              );
            }
            return profileSnapshot.data!
                ? const HomeScreen()
                : CompleteProfileScreen(
                    user: user,
                    onComplete: () => _refreshProfile(user.id),
                  );
          },
        );
      },
    );
  }
}
