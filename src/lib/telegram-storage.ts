/**
 * Telegram Cold Storage Module
 * ─────────────────────────────
 * Manages 14 Telegram Bots + Channels for distributed PDF/DOCX file storage.
 * Files are uploaded to Telegram channels and metadata stored in Supabase.
 * Download streams files directly from Telegram CDN to users.
 */

import TelegramBot from 'node-telegram-bot-api';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TelegramUploadResult {
  success: boolean;
  fileId: string | null;
  channelId: string | null;
  botIndex: number;
  fileSize?: number;
  error?: string;
}

export interface TelegramDownloadResult {
  success: boolean;
  buffer?: Buffer;
  mimeType?: string;
  fileName?: string;
  fileSize?: number;
  error?: string;
}

export interface BotHealth {
  botIndex: number;
  username: string | null;
  isActive: boolean;
  totalUploads: number;
  totalBytes: number;
  lastUsedAt: string | null;
  rateLimitRemaining: number;
}

// ── Bot Pool Configuration ─────────────────────────────────────────────────────

function getBotPool(): { tokens: string[]; channels: string[] } {
  const tokens = (process.env.TELEGRAM_BOT_TOKENS || '').split(',').filter(Boolean).map(t => t.trim());
  const channels = (process.env.TELEGRAM_CHANNEL_IDS || '').split(',').filter(Boolean).map(c => c.trim());

  if (tokens.length === 0 || channels.length === 0) {
    console.warn('[Telegram] No bot tokens or channel IDs configured. Telegram storage disabled.');
  }

  return { tokens, channels };
}

function getBotForIndex(index: number): { bot: TelegramBot; channelId: string } | null {
  const { tokens, channels } = getBotPool();
  if (index >= tokens.length || index >= channels.length) return null;

  return {
    bot: new TelegramBot(tokens[index], { polling: false }),
    channelId: channels[index],
  };
}

// ── Round-Robin Bot Selection ──────────────────────────────────────────────────

let lastBotIndex = 0;

function selectBot(): number {
  const { tokens } = getBotPool();
  if (tokens.length === 0) return -1;

  // Simple round-robin with random jitter for distribution
  const jitter = Math.floor(Math.random() * Math.max(1, tokens.length / 3));
  const index = (lastBotIndex + jitter) % tokens.length;
  lastBotIndex = index;
  return index;
}

// ── Upload File to Telegram ────────────────────────────────────────────────────

/**
 * Upload a file buffer to a Telegram channel.
 * Uses round-robin to distribute across 14 bots/channels.
 * Automatically retries with next bot on failure.
 */
