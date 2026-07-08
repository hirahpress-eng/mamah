import { NextResponse } from 'next/server';
import { downloadFromTelegram, getFileUrl } from '@/lib/telegram-storage';

/**
 * Download PDF from Telegram storage and stream to user.
 * Accepts telegram_file_id and bot_index as query/body params.
 */
export const maxDuration = 300;
export async function POST(request: Request) {
  try {
    const { fileId, botIndex, fileName } = await request.json();

    if (!fileId || botIndex === undefined) {
      return NextResponse.json(
        { success: false, error: 'fileId and botIndex are required' },
        { status: 400 }
      );
    }

    // Option 1: Try to get a direct URL for streaming (faster, less memory)
    const directUrl = await getFileUrl(fileId, botIndex);

    if (directUrl) {
      // Fetch the file and stream it to the user
      const response = await fetch(directUrl);

      if (!response.ok) {
        return NextResponse.json(
          { success: false, error: 'File not found on Telegram' },
          { status: 404 }
        );
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const safeFileName = (fileName || 'article.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${safeFileName}"`,
          'Content-Length': buffer.length.toString(),
          'Cache-Control': 'private, max-age=86400',
        },
      });
    }

    // Option 2: Fallback to full download
    const downloadResult = await downloadFromTelegram(fileId, botIndex);

    if (!downloadResult.success || !downloadResult.buffer) {
      return NextResponse.json(
        { success: false, error: downloadResult.error || 'Failed to download file' },
        { status: 404 }
      );
    }

    const safeFileName = (downloadResult.fileName || fileName || 'article.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');

    return new NextResponse(new Uint8Array(downloadResult.buffer), {
      status: 200,
      headers: {
        'Content-Type': downloadResult.mimeType || 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeFileName}"`,
        'Content-Length': downloadResult.buffer.length.toString(),
        'Cache-Control': 'private, max-age=86400',
      },
    });
  } catch (error) {
    console.error('PDF download error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to download file' },
      { status: 500 }
    );
  }
}
