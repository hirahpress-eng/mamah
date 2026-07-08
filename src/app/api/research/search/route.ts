import { NextResponse } from 'next/server';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { unifiedSearch } from '@/lib/unified-research-engine';
import { uploadToTelegram } from '@/lib/telegram-storage';
import { downloadPdfFromUrl } from '@/lib/unified-research-engine';
import { createSupabaseServerClient } from '@/lib/supabase';

export const maxDuration = 300;
export async function POST(request: Request) {
  // Rate limit check
  const { allowed, retryAfter } = rateLimit(request, RATE_LIMITS.search);
  if (!allowed) {
    return NextResponse.json(
      { success: false, error: 'Terlalu banyak permintaan. Coba lagi dalam ' + retryAfter + ' detik.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    );
  }
  try {
    const body = await request.json();
    const { keywords, title, maxResults = 50, yearFrom, yearTo, openAccessOnly, autoUploadPdf } = body;

    if (!keywords?.length && !title) {
      return NextResponse.json(
        { success: false, error: 'Keywords or title is required' },
        { status: 400 }
      );
    }

    const query = title || keywords.join(' ');

    // Step 1: Unified search across OpenAlex, Consensus, Unpaywall
    const searchResult = await unifiedSearch({
      query,
      keywords: keywords || [],
      maxResults,
      yearFrom,
      yearTo,
      openAccessOnly,
    });

    if (searchResult.references.length === 0) {
      return NextResponse.json({
        success: true,
        references: [],
        message: 'No references found. Try different keywords.',
        meta: searchResult,
      });
    }

    // Step 2: Optionally auto-upload PDFs to Telegram for OA references
    let uploadedCount = 0;
    if (autoUploadPdf) {
      const oaRefs = searchResult.references.filter(
        (ref) => ref.pdfUrl && ref.is_open_access
      );

      for (const ref of oaRefs.slice(0, 10)) {
        const pdfUrl = ref.pdfUrl;
        if (!pdfUrl) continue;

        try {
          const pdfBuffer = await downloadPdfFromUrl(pdfUrl);
          if (pdfBuffer) {
            const fileName = `${ref.doi || ref.title}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '_');
            const uploadResult = await uploadToTelegram(pdfBuffer, fileName, `📎 ${ref.title}`);

            if (uploadResult.success) {
              // Store Telegram metadata on the reference
              ref.telegram_file_id = uploadResult.fileId ?? undefined;
              ref.telegram_channel_id = uploadResult.channelId ?? undefined;
              ref.telegram_bot_index = uploadResult.botIndex ?? undefined;
              ref.telegram_uploaded = true;
              uploadedCount++;
            }
          }
        } catch (error) {
          console.warn(`[Research] PDF upload failed for ${ref.title}:`, error);
        }
      }
    }

    // Step 3: Save to Supabase (if user is authenticated, save session + refs)
    // This is optional — references are returned to client regardless

    return NextResponse.json({
      success: true,
      references: searchResult.references,
      meta: {
        totalFound: searchResult.totalFound,
        searchDuration: searchResult.searchDuration,
        sources: searchResult.sources,
        uploadedToTelegram: uploadedCount,
      },
    });
  } catch (error) {
    console.error('Research search error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search references. Please try again.' },
      { status: 500 }
    );
  }
}
