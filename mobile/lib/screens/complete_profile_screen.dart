import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/profile_service.dart';

/// Shown by AuthGate in place of HomeScreen whenever the signed-in user has
/// no `public.users` row yet (first-time sign-up) — collects the required
/// full name and ID number, then calls [onComplete] so AuthGate re-checks
/// and swaps to HomeScreen. Rendered as AuthGate's own content rather than
/// pushed as a route, so there's no HomeScreen underneath for the system
/// back button to reveal before the profile is actually complete.
class CompleteProfileScreen extends StatefulWidget {
  const CompleteProfileScreen({
    super.key,
    required this.user,
    required this.onComplete,
  });

  final User user;
  final VoidCallback onComplete;

  @override
  State<CompleteProfileScreen> createState() => _CompleteProfileScreenState();
}

class _CompleteProfileScreenState extends State<CompleteProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _idNumberController = TextEditingController();
  bool _isLoading = false;
  String? _error;

  @override
  void dispose() {
    _nameController.dispose();
    _idNumberController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      await ProfileService.ensureAttendeeProfile(
        widget.user,
        name: _nameController.text.trim(),
        idNumber: _idNumberController.text.trim(),
      );
      widget.onComplete();
    } on PostgrestException catch (e) {
      setState(() {
        _error = e.code == '23505'
            ? 'That ID number is already registered.'
            : e.message;
      });
    } catch (_) {
      setState(() => _error = 'Something went wrong. Please try again.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
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
                    'Complete your profile',
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'One last step before you can check in to sessions.',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 24),
                  TextFormField(
                    controller: _nameController,
                    autofillHints: const [AutofillHints.name],
                    decoration: const InputDecoration(labelText: 'Full name'),
                    validator: (value) =>
                        (value == null || value.trim().isEmpty)
                            ? 'Full name is required'
                            : null,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _idNumberController,
                    decoration: const InputDecoration(labelText: 'ID number'),
                    validator: (value) =>
                        (value == null || value.trim().isEmpty)
                            ? 'ID number is required'
                            : null,
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
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: _isLoading ? null : _submit,
                    child: _isLoading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Text('Continue'),
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
