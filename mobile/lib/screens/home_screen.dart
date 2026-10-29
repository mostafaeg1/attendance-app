import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../main.dart';
import '../services/attendance_service.dart';
import '../services/profile_service.dart';
import 'check_in_success_screen.dart';
import 'my_sessions_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with RouteAware {
  final MobileScannerController _controller = MobileScannerController();
  String? _name;
  bool _isCheckingIn = false;

  @override
  void initState() {
    super.initState();
    _loadName();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    routeObserver.subscribe(this, ModalRoute.of(context) as PageRoute);
  }

  Future<void> _loadName() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    final name = await ProfileService.getName(user.id);
    if (mounted) setState(() => _name = name);
  }

  @override
  void dispose() {
    routeObserver.unsubscribe(this);
    _controller.dispose();
    super.dispose();
  }

  // RouteAware: another screen was pushed on top of this one — stop
  // scanning so pointing the camera at a QR code elsewhere in the app
  // doesn't silently check the student in.
  @override
  void didPushNext() => _controller.stop();

  // RouteAware: back on top again — resume scanning.
  @override
  void didPopNext() => _controller.start();

  void _onDetect(BarcodeCapture capture) {
    final barcodes = capture.barcodes;
    if (barcodes.isEmpty) return;
    _handleScannedCode(barcodes.first.rawValue);
  }

  Future<void> _handleScannedCode(String? code) async {
    if (code == null || _isCheckingIn) return;
    setState(() => _isCheckingIn = true);

    try {
      final result = await AttendanceService.checkIn(code);
      if (!mounted) return;

      if (result.alreadyCheckedIn) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("You're already checked in.")),
        );
      } else {
        await Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => CheckInSuccessScreen(
              courseName: result.courseName ?? 'Course',
              sessionTitle: result.sessionTitle ?? 'Session',
            ),
          ),
        );
      }
    } on PostgrestException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Something went wrong. Please try again.'),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isCheckingIn = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final welcomeMessage = _name != null ? 'Welcome, $_name!' : 'Welcome!';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Attendance assistant'),
        actions: [
          IconButton(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const MySessionsScreen()),
            ),
            icon: const Icon(Icons.history),
            tooltip: 'My sessions',
          ),
          IconButton(
            onPressed: () => Supabase.instance.client.auth.signOut(),
            icon: const Icon(Icons.logout),
            tooltip: 'Sign out',
          ),
        ],
      ),
      body: SafeArea(
        top: false,
        child: Column(
          children: [
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  MobileScanner(controller: _controller, onDetect: _onDetect),
                  if (_isCheckingIn)
                    const ColoredBox(
                      color: Colors.black45,
                      child: Center(
                        child: CircularProgressIndicator(color: Colors.white),
                      ),
                    ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                welcomeMessage,
                style: Theme.of(context).textTheme.bodyLarge,
                textAlign: TextAlign.center,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
