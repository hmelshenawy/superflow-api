import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:prioraflow_tech/core/offline/offline_banner.dart';
import 'package:prioraflow_tech/core/theme/app_theme.dart';
import 'package:prioraflow_tech/router/app_router.dart';
import 'package:prioraflow_tech/l10n/app_localizations.dart';

class PrioraFlowApp extends ConsumerWidget {
  const PrioraFlowApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);

    return MaterialApp.router(
      title: 'PrioraFlow',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.dark,
      routerDelegate: router.routerDelegate,
      routeInformationParser: router.routeInformationParser,
      routeInformationProvider: router.routeInformationProvider,
      localizationsDelegates: S.localizationsDelegates,
      supportedLocales: S.supportedLocales,
      locale: const Locale('en'),
      builder: (context, child) {
        return Column(
          children: [
            const OfflineBanner(),
            Expanded(child: child ?? const SizedBox.shrink()),
          ],
        );
      },
    );
  }
}