import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/auth/auth_provider.dart';
import 'core/notifications/ntfy_service.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
  ));
  runApp(const ProviderScope(child: NestApp()));
}

class NestApp extends ConsumerWidget {
  const NestApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    // Start ntfy subscription when authenticated; dispose on logout.
    final authAsync = ref.watch(authNotifierProvider);
    authAsync.whenData((session) {
      if (session != null && session.userId.isNotEmpty) {
        ref.watch(ntfySubscriptionProvider(session.userId));
      }
    });

    return MaterialApp.router(
      title: 'Nest',
      theme: nestTheme,
      routerConfig: router,
      debugShowCheckedModeBanner: false,
    );
  }
}
