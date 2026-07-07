import { NextRequest, NextResponse } from 'next/server';
import { generateWithEngine } from '@/lib/ai-engine';
import { AI_ENGINES, type AIEngineId } from '@/lib/ai-engine-config';

export const maxDuration = 300;

// ─── Mode-specific system prompts ───────────────────────────────────

const MODE_PROMPTS: Record<string, string> = {
  book: `Kamu adalah penulis buku akademik profesional. Tulis bab buku yang komprehensif, mendalam, dan berbasis bukti ilmiah. Gunakan bahasa Indonesia yang formal dan akademik. Struktur: Pendahuluan, Latar Belakang, Pembahasan (bagian-bagian), dan Kesimpulan. Setiap bagian harus detail dengan penjelasan yang memadai.`,

  proposal: `Kamu adalah penulis proposal penelitian berpengalaman. Buat proposal yang komprehensif dengan struktur: I. Pendahuluan (Latar Belakang, Rumusan Masalah, Tujuan), II. Tinjauan Pustaka, III. Metodologi Penelitian (Desain, Populasi & Sampel, Teknik Pengumpulan Data, Teknik Analisis), IV. Jadwal Penelitian, V. Anggaran. Gunakan bahasa Indonesia formal akademik.`,

  thesis: `Kamu adalah pembimbing skripsi/tesis profesional. Tulis dengan struktur akademik standar universitas Indonesia: BAB I Pendahuluan (Latar Belakang, Rumusan Masalah, Tujuan, Manfaat), BAB II Tinjauan Pustaka (Kerangka Teori, Penelitian Terdahulu), BAB III Metodologi, BAB IV Hasil dan Pembahasan, BAB V Kesimpulan dan Saran. Gunakan bahasa Indonesia formal.`,

  scholarship: `Kamu adalah konsultan beasiswa profesional. Buat esai beasiswa yang persuasif, autentik, dan memikat. Struktur: Personal Statement, Latar Belakang Akademik & Prestasi, Motivasi & Visi, Rencana Studi, Kontribusi Masa Depan, Penutup. Gunakan bahasa Indonesia yang mengalir, emosional tapi tetap profesional. Tunjukkan keunikan dan passion.`,

  paper: `Kamu adalah penulis makalah akademik berpengalaman. Tulis makalah dengan struktur: I. Pendahuluan (Latar Belakang, Rumusan Masalah), II. Pembahasan (Tinjauan Umum, Analisis, Temuan), III. Kesimpulan dan Saran, Daftar Pustaka. Gunakan bahasa Indonesia formal akademik. Pembahasan harus mendalam dengan argumentasi yang logis.`,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode, title, description, keyPoints, engine, targetWords } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, error: 'Judul/topik wajib diisi' },
        { status: 400 }
      );
    }

    const writingMode = mode || 'paper';
    const engineId = (engine === 'beta' ? 'gemini' : engine === 'caca' ? 'grok' : 'zai') as AIEngineId;
    const words = Math.min(Math.max(targetWords || 3000, 1000), 15000);
    const systemPrompt = MODE_PROMPTS[writingMode] || MODE_PROMPTS.paper;

    const engineLabel = AI_ENGINES.find(e => e.id === engineId)?.name || 'AI Alfa';

    const userPrompt = `Tulis ${writingMode === 'book' ? 'bab buku' : writingMode === 'thesis' ? 'skripsi/tesis' : writingMode === 'scholarship' ? 'esai beasiswa' : writingMode === 'proposal' ? 'proposal penelitian' : 'makalah'} dengan detail berikut:

**Judul/Topik:** ${title}
${description ? `**Deskripsi/Ide Utama:** ${description}` : ''}
${keyPoints ? `**Poin Utama:** ${keyPoints}` : ''}

**Persyaratan:**
- Target sekitar ${words.toLocaleString('id-ID')} kata
- Tulis dalam bahasa Indonesia formal akademik
- Berikan konten yang substansial dan berkualitas tinggi
- Gunakan format markdown (## untuk heading, - untuk list)
- Pastikan setiap bagian memiliki penjelasan yang mendalam
- Jangan gunakan placeholder seperti [isi di sini] — tulis konten lengkap`;

    const maxTokens = Math.min(Math.round(words * 1.5), 16000);

    const content = await generateWithEngine(
      engineId,
      systemPrompt,
      userPrompt,
      { temperature: 0.7, maxTokens },
    );

    return NextResponse.json({
      success: true,
      content,
      engine: engineLabel,
      mode: writingMode,
      wordCount: content.trim().split(/\s+/).filter(Boolean).length,
    });
  } catch (error) {
    console.error('[Writing Generate Error]', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menghasilkan tulisan. Silakan coba lagi.' },
      { status: 500 }
    );
  }
}