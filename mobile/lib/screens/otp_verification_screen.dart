import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Second step of the phone + OTP auth flow: verifies the code texted to
/// [phone]. On success, Supabase creates a session (persisted locally by
/// supabase_flutter, so the user stays signed in across app launches) —
/// AuthGate's onAuthStateChange listener reacts to that and swaps to either
/// CompleteProfileScreen (first-time numbers, no profile row yet) or
/// HomeScreen. This screen just pops itself to reveal whichever AuthGate
/// now shows underneath.
class OtpVerificationScreen extends StatefulWidget {
  const OtpVerificationScreen({super.key, required this.phone});

  final String phone;

  @override
  State<OtpVerificationScreen> createState() => _OtpVerificationScreenState();
}

class _OtpVerificationScreenState extends State<OtpVerificationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _codeController = TextEditingController();
  bool _isVerifying = false;
  bool _isResending = false;
  String? _error;
  String? _message;

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _verify() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isVerifying = true;
      _error = null;
      _message = null;
    });

    try {
      await Supabase.instance.client.auth.verifyOTP(
        type: OtpType.sms,
        phone: widget.phone,
        token: _codeController.text.trim(),
      );
      if (mounted) Navigator.of(context).pop();
    } on AuthException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Something went wrong. Please try again.');
    } finally {
      if (mounted) setState(() => _isVerifying = false);
    }
  }

  Future<void> _resendCode() async {
    setState(() {
      _isResending = true;
      _error = null;
      _message = null;
    });

    try {
      await Supabase.instance.client.auth.signInWithOtp(phone: widget.phone);
      setState(() => _message = 'Code resent.');
    } on AuthException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Something went wrong. Please try again.');
    } finally {
      if (mounted) setState(() => _isResending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Enter code',
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'We texted a code to ${widget.phone}.',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 24),
                  TextFormField(
                    controller: _codeController,
                    keyboardType: TextInputType.number,
                    autofillHints: const [AutofillHints.oneTimeCode],
                    maxLength: 6,
                    decoration: const InputDecoration(
                      labelText: '6-digit code',
                      counterText: '',
                    ),
                    validator: (value) {
                      final trimmed = value?.trim() ?? '';
                      if (trimmed.isEmpty) return 'Code is required';
                      if (trimmed.length != 6) return 'Enter the 6-digit code';
                      return null;
                    },
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Text(
                      _error!,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                      ),
                    ),
                  ],
                  if (_message != null) ...[
                    const SizedBox(height: 12),
                    Text(_message!, style: Theme.of(context).textTheme.bodyMedium),
                  ],
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: _isVerifying ? null : _verify,
                    child: _isVerifying
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Text('Verify'),
                  ),
                  const SizedBox(height: 12),
                  TextButton(
                    onPressed: _isResending ? null : _resendCode,
                    child: Text(
                      _isResending ? 'Resending…' : "Didn't get a code? Resend",
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
