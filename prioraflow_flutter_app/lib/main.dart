import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:path_provider/path_provider.dart';
import 'package:prioraflow_tech/core/api/dio_client.dart';
import 'package:prioraflow_tech/core/offline/draft_service.dart';
import 'app.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load();
  final draftBox = await DraftService.init();
  final dir = await getApplicationDocumentsDirectory();
  appCookiesDir = dir.path;
  runApp(ProviderScope(
    overrides: [
      draftServiceProvider.overrideWithValue(DraftService(draftBox)),
    ],
    child: const PrioraFlowApp(),
  ));
}