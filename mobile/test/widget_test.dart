import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/screens/phone_entry_screen.dart';

void main() {
  testWidgets('PhoneEntryScreen shows a phone field and send-code button',
      (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: PhoneEntryScreen()));

    expect(find.widgetWithText(TextFormField, 'Phone number'), findsOneWidget);
    expect(find.widgetWithText(FilledButton, 'Send code'), findsOneWidget);
  });

  testWidgets('PhoneEntryScreen validates an empty or malformed number',
      (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: PhoneEntryScreen()));

    await tester.tap(find.widgetWithText(FilledButton, 'Send code'));
    await tester.pump();
    expect(find.text('Phone number is required'), findsOneWidget);

    await tester.enterText(
      find.widgetWithText(TextFormField, 'Phone number'),
      '12345',
    );
    await tester.tap(find.widgetWithText(FilledButton, 'Send code'));
    await tester.pump();
    expect(
      find.text('Enter your number with country code, e.g. +972505970038'),
      findsOneWidget,
    );
  });
}
