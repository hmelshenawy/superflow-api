import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:prioraflow_tech/core/errors/error_handler.dart';
import 'package:prioraflow_tech/core/theme/app_colors.dart';
import 'package:prioraflow_tech/core/theme/snackbar.dart';
import 'package:prioraflow_tech/features/inspection/data/models/qc_checklist.dart';
import 'package:prioraflow_tech/features/inspection/presentation/qc_checklist_provider.dart';

/// Screen to select a QC checklist template before starting a QC inspection.
class QcTemplateSelectScreen extends ConsumerStatefulWidget {
  const QcTemplateSelectScreen({super.key, required this.jobId});
  final String jobId;

  @override
  ConsumerState<QcTemplateSelectScreen> createState() =>
      _QcTemplateSelectScreenState();
}

class _QcTemplateSelectScreenState
    extends ConsumerState<QcTemplateSelectScreen> {
  bool _creating = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final state = ref.read(qcTemplatesProvider);
      state.whenData((templates) {
        if (templates.length == 1) {
          _startChecklist(templates.first);
        }
      });
    });
  }

  Future<void> _startChecklist(QcChecklistTemplate template) async {
    if (_creating) return;
    setState(() => _creating = true);
    try {
      final notifier =
          ref.read(qcChecklistDetailProvider(widget.jobId).notifier);
      final checklist = await notifier.startChecklist(
        jobId: widget.jobId,
        templateId: template.id,
      );
      if (mounted) {
        context.go('/jobs/${widget.jobId}/qc-checklist/${checklist.id}');
      }
    } catch (e) {
      if (mounted) {
        showErrorSnackBar(context, handleError(e).message);
      }
    } finally {
      if (mounted) setState(() => _creating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final templatesAsync = ref.watch(qcTemplatesProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Select QC Checklist Template'),
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.foreground,
        elevation: 0,
      ),
      body: templatesAsync.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(handleError(e).message,
                  style: const TextStyle(color: AppColors.danger)),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.invalidate(qcTemplatesProvider),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (templates) {
          if (templates.isEmpty) {
            return const Center(
              child: Text(
                'No QC checklist templates available.\nAsk your workshop admin to create one.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.textMuted, fontSize: 14),
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(qcTemplatesProvider),
            child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: templates.length,
            itemBuilder: (context, index) {
              return _QcTemplateCard(
                template: templates[index],
                onTap: () => _startChecklist(templates[index]),
              );
            },
          ),
          );
        },
      ),
    );
  }
}

class _QcTemplateCard extends StatelessWidget {
  const _QcTemplateCard({
    required this.template,
    required this.onTap,
  });

  final QcChecklistTemplate template;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.statusQualityCheck.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    Icons.verified_user_outlined,
                    color: AppColors.statusQualityCheck,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              template.name ?? 'Unnamed QC Template',
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                                color: AppColors.foreground,
                              ),
                            ),
                          ),
                          if (template.isDefault == true) ...[
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppColors.statusQualityCheck
                                    .withOpacity(0.12),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Text(
                                'Default',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.statusQualityCheck,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                      if (template.description != null &&
                          template.description!.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(
                          template.description!,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppColors.textMuted,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right, color: AppColors.textMuted),
              ],
            ),
          ),
        ),
      ),
    );
  }
}