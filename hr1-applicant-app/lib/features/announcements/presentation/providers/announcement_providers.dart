import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_applicant_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_applicant_app/features/announcements/data/repositories/supabase_announcements_repository.dart';
import 'package:hr1_applicant_app/features/announcements/domain/entities/announcement.dart';

final announcementsRepositoryProvider =
    Provider<SupabaseAnnouncementsRepository>((ref) {
      final user = ref.watch(appUserProvider);
      return SupabaseAnnouncementsRepository(
        ref.watch(supabaseClientProvider),
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