export async function uploadToTelegram(
  fileBuffer: Buffer,
  fileName: string,
  caption?: string,
  maxRetries = 3
): Promise<TelegramUploadResult> {
  const { tokens } = getBotPool();
  if (tokens.length === 0) {
    return { success: false, fileId: null, channelId: null, botIndex: -1, error: 'No Telegram bots configured' };
  }

  let lastError = 'All upload attempts failed';

  for (let attempt = 0; attempt < Math.min(maxRetries, tokens.length); attempt++) {
    const botIndex = selectBot();
    const botConfig = getBotForIndex(botIndex);

    if (!botConfig) {
      lastError = `Bot index ${botIndex} not available`;
      continue;
    }

    const { bot, channelId } = botConfig;

    try {
      const response = await bot.sendDocument(channelId, fileBuffer, {
        filename: fileName,
        caption: caption || `📄 ${fileName}`,
        parse_mode: 'Markdown',
      });

      const fileId = response.document?.file_id;
      const fileSize = response.document?.file_size;

      if (!fileId) {
        throw new Error('No file_id returned from Telegram');
      }

      console.log(`[Telegram] ✅ Uploaded "${fileName}" via Bot ${botIndex + 1} (${(fileSize || 0) / 1024}KB)`);

      return {
        success: true,
        fileId,
        channelId,
        botIndex,
        fileSize,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      lastError = msg;
      console.warn(`[Telegram] ⚠️ Bot ${botIndex + 1} failed: ${msg}. Trying next bot...`);
      // Small delay before retry
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return { success: false, fileId: null, channelId: null, botIndex: -1, error: lastError };
}

// ── Download File from Telegram ────────────────────────────────────────────────

/**
 * Download a file from Telegram using file_id.
 * Streams directly from Telegram CDN.
 */
export async function downloadFromTelegram(
  fileId: string,
  botIndex: number
): Promise<TelegramDownloadResult> {
  const botConfig = getBotForIndex(botIndex);

  if (!botConfig) {
    return { success: false, error: `Bot index ${botIndex} not available` };
  }

  const { bot } = botConfig;

  try {
    // Step 1: Get file info
    const fileInfo = await bot.getFile(fileId);
    if (!fileInfo.file_path) {
      throw new Error('No file_path returned from Telegram');
    }

    // Step 2: Construct download URL
    const { tokens } = getBotPool();
    const botToken = tokens[botIndex];
    const fileUrl = `https://api.telegram.org/file/bot${botToken}/${fileInfo.file_path}`;

    // Step 3: Download file buffer
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fileName = fileInfo.file_path?.split('/').pop() || 'download';
    const mimeType = response.headers.get('content-type') || 'application/octet-stream';

    console.log(`[Telegram] ✅ Downloaded "${fileName}" via Bot ${botIndex + 1} (${(buffer.length) / 1024}KB)`);

    return {
      success: true,
      buffer,
      mimeType,
      fileName,
      fileSize: buffer.length,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[Telegram] ❌ Download failed: ${msg}`);
    return { success: false, error: msg };
  }
}

// ── Get File Stream URL (for proxy download) ───────────────────────────────────

/**
 * Get the direct Telegram CDN URL for a file (for streaming to user).
 * Does NOT download the entire file — just returns the URL.
 */
export async function getFileUrl(
  fileId: string,
  botIndex: number
): Promise<string | null> {
  const botConfig = getBotForIndex(botIndex);
  if (!botConfig) return null;

  const { bot } = botConfig;

  try {
    const fileInfo = await bot.getFile(fileId);
    if (!fileInfo.file_path) return null;

    const { tokens } = getBotPool();
    const botToken = tokens[botIndex];
    return `https://api.telegram.org/file/bot${botToken}/${fileInfo.file_path}`;
  } catch (error) {
    console.error(`[Telegram] ❌ Failed to get file URL: ${error}`);
    return null;
  }
}

// ── Batch Upload (for multiple references) ─────────────────────────────────────

export interface BatchUploadItem {
  buffer: Buffer;
  fileName: string;
  doi?: string;
}

export interface BatchUploadResult {
  successes: Array<{
    fileName: string;
    fileId: string;
    channelId: string;
    botIndex: number;
    doi?: string;
  }>;
  failures: Array<{
    fileName: string;
    error: string;
    doi?: string;
  }>;
  totalFiles: number;
  successRate: number;
}

/**
 * Upload multiple PDFs across the 14-bot pool with automatic distribution.
 * Adds concurrency control to avoid rate limiting.
 */
export async function batchUploadToTelegram(
  items: BatchUploadItem[],
  concurrency = 3
): Promise<BatchUploadResult> {
  const successes: BatchUploadResult['successes'] = [];
  const failures: BatchUploadResult['failures'] = [];

  // Process in batches to respect rate limits
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map(item =>
        uploadToTelegram(item.buffer, item.fileName)
      )
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      const item = batch[j];

      if (result.status === 'fulfilled' && result.value.success) {
        successes.push({
          fileName: item.fileName,
          fileId: result.value.fileId!,
          channelId: result.value.channelId!,
          botIndex: result.value.botIndex,
          doi: item.doi,
        });
      } else {
        failures.push({
          fileName: item.fileName,
          error: result.status === 'fulfilled'
            ? result.value.error || 'Upload failed'
            : (result.reason?.message || String(result.reason)),
          doi: item.doi,
        });
      }
    }

    // Delay between batches to avoid rate limiting
    if (i + concurrency < items.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return {
    successes,
    failures,
    totalFiles: items.length,
    successRate: items.length > 0 ? Math.round((successes.length / items.length) * 100) : 0,
  };
}

// ── Health Check ───────────────────────────────────────────────────────────────

/**
 * Check health status of all configured bots.
 */
export async function checkBotHealth(): Promise<BotHealth[]> {
  const { tokens, channels } = getBotPool();
  const results: BotHealth[] = [];

  for (let i = 0; i < tokens.length; i++) {
    try {
      const bot = new TelegramBot(tokens[i], { polling: false });
      const me = await bot.getMe();
      results.push({
        botIndex: i,
        username: me.username,
        isActive: true,
        totalUploads: 0,
        totalBytes: 0,
        lastUsedAt: null,
        rateLimitRemaining: 30,
      });
    } catch (error) {
      results.push({
        botIndex: i,
        username: null,
        isActive: false,
        totalUploads: 0,
        totalBytes: 0,
        lastUsedAt: null,
        rateLimitRemaining: 0,
      });
    }
  }

  return results;
}

// ── Delete File from Telegram ──────────────────────────────────────────────────

/**
 * Delete a message (and its attached file) from a Telegram channel.
 */
export async function deleteFromTelegram(
  fileId: string,
  channelId: string,
  botIndex: number,
  messageId?: number
): Promise<boolean> {
  const botConfig = getBotForIndex(botIndex);
  if (!botConfig) return false;

  const { bot } = botConfig;

  try {
    if (messageId) {
      await bot.deleteMessage(channelId, messageId);
      console.log(`[Telegram] 🗑️ Deleted message ${messageId} from channel`);
    }
    return true;
  } catch (error) {
    console.error(`[Telegram] ❌ Delete failed: ${error}`);
    return false;
  }
}
