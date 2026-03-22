import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';
import '../../../../core/router/app_router.dart';
import '../../../../shared/widgets/widgets.dart';
import '../../domain/entities/service_request.dart';
import '../providers/service_request_providers.dart';

/// サービスリクエスト画面
class ServiceRequestListScreen extends ConsumerWidget {
  const ServiceRequestListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final requestsAsync = ref.watch(serviceRequestsProvider);

    return Scaffold(
      appBar: AppBar(title: Text('サービスリクエスト', style: AppTextStyles.callout)),
      body: requestsAsync.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) =>
            ErrorState(onRetry: () => ref.invalidate(serviceRequestsProvider)),
        data: (requests) => _Body(requests: requests),
      ),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({required this.requests});

  final List<ServiceRequest> requests;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.lg),
      children: [
        // 新規作成セクション
        GroupedSection(
          title: 'リクエストを作成',
          children: [
            MenuRow(
              icon: const Icon(Icons.bug_report_outlined),
              title: 'バグ報告',
              subtitle: '不具合や問題を報告する',
              showChevron: true,
              onTap: () => context.push(
                AppRoutes.serviceRequestCreate,
                extra: ServiceRequestType.bug,
              ),
            ),
            MenuRow(
              icon: const Icon(Icons.lightbulb_outline_rounded),
              title: '追加の機能をリクエストする',
              subtitle: '新機能や改善の要望を送る',
              showChevron: true,
              onTap: () => context.push(
                AppRoutes.serviceRequestCreate,
                extra: ServiceRequestType.feature,
              ),
            ),
          ],
        ),

        if (requests.isNotEmpty) ...[
          const SizedBox(height: AppSpacing.xxl),

          // 過去のリクエスト
          GroupedSection(
            title: '過去のリクエスト',
            children: requests.map((req) => _RequestRow(request: req)).toList(),
          ),
        ],
      ],
    );
  }
}

class _RequestRow extends StatelessWidget {
  const _RequestRow({required this.request});

  final ServiceRequest request;

  @override
  Widget build(BuildContext context) {
    final isFeature = request.type == ServiceRequestType.feature;

    return MenuRow(
      icon: Icon(
        isFeature ? Icons.lightbulb_outline_rounded : Icons.bug_report_outlined,
      ),
      title: request.title,
      subtitle: _formatStatus(request.status),
    );
  }

  String _formatStatus(ServiceRequestStatus status) {
    final date =
        '${request.createdAt.year}/${request.createdAt.month}/${request.createdAt.day}';
    return '${status.label} · $date';
  }
}
