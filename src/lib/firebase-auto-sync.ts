/**
 * Firebase Auto-Sync Wrapper
 * ─────────────────────────────────────────────────────────────────────────────
 * Fire-and-forget helper that syncs a generated article to Firebase in the
 * background. All errors are caught silently and logged — the caller never
 * awaits the result and is never blocked.
 *
 * Usage (server-side only):
 *   import { autoSyncAfterGeneration } from '@/lib/firebase-auto-sync';
 *   autoSyncAfterGeneration(article, userId);
 */

import { syncArticleToFirebase } from '@/lib/firebase';
import type { GeneratedArticle } from '@/store/article-store';

/**
 * Non-blocking fire-and-forget sync to Firebase.
 *
 * - Does **not** throw — errors are caught and logged.
 * - Returns immediately; the actual sync happens asynchronously.
 * - Safe to call even when Firebase is not configured.
 *
 * @param article  The GeneratedArticle to sync
 * @param userId   Optional owner identifier
 */
export function autoSyncAfterGeneration(
  article: GeneratedArticle,
  userId?: string,
): void {
  // Fire the promise without awaiting — true fire-and-forget
  void syncArticleToFirebase(article, userId)
    .then((result) => {
      if (result.success) {
        console.info(
          `[Firebase Auto-Sync] ✓ Article "${article.title}" synced → ${result.id}`,
        );
      } else {
        console.warn(
          `[Firebase Auto-Sync] ✗ Sync skipped for "${article.title}": ${result.error}`,
        );
      }
    })
    .catch((err) => {
      // Belt-and-suspenders: syncArticleToFirebase already catches,
      // but just in case the promise chain itself rejects.
      console.error('[Firebase Auto-Sync] Unexpected error:', err);
    });
}
