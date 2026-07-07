/**
 * Firebase Configuration Module
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides Firebase/Firestore integration with graceful degradation.
 * If Firebase env vars are missing, all sync functions log warnings and return
 * safely — the rest of the application is completely unaffected.
 *
 * Exports:
 *   - isFirebaseConfigured()     — check whether Firebase is available
 *   - app                        — FirebaseApp instance (or null)
 *   - db                         — Firestore instance (or null)
 *   - syncArticleToFirebase()    — write / update a generated article
 *   - getArticleFromFirebase()   — fetch a single article by id
 *   - listUserArticles()         — list all articles for a user
 *   - deleteArticleFromFirebase() — remove an article
 */

import type { FirebaseApp } from 'firebase/app';
import type {
  Firestore,
  DocumentData,
  Timestamp,
} from 'firebase/firestore';
import type { GeneratedArticle } from '@/store/article-store';

// ─── Types ──────────────────────────────────────────────────────────────────

/** Shape stored in Firestore `articles/{docId}` */
export interface FirestoreArticle {
  id: string;
  title: string;
  keywords: string[];
  sections: GeneratedArticle['sections'];
  references: GeneratedArticle['references'];
  totalWordCount: number;
  isPolished: boolean;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Config ─────────────────────────────────────────────────────────────────

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** True when all required env vars are present */
function isFirebaseConfigured(): boolean {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
  );
}

// ─── Singleton Initialisation (lazy) ───────────────────────────────────────

let _app: FirebaseApp | null = null;
let _db: Firestore | null = null;
let _initAttempted = false;

async function ensureInitialised(): Promise<{
  app: FirebaseApp | null;
  db: Firestore | null;
}> {
  if (_initAttempted) {
    return { app: _app, db: _db };
  }
  _initAttempted = true;

  if (!isFirebaseConfigured()) {
    console.warn(
      '[Firebase] Configuration is incomplete — cloud sync is disabled. ' +
      'Set NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID, and NEXT_PUBLIC_FIREBASE_APP_ID to enable.',
    );
    return { app: null, db: null };
  }

  try {
    const { initializeApp } = await import('firebase/app');
    const { getFirestore } = await import('firebase/firestore');

    _app = initializeApp(firebaseConfig);
    _db = getFirestore(_app);
    console.info('[Firebase] ✓ Initialised successfully.');
  } catch (err) {
    console.error('[Firebase] Failed to initialise:', err);
  }

  return { app: _app, db: _db };
}

/** Convenience: returns true when Firebase is ready for use */
export async function isFirebaseReady(): Promise<boolean> {
  const { db } = await ensureInitialised();
  return db !== null;
}

// ─── Public Accessors ──────────────────────────────────────────────────────

/**
 * Returns the Firebase app instance. May be null if not configured.
 * NOTE: Because Firebase is lazily imported, call `ensureInitialised()` first
 * if you need the app synchronously after a prior call.
 */
export async function getApp(): Promise<FirebaseApp | null> {
  const { app } = await ensureInitialised();
  return app;
}

export async function getDb(): Promise<Firestore | null> {
  const { db } = await ensureInitialised();
  return db;
}

// ─── Sync Functions ────────────────────────────────────────────────────────

/**
 * Sync a generated article to Firestore.
 *
 * Uses `set` with `merge: true` so repeated calls (e.g. after polish) will
 * update the existing document rather than overwriting unrelated fields.
 *
 * @param article  The GeneratedArticle to persist
 * @param userId   Optional owner identifier
 * @param docId    Optional document id; generated from title hash if omitted
 * @returns `{ success, id }` — id is the Firestore document id
 */
export async function syncArticleToFirebase(
  article: GeneratedArticle,
  userId?: string,
  docId?: string,
): Promise<{ success: boolean; id?: string; error?: string }> {
  const { db } = await ensureInitialised();

  if (!db) {
    console.warn('[Firebase] syncArticleToFirebase skipped — Firebase not configured.');
    return { success: false, error: 'Firebase not configured' };
  }

  try {
    const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');

    const id = docId ?? generateDocId(article.title);
    const ref = doc(db, 'articles', id);

    const now = serverTimestamp();

    await setDoc(
      ref,
      {
        title: article.title,
        keywords: article.keywords,
        sections: article.sections,
        references: article.references,
        totalWordCount: article.totalWordCount,
        isPolished: article.isPolished,
        userId: userId ?? null,
        updatedAt: now,
        // createdAt is only set on first write via merge
        createdAt: now,
      },
      { merge: true },
    );

    console.info(`[Firebase] ✓ Article synced: "${article.title}" → articles/${id}`);
    return { success: true, id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Firebase] syncArticleToFirebase failed:', message);
    return { success: false, error: message };
  }
}

