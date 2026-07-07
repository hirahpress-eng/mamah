---
Task ID: 2
Agent: fullstack-developer
Task: Create Firebase configuration and auto-sync functionality

Work Log:
- Read worklog.md and understood full project context (ScholarGen AI v1.3.0)
- Verified firebase@^12.12.1 already installed in package.json
- Reviewed GeneratedArticle, ArticleSection, Reference types from article-store.ts
- Reviewed existing article/generate route.ts for context

- Created `/home/z/my-project/src/lib/firebase.ts`:
  - Firebase config from env vars (NEXT_PUBLIC_FIREBASE_API_KEY, AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID, APP_ID)
  - Lazy singleton initialisation via `ensureInitialised()` — Firebase SDK only imported when actually needed
  - Graceful degradation: if env vars missing, all functions log warnings and return safe defaults
  - Exports: isFirebaseReady(), getApp(), getDb(), syncArticleToFirebase(), getArticleFromFirebase(), listUserArticles(), deleteArticleFromFirebase()
  - FirestoreArticle interface for typed document data
  - syncArticleToFirebase uses set() with merge:true; generates deterministic docId from title hash + timestamp suffix
  - listUserArticles uses query with where('userId','==',userId) + orderBy('updatedAt','desc')

- Created `/home/z/my-project/src/app/api/firebase/sync/route.ts`:
  - POST endpoint: accepts { article, userId?, docId? }, validates, calls syncArticleToFirebase, returns { success, id?, error?, disabled? }
  - GET endpoint: ?articleId=xxx fetches single article, ?userId=xxx lists user articles, returns { success, article/articles?, count?, error?, disabled? }
  - Both endpoints handle Firebase-not-configured as soft failure (200 with disabled flag)

- Updated `/home/z/my-project/.env.example`:
  - Added FIREBASE CONFIGURATION section with 6 commented env vars between RESEARCH APIs and OPTIONAL sections

- Created `/home/z/my-project/src/lib/firebase-auto-sync.ts`:
  - Exports autoSyncAfterGeneration(article, userId?) — fire-and-forget wrapper
  - Uses void + .then/.catch pattern for non-blocking execution
  - Logs success/failure to console with [Firebase Auto-Sync] prefix
  - Never throws — all errors caught and logged silently

- Lint: zero errors (`bun run lint`)
- Dev server: compiles successfully, HTTP 200 verified

Stage Summary:
- 4 files created/modified: firebase.ts (new), route.ts (new), .env.example (modified), firebase-auto-sync.ts (new)
- Firebase integration with complete graceful degradation — app works identically without Firebase configured
- Lazy SDK loading avoids startup overhead when Firebase is disabled
- Zero breaking changes to existing functionality
- New dependencies: none (firebase@^12.12.1 already installed)
