import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/core/organization/organization_context.dart';
import 'package:hr1_employee_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_employee_app/features/announcements/data/repositories/supabase_announcements_repository.dart';
import 'package:hr1_shared/hr1_shared.dart';

final announcementsRepositoryProvider =
    Provider<SupabaseAnnouncementsRepository>((ref) {
      final user = ref.watch(appUserProvider);
      return SupabaseAnnouncementsRepository(
        ref.watch(supabaseClientProvider),
        activeOrganizationId: ref.watch(activeOrganizationIdProvider),
        overrideUserId: user?.id,
      );
    });

final allAnnouncementsProvider = FutureProvider.autoDispose<List<Announcement>>(
  (ref) {
    return ref
        .watch(announcementsRepositoryProvider)
        .getPublishedAnnouncements();
  },
);

final pinnedAnnouncementsProvider =
    FutureProvider.autoDispose<List<Announcement>>((ref) {
      return ref
          .watch(announcementsRepositoryProvider)
          .getPinnedAnnouncements();
    });
