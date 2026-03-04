import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'config/supabase_config.dart';
import 'providers/family_provider.dart';
import 'app.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('ko_KR');
  await SupabaseConfig.initialize();

  final container = ProviderContainer();
  await container.read(familyProvider.notifier).loadFromLocal();
  await container.read(currentMemberProvider.notifier).loadFromLocal();

  runApp(
    UncontrolledProviderScope(
      container: container,
      child: const JiiMoneyApp(),
    ),
  );
}
