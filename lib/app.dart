import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'providers/family_provider.dart';
import 'screens/onboarding/welcome_screen.dart';
import 'screens/onboarding/create_family_screen.dart';
import 'screens/onboarding/join_family_screen.dart';
import 'screens/home/home_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final family = ref.watch(familyProvider);

  return GoRouter(
    initialLocation: family == null ? '/welcome' : '/home',
    routes: [
      GoRoute(
        path: '/welcome',
        builder: (context, state) => const WelcomeScreen(),
      ),
      GoRoute(
        path: '/create-family',
        builder: (context, state) => const CreateFamilyScreen(),
      ),
      GoRoute(
        path: '/join-family',
        builder: (context, state) => const JoinFamilyScreen(),
      ),
      GoRoute(
        path: '/home',
        builder: (context, state) => const HomeScreen(),
      ),
    ],
  );
});

class JiiMoneyApp extends ConsumerWidget {
  const JiiMoneyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: '우리집 가계부',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF4ECDC4),
          brightness: Brightness.light,
        ),
        useMaterial3: true,
        fontFamily: 'Pretendard',
      ),
      routerConfig: router,
    );
  }
}
