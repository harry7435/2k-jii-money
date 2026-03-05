import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseConfig {
  static const String supabaseUrl =
      String.fromEnvironment('SUPABASE_URL');
  static const String supabaseAnonKey =
      String.fromEnvironment('SUPABASE_ANON_KEY');

  static Future<void> initialize() async {
    assert(supabaseUrl.isNotEmpty, 'SUPABASE_URL이 설정되지 않았습니다. --dart-define-from-file=.env.json 옵션을 사용하세요.');
    assert(supabaseAnonKey.isNotEmpty, 'SUPABASE_ANON_KEY가 설정되지 않았습니다.');

    await Supabase.initialize(
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
    );
  }

  static SupabaseClient get client => Supabase.instance.client;
}