/**
 * Retrieve a single article from Firestore by its document id.
 */
export async function getArticleFromFirebase(
  articleId: string,
): Promise<{ success: boolean; article?: FirestoreArticle; error?: string }> {
  const { db } = await ensureInitialised();

  if (!db) {
    console.warn('[Firebase] getArticleFromFirebase skipped — Firebase not configured.');
    return { success: false, error: 'Firebase not configured' };
  }

  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const ref = doc(db, 'articles', articleId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return { success: false, error: 'Article not found' };
    }

    const data = snap.data() as DocumentData;
    const article: FirestoreArticle = {
      id: snap.id,
      title: data.title ?? '',
      keywords: data.keywords ?? [],
      sections: data.sections ?? [],
      references: data.references ?? [],
      totalWordCount: data.totalWordCount ?? 0,
      isPolished: data.isPolished ?? false,
      userId: data.userId ?? undefined,
      createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
      updatedAt: (data.updatedAt as Timestamp)?.toDate() ?? new Date(),
    };

    return { success: true, article };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Firebase] getArticleFromFirebase failed:', message);
    return { success: false, error: message };
  }
}

/**
 * List all articles belonging to a given user, ordered by updatedAt desc.
 */
export async function listUserArticles(
  userId: string,
): Promise<{ success: boolean; articles?: FirestoreArticle[]; error?: string }> {
  const { db } = await ensureInitialised();

  if (!db) {
    console.warn('[Firebase] listUserArticles skipped — Firebase not configured.');
    return { success: false, error: 'Firebase not configured' };
  }

  try {
    const { collection, getDocs, query, where, orderBy, Timestamp } =
      await import('firebase/firestore');

    const q = query(
      collection(db, 'articles'),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc'),
    );

    const snap = await getDocs(q);
    const articles: FirestoreArticle[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        title: data.title ?? '',
        keywords: data.keywords ?? [],
        sections: data.sections ?? [],
        references: data.references ?? [],
        totalWordCount: data.totalWordCount ?? 0,
        isPolished: data.isPolished ?? false,
        userId: data.userId ?? undefined,
        createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
        updatedAt: (data.updatedAt as Timestamp)?.toDate() ?? new Date(),
      };
    });

    return { success: true, articles };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Firebase] listUserArticles failed:', message);
    return { success: false, error: message };
  }
}

/**
 * Delete an article from Firestore.
 */
export async function deleteArticleFromFirebase(
  articleId: string,
): Promise<{ success: boolean; error?: string }> {
  const { db } = await ensureInitialised();

  if (!db) {
    console.warn('[Firebase] deleteArticleFromFirebase skipped — Firebase not configured.');
    return { success: false, error: 'Firebase not configured' };
  }

  try {
    const { doc, deleteDoc } = await import('firebase/firestore');
    const ref = doc(db, 'articles', articleId);
    await deleteDoc(ref);

    console.info(`[Firebase] ✓ Article deleted: articles/${articleId}`);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Firebase] deleteArticleFromFirebase failed:', message);
    return { success: false, error: message };
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Generate a deterministic Firestore document id from a title.
 * Uses a simple hash to keep ids short, readable, and URL-safe.
 */
function generateDocId(title: string): string {
  // Simple FNV-1a-ish hash → base36 (11 chars = ~64 bits)
  let hash = 0x811c9dc5;
  for (let i = 0; i < title.length; i++) {
    hash ^= title.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  // Make unsigned
  hash = hash >>> 0;
  // Combine with timestamp randomness to avoid collisions on same title
  const suffix = Date.now().toString(36).slice(-4);
  return `${hash.toString(36)}-${suffix}`;
}
