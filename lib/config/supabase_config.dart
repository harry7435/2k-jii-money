import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseConfig {
  // TODO: Supabase 프로젝트 생성 후 실제 값으로 교체
  static const String supabaseUrl = 'https://YOUR_PROJECT.supabase.co';
  static const String supabaseAnonKey = 'YOUR_ANON_KEY';

  static Future<void> initialize() async {
    await Supabase.initialize(
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
    );
  }

  static SupabaseClient get client => Supabase.instance.client;
}
