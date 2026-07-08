import { NextResponse } from 'next/server';
import { checkBotHealth } from '@/lib/telegram-storage';

export const maxDuration = 300;
export async function GET() {
  try {
    const health = await checkBotHealth();

    const activeBots = health.filter(b => b.isActive).length;
    const totalBots = health.length;

    return NextResponse.json({
      success: true,
      totalBots,
      activeBots,
      bots: health,
    });
  } catch (error) {
    console.error('Telegram health check error:', error);
    return NextResponse.json(
      { success: false, error: 'Health check failed' },
      { status: 500 }
    );
  }
}
