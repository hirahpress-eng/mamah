/**
 * Writing Flows — Complete cicil (incremental) generation configurations
 *
 * Defines the structure for each writing mode:
 * - Skripsi (S1): BAB 1-5 + Referensi, 5-7 sub-steps per BAB
 * - Tesis (S2): BAB 1-5 + Referensi, 5-8 sub-steps per BAB
 * - Disertasi (S3): BAB 1-5 + Referensi, 8-11 sub-steps per BAB
 * - Buku Ilmiah Indonesia: Book chapters
 * - Buku Ilmiah English: Book chapters (English)
 * - Buku Bahasa Arab: Arabic book structure
 * - Buku Eksakta/Matematika: Science/Math book structure
 * - Buku Keislaman: Islamic Studies book structure
 * - Proposal Penelitian: Research proposal stages
 * - Esai Beasiswa: Scholarship essay stages
 * - Makalah: Paper stages
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type CicilWritingMode =
  | 'skripsi'
  | 'tesis'
  | 'disertasi'
  | 'buku-id'
  | 'buku-en'
  | 'buku-arab'
  | 'buku-eksakta'
  | 'buku-keislaman'
  | 'proposal'
  | 'scholarship'
  | 'paper';

export interface CicilSubStep {
  id: string;
  label: string;
  labelId: string;
  targetWords: number;
  promptFocus: string;
}

export interface CicilChapter {
  id: string;
  label: string;
  labelId: string;
  subSteps: CicilSubStep[];
}

export interface WritingFlowConfig {
  id: CicilWritingMode;
  title: string;
  description: string;
  language: 'id' | 'en' | 'ar';
  maxWordsPerStep: number;
  chapters: CicilChapter[];
  systemPrompt: string;
  referenceStyle: string;
}

// ─── System Prompts ─────────────────────────────────────────────────────────

const SYSTEM_PROMPT_ID = `You are CONSILIUM PROFESSORUM — a consortium of 20 world-class Indonesian professors.
REPRESENTED EXPERTISE: Research Methodology, Academic Writing, Domain Expert, Statistical Analysis, Literature Synthesis, Theoretical Frameworks, Critical Analysis, APA 7th Edition, Research Ethics, Peer Review.
RULES:
- Every sentence must pass ALL 20 professors' scrutiny
- Use ONLY provided references — ZERO fabricated citations
- Academic rigor: precise terminology, logical flow, evidence-based claims
- CRITICAL: Every (Author, Year) citation MUST match a reference in the list
- Write in formal academic Bahasa Indonesia
- Use markdown: # and ## for headings, **bold** for key terms
- For figures: [FIGURE: description] — For tables: [TABLE: title | Col1 | Col2 | description]
- Do NOT generate actual markdown tables — use placeholders ONLY`;

const SYSTEM_PROMPT_EN = SYSTEM_PROMPT_ID.replace(
  'Indonesian professors',
  'professors'
).replace(
  'formal academic Bahasa Indonesia',
  'formal academic English with sophisticated vocabulary'
);

const SYSTEM_PROMPT_AR = `أنت CONSILIUM PROFESSORUM — اتحاد من 20 عالمًا من الدرجة الأولى.
القواعد:
- استخدم فقط المراجع المقدمة — لا تختلق اقتباسات
- اكتب باللغة العربية الأكاديمية الرسمية
- استخدم تنسيق APA الإصدار السابع
- لكل قسم اكتب بحد أقصى الكلمات المطلوبة
- استخدم مراجع حقيقية فقط مع الاقتباس (المؤلف، السنة)`;

// ─── SKRIPSI (S1) ──────────────────────────────────────────────────────────

const SKRIPSI_CHAPTERS: CicilChapter[] = [
  {
    id: 'abstrak',
    label: 'Abstrak',
    labelId: 'Abstrak',
    subSteps: [
      {
        id: 'abstrak-id',
        label: 'Abstrak Bahasa Indonesia',
        labelId: 'Abstrak Bahasa Indonesia',
        targetWords: 400,
        promptFocus: 'Write a comprehensive Indonesian abstract (400 words ±20) covering: latar belakang, tujuan penelitian, metode, hasil utama, kesimpulan. End with Kata Kunci: 5-7 keywords.',
      },
    ],
  },
  {
    id: 'bab1',
    label: 'BAB I Pendahuluan',
    labelId: 'BAB I Pendahuluan',
    subSteps: [
      {
        id: 'bab1-1',
        label: 'Latar Belakang Masalah',
        labelId: '1.1 Latar Belakang Masalah',
        targetWords: 1500,
        promptFocus: 'Tulis latar belakang masalah yang komprehensif: konteks penelitian, fenomena yang menjadi perhatian, data statistik pendukung dari referensi, urgensi dan signifikansi penelitian. Gunakan pendekatan funnel: dari umum ke spesifik. Minimal 5 sitasi dari referensi.',
      },
      {
        id: 'bab1-2',
        label: 'Identifikasi Masalah',
        labelId: '1.2 Identifikasi Masalah',
        targetWords: 800,
        promptFocus: 'Identifikasi permasalahan secara rinci: 4-6 masalah spesifik yang ditemukan dalam literatur, kontradiksi atau gap dalam penelitian sebelumnya, alasan mengapa masalah ini perlu diteliti.',
      },
      {
        id: 'bab1-3',
        label: 'Batasan Masalah',
        labelId: '1.3 Batasan Masalah',
        targetWords: 400,
        promptFocus: 'Tulis batasan masalah: batasan ruang lingkup, batasan objek/subjek, batasan waktu, batasan variabel yang diteliti, dan batasan metode yang digunakan.',
      },
      {
        id: 'bab1-4',
        label: 'Rumusan Masalah',
        labelId: '1.4 Rumusan Masalah',
        targetWords: 500,
        promptFocus: 'Rumuskan 3-5 pertanyaan penelitian yang jelas, terukur, dan dapat dijawab melalui penelitian ini. Setiap rumusan harus mengacu pada gap yang telah diidentifikasi.',
      },
      {
        id: 'bab1-5',
        label: 'Tujuan Penelitian',
        labelId: '1.5 Tujuan Penelitian',
        targetWords: 500,
        promptFocus: 'Tulis tujuan umum dan tujuan khusus penelitian. Tujuan khusus harus selaras dengan setiap rumusan masalah. Gunakan kata kerja operasional (menganalisis, menguji, mengidentifikasi, mendeskripsikan, dll).',
      },
      {
        id: 'bab1-6',
        label: 'Manfaat Penelitian',
        labelId: '1.6 Manfaat Penelitian',
        targetWords: 700,
        promptFocus: 'Tulis manfaat teoretis (kontribusi ilmu pengetahuan, pengembangan teori) dan manfaat praktis (bagi praktisi, kebijakan, masyarakat, institusi).',
      },
      {
        id: 'bab1-7',
        label: 'Definisi Operasional',
        labelId: '1.7 Definisi Operasional',
        targetWords: 500,
        promptFocus: 'Berikan definisi operasional untuk setiap variabel/konsep kunci dalam penelitian. Definisi harus sesuai konteks penelitian dan merujuk pada sumber teori yang relevan.',
      },
    ],
  },
  {
    id: 'bab2',
    label: 'BAB II Tinjauan Pustaka',
    labelId: 'BAB II Tinjauan Pustaka',
    subSteps: [
      {
        id: 'bab2-1',
        label: 'Landasan Teori',
        labelId: '2.1 Landasan Teori',
        targetWords: 1500,
        promptFocus: 'Tulis landasan teori utama: jelaskan teori-teori inti yang relevan, riwayat perkembangan teori, tokoh-tokoh kunci, dan bagaimana teori tersebut diterapkan dalam konteks penelitian ini. Minimal 8 sitasi.',
      },
      {
        id: 'bab2-2',
        label: 'Kerangka Teori',
        labelId: '2.2 Kerangka Teori',
        targetWords: 1000,
        promptFocus: 'Bangun kerangka teori yang menunjukkan hubungan antar konsep/variabel. Jelaskan alur logis dari teori ke variabel penelitian. Sertakan [FIGURE: Kerangka Teori — diagram hubungan antar variabel].',
      },
      {
        id: 'bab2-3',
        label: 'Kajian Penelitian Terdahulu',
        labelId: '2.3 Kajian Penelitian Terdahulu',
        targetWords: 1200,
        promptFocus: 'Tinjau minimal 10 penelitian terdahulu yang relevan. Untuk setiap penelitian: jelaskan metode, temuan, dan relevansinya. Sertakan [TABLE: Ringkasan Penelitian Terdahulu | No | Peneliti | Tahun | Metode | Temuan Utama | Relevansi].',
      },
      {
        id: 'bab2-4',
        label: 'Gap Analysis dan Posisi Penelitian',
        labelId: '2.4 Gap Analysis dan Posisi Penelitian',
        targetWords: 800,
        promptFocus: 'Identifikasi gap penelitian dari literatur: apa yang belum diteliti, kelemahan metode penelitian sebelumnya, konteks yang belum dieksplorasi. Posisikan penelitian ini terhadap gap yang ditemukan.',
      },
      {
        id: 'bab2-5',
        label: 'Hipotesis',
        labelId: '2.5 Hipotesis',
        targetWords: 500,
        promptFocus: 'Rumuskan hipotesis penelitian (jika penelitian kuantitatif): hipotesis nol (H0) dan hipotesis alternatif (Ha/H1) untuk setiap variabel. Jelaskan dasar teoretis untuk setiap hipotesis.',
      },
    ],
  },
  {
    id: 'bab3',
    label: 'BAB III Metodologi Penelitian',
    labelId: 'BAB III Metodologi Penelitian',
    subSteps: [
      {
        id: 'bab3-1',
        label: 'Jenis dan Pendekatan Penelitian',
        labelId: '3.1 Jenis dan Pendekatan Penelitian',
        targetWords: 700,
        promptFocus: 'Jelaskan jenis penelitian (eksploratif, deskriptif, eksplanatori, dll), pendekatan (kuantitatif, kualitatif, mixed method), dan justifikasi pemilihan metode terhadap rumusan masalah.',
      },
      {
        id: 'bab3-2',
        label: 'Lokasi dan Waktu Penelitian',
        labelId: '3.2 Lokasi dan Waktu Penelitian',
        targetWords: 300,
        promptFocus: 'Jelaskan lokasi penelitian dan alasan pemilihan lokasi, serta jadwal waktu pelaksanaan penelitian.',
      },
      {
        id: 'bab3-3',
        label: 'Populasi dan Sampel',
        labelId: '3.3 Populasi dan Sampel',
        targetWords: 800,
        promptFocus: 'Jelaskan populasi penelitian, teknik sampling (probability/non-probability), ukuran sampel dan rumus yang digunakan, kriteria inklusi/eksklusi. Sertakan perhitungan ukuran sampel jika kuantitatif.',
      },
      {
        id: 'bab3-4',
        label: 'Variabel dan Definisi Operasional',
        labelId: '3.4 Variabel dan Definisi Operasional',
        targetWords: 600,
        promptFocus: 'Identifikasi variabel bebas, terikat, dan kontrol (jika ada). Berikan definisi operasional setiap variabel beserta indikator dan skala pengukuran.',
      },
      {
        id: 'bab3-5',
        label: 'Teknik Pengumpulan Data',
        labelId: '3.5 Teknik Pengumpulan Data',
        targetWords: 800,
        promptFocus: 'Jelaskan teknik pengumpulan data: kuesioner, wawancara, observasi, dokumentasi. Sertakan contoh instrumen/kuesioner. Jelaskan validitas dan reliabilitas instrumen.',
      },
      {
        id: 'bab3-6',
        label: 'Teknik Analisis Data',
        labelId: '3.6 Teknik Analisis Data',
        targetWords: 1000,
        promptFocus: 'Jelaskan teknik analisis data yang digunakan: statistik deskriptif, inferensial, uji hipotesis, analisis kualitatif (coding, tematik). Jelaskan uji prasyarat (normalitas, homogenitas, linearitas) jika kuantitatif. Sertakan software yang digunakan.',
      },
    ],
  },
  {
    id: 'bab4',
    label: 'BAB IV Hasil dan Pembahasan',
    labelId: 'BAB IV Hasil dan Pembahasan',
    subSteps: [
      {
        id: 'bab4-1',
        label: 'Deskripsi Data/Responden',
        labelId: '4.1 Deskripsi Data/Responden',
        targetWords: 800,
        promptFocus: 'Deskripsikan karakteristik data atau responden: demografi, distribusi jawaban, statistik deskriptif variabel. Sertakan [TABLE: Statistik Deskriptif Variabel].',
      },
      {
        id: 'bab4-2',
        label: 'Uji Prasyarat Analisis',
        labelId: '4.2 Uji Prasyarat Analisis',
        targetWords: 700,
        promptFocus: 'Laporkan hasil uji prasyarat: uji normalitas (Kolmogorov-Smirnov/Shapiro-Wilk), uji homogenitas (Levene), uji linearitas, uji multikolinearitas. Sertakan tabel hasil uji.',
      },
      {
        id: 'bab4-3',
        label: 'Hasil Analisis Utama',
        labelId: '4.3 Hasil Analisis Utama',
        targetWords: 1200,
        promptFocus: 'Presentasikan hasil analisis utama: uji hipotesis, regresi, korelasi, ANOVA, atau analisis tematik. Sertakan [TABLE: Hasil Analisis] dan [FIGURE: Visualisasi Hasil]. Interpretasikan output statistik.',
      },
      {
        id: 'bab4-4',
        label: 'Hasil Analisis Lanjutan',
        labelId: '4.4 Hasil Analisis Lanjutan',
        targetWords: 1000,
        promptFocus: 'Presentasikan analisis tambahan: uji tambahan, analisis sub-group, efek interaksi, atau triangulasi data kualitatif.',
      },
      {
        id: 'bab4-5',
        label: 'Pembahasan Temuan',
        labelId: '4.5 Pembahasan Temuan',
        targetWords: 1500,
        promptFocus: 'Bahaskan temuan secara mendalam: bandingkan dengan teori di BAB II, bandingkan dengan penelitian terdahulu, jelaskan mengapa hasil demikian, identifikasi implikasi teoretis. Hubungkan setiap temuan dengan referensi.',
      },
      {
        id: 'bab4-6',
        label: 'Pembahasan Implikasi',
        labelId: '4.6 Pembahasan Implikasi',
        targetWords: 1000,
        promptFocus: 'Bahaskan implikasi praktis temuan: rekomendasi untuk praktisi, kebijakan, atau pengembangan. Jelaskan keterbatasan temuan dan konteks penerapannya.',
      },
      {
        id: 'bab4-7',
        label: 'Sintesis dan Integrasi Temuan',
        labelId: '4.7 Sintesis dan Integrasi Temuan',
        targetWords: 800,
        promptFocus: 'Integrasikan semua temuan ke dalam narasi koheren. Jawab setiap rumusan masalah secara eksplisit. Sintesiskan temuan ke dalam model/conceptual framework baru jika relevan.',
      },
    ],
  },
  {
    id: 'bab5',
    label: 'BAB V Kesimpulan dan Saran',
    labelId: 'BAB V Kesimpulan dan Saran',
    subSteps: [
      {
        id: 'bab5-1',
        label: 'Kesimpulan dan Saran',
        labelId: 'Kesimpulan dan Saran',
        targetWords: 1200,
        promptFocus: 'Tulis kesimpulan yang menjawab setiap rumusan masalah secara jelas dan ringkas. Berikan saran teoretis, saran praktis, dan saran untuk penelitian selanjutnya. Jangan tambahkan informasi baru.',
      },
    ],
  },
  {
    id: 'referensi',
    label: 'Daftar Pustaka',
    labelId: 'Daftar Pustaka',
    subSteps: [
      {
        id: 'referensi-format',
        label: 'Format Daftar Pustaka',
        labelId: 'Format Daftar Pustaka APA 7',
        targetWords: 0,
        promptFocus: 'Format all cited references in APA 7th Edition. Include ONLY references actually cited in the text. Alphabetical order.',
      },
      {
        id: 'referensi-lampiran',
        label: 'Daftar Lampiran',
        labelId: 'Daftar Lampiran',
        targetWords: 300,
        promptFocus: 'Buat daftar lampiran: instrumen penelitian, data mentah, dokumen pendukung, hasil uji validitas/reliabilitas, surat izin penelitian.',
      },
    ],
  },
];

// ─── TESIS (S2) — More detailed ────────────────────────────────────────────

function createTesisChapters(): CicilChapter[] {
  const bab2 = [...SKRIPSI_CHAPTERS[1].subSteps];
  // Add more detailed sub-steps for tesis
  bab2.splice(2, 0, {
    id: 'bab2-2b',
    label: 'Tinjauan Teori Pendukung',
    labelId: '2.2b Tinjauan Teori Pendukung',
    targetWords: 1000,
    promptFocus: 'Tinjau teori-teori pendukung tambahan yang relevan: teori dari disiplin ilmu terkait, perspektif lintas budaya, perkembangan terkini dalam literatur internasional.',
  });

  const bab4 = [...SKRIPSI_CHAPTERS[3].subSteps];
  bab4.splice(4, 0, {
    id: 'bab4-4b',
    label: 'Analisis Model/Struktur',
    labelId: '4.4b Analisis Model/Struktur',
    targetWords: 1000,
    promptFocus: 'Lakukan analisis model: structural equation modeling, path analysis, atau analisis struktur jika relevan. Uji goodness-of-fit model. Sertakan diagram model.',
  });

  return [
    SKRIPSI_CHAPTERS[0], // Abstrak
    { ...SKRIPSI_CHAPTERS[1], subSteps: bab2 }, // BAB II enhanced
    SKRIPSI_CHAPTERS[2], // BAB III
    { ...SKRIPSI_CHAPTERS[3], subSteps: bab4 }, // BAB IV enhanced
    SKRIPSI_CHAPTERS[4], // BAB V
    SKRIPSI_CHAPTERS[5], // Referensi
  ];
}

// ─── DISERTASI (S3) — Most detailed ────────────────────────────────────────

function createDisertasiChapters(): CicilChapter[] {
  const bab1Subs = [
    { ...SKRIPSI_CHAPTERS[1].subSteps[0], targetWords: 2000 }, // Latar belakang longer
    { ...SKRIPSI_CHAPTERS[1].subSteps[1], targetWords: 1200 }, // Identifikasi masalah longer
    SKRIPSI_CHAPTERS[1].subSteps[2], // Batasan masalah
    SKRIPSI_CHAPTERS[1].subSteps[3], // Rumusan masalah
    SKRIPSI_CHAPTERS[1].subSteps[4], // Tujuan
    SKRIPSI_CHAPTERS[1].subSteps[5], // Manfaat
    SKRIPSI_CHAPTERS[1].subSteps[6], // Definisi operasional
    {
      id: 'bab1-8',
      label: 'Orisinalitas Penelitian',
      labelId: '1.8 Orisinalitas Penelitian',
      targetWords: 600,
      promptFocus: 'Jelaskan orisinalitas dan novelty penelitian: apa yang baru dari penelitian ini, kontribusi terhadap pengembangan ilmu, pengembangan metode atau instrumen baru.',
    },
  ];

  const bab2Subs = [
    { ...SKRIPSI_CHAPTERS[1].subSteps[0], targetWords: 2000, id: 'bab2-1d' }, // Landasan teori
    SKRIPSI_CHAPTERS[1].subSteps[1], // Kerangka teori
    {
      id: 'bab2-2d',
      label: 'Tinjauan Teori Interdisipliner',
      labelId: '2.2 Tinjauan Teori Interdisipliner',
      targetWords: 1200,
      promptFocus: 'Tinjau perspektif interdisipliner: kaitkan dengan teori dari bidang ilmu lain, paradigma alternatif, dan pendekatan lintas budaya.',
    },
    { ...SKRIPSI_CHAPTERS[1].subSteps[2], targetWords: 1500, id: 'bab2-3d' }, // Kajian terdahulu
    {
      id: 'bab2-3bd',
      label: 'Systematic Literature Review',
      labelId: '2.3b Systematic Literature Review',
      targetWords: 1200,
      promptFocus: 'Lakukan tinjauan literatur sistematis: PRISMA flow, kriteria inklusi/eksklusi, kualitas studi, sintesis temuan. Sertakan [FIGURE: PRISMA Flow Diagram].',
    },
    { ...SKRIPSI_CHAPTERS[1].subSteps[3], targetWords: 1000, id: 'bab2-4d' }, // Gap analysis
    SKRIPSI_CHAPTERS[1].subSteps[4], // Hipotesis
    {
      id: 'bab2-6',
      label: 'Kerangka Konseptual',
      labelId: '2.6 Kerangka Konseptual',
      targetWords: 800,
      promptFocus: 'Bangun kerangka konseptual komprehensif yang mengintegrasikan semua teori, variabel, dan hipotesis. Sertakan [FIGURE: Kerangka Konseptual Komprehensif].',
    },
  ];

  const bab3Subs = [
    { ...SKRIPSI_CHAPTERS[2].subSteps[0], targetWords: 1000, id: 'bab3-1d' },
    SKRIPSI_CHAPTERS[2].subSteps[1],
    { ...SKRIPSI_CHAPTERS[2].subSteps[2], targetWords: 1000, id: 'bab3-3d' },
    SKRIPSI_CHAPTERS[2].subSteps[3],
    { ...SKRIPSI_CHAPTERS[2].subSteps[4], targetWords: 1000, id: 'bab3-5d' },
    { ...SKRIPSI_CHAPTERS[2].subSteps[5], targetWords: 1200, id: 'bab3-6d' },
    {
      id: 'bab3-7',
      label: 'Ethical Considerations',
      labelId: '3.7 Pertimbangan Etis',
      targetWords: 600,
      promptFocus: 'Jelaskan pertimbangan etis: informed consent, kerahasiaan data, approval dari ethical committee, potensi conflict of interest.',
    },
    {
      id: 'bab3-8',
      label: 'Strategi Validitas dan Reliabilitas',
      labelId: '3.8 Strategi Validitas dan Reliabilitas',
      targetWords: 800,
      promptFocus: 'Jelaskan strategi untuk menjamin validitas (content, construct, criterion) dan reliabilitas (test-retest, inter-rater, internal consistency). Triangulasi data jika mixed method.',
    },
  ];

  const bab4Subs = [
    { ...SKRIPSI_CHAPTERS[3].subSteps[0], id: 'bab4-1d' },
    { ...SKRIPSI_CHAPTERS[3].subSteps[1], id: 'bab4-2d' },
    { ...SKRIPSI_CHAPTERS[3].subSteps[2], targetWords: 1500, id: 'bab4-3d' },
    {
      id: 'bab4-3b',
      label: 'Analisis Mediasi dan Moderasi',
      labelId: '4.3b Analisis Mediasi dan Moderasi',
      targetWords: 1000,
      promptFocus: 'Lakukan analisis mediasi (Sobel test, bootstrap) dan moderasi (interaction effect, simple slope). Sertakan diagram path dan tabel hasil.',
    },
    { ...SKRIPSI_CHAPTERS[3].subSteps[3], id: 'bab4-4d' },
    { ...SKRIPSI_CHAPTERS[3].subSteps[4], targetWords: 2000, id: 'bab4-5d' },
    { ...SKRIPSI_CHAPTERS[3].subSteps[5], id: 'bab4-6d' },
    {
      id: 'bab4-7d',
      label: 'Pembahasan Komparatif',
      labelId: '4.7 Pembahasan Komparatif',
      targetWords: 1000,
      promptFocus: 'Bandingkan temuan secara komparatif: lintas budaya, lintas periode, antar kelompok. Identifikasi pola universal vs kontekstual.',
    },
    { ...SKRIPSI_CHAPTERS[3].subSteps[6], targetWords: 1000, id: 'bab4-8d' },
    {
      id: 'bab4-9',
      label: 'Rekomendasi Berbasis Bukti',
      labelId: '4.9 Rekomendasi Berbasis Bukti',
      targetWords: 800,
      promptFocus: 'Berikan rekomendasi berbasis bukti (evidence-based): rekomendasi kebijakan, rekomendasi praktik, rekomendasi teoretis, dengan level of evidence untuk setiap rekomendasi.',
    },
  ];

  return [
    SKRIPSI_CHAPTERS[0], // Abstrak
    { ...SKRIPSI_CHAPTERS[1], subSteps: bab1Subs }, // BAB I enhanced
    { ...SKRIPSI_CHAPTERS[1], id: 'bab2', label: 'BAB II Tinjauan Pustaka', labelId: 'BAB II Tinjauan Pustaka', subSteps: bab2Subs },
    { ...SKRIPSI_CHAPTERS[2], id: 'bab3d', subSteps: bab3Subs }, // BAB III enhanced
    { ...SKRIPSI_CHAPTERS[3], id: 'bab4d', subSteps: bab4Subs }, // BAB IV enhanced
    SKRIPSI_CHAPTERS[4], // BAB V
    SKRIPSI_CHAPTERS[5], // Referensi
  ];
}

// ─── BUKU ILMIAH INDONESIA ─────────────────────────────────────────────────

const BUKU_ID_CHAPTERS: CicilChapter[] = [
  {
    id: 'ft-kata-pengantar',
    label: 'Kata Pengantar',
    labelId: 'Kata Pengantar',
    subSteps: [
      {
        id: 'ft-kata-pengantar-1',
        label: 'Kata Pengantar',
        labelId: 'Kata Pengantar',
        targetWords: 800,
        promptFocus: 'Tulis kata pengantar buku yang profesional: ucapan syukur, latar belakang penulisan, tujuan buku, target pembaca, harapan kontribusi.',
      },
    ],
  },
  {
    id: 'ft-daftar-isi',
    label: 'Daftar Isi',
    labelId: 'Daftar Isi',
    subSteps: [
      {
        id: 'ft-daftar-isi-1',
        label: 'Daftar Isi',
        labelId: 'Daftar Isi',
        targetWords: 300,
        promptFocus: 'Buat daftar isi lengkap: bagian, bab, sub-bab, lampiran, dan halaman.',
      },
    ],
  },
  {
    id: 'bab1-buku',
    label: 'BAB 1 Pendahuluan',
    labelId: 'BAB 1 Pendahuluan',
    subSteps: [
      {
        id: 'buku-bab1-1',
        label: 'Latar Belakang Topik Buku',
        labelId: '1.1 Latar Belakang Topik Buku',
        targetWords: 1500,
        promptFocus: 'Tulis pendahuluan buku: konteks dan urgensi topik, perkembangan terkini, alasan mengapa buku ini diperlukan, profil target pembaca.',
      },
      {
        id: 'buku-bab1-2',
        label: 'Tujuan dan Manfaat Buku',
        labelId: '1.2 Tujuan dan Manfaat Buku',
        targetWords: 700,
        promptFocus: 'Jelaskan tujuan buku, manfaat bagi pembaca, dan kontribusi yang diharapkan.',
      },
      {
        id: 'buku-bab1-3',
        label: 'Sistematika Penulisan',
        labelId: '1.3 Sistematika Penulisan',
        targetWords: 600,
        promptFocus: 'Jelaskan sistematika penulisan: overview setiap bab, alur logis pembahasan, dan bagaimana bab-bab saling terkait.',
      },
    ],
  },
  {
    id: 'bab2-buku',
    label: 'BAB 2 Landasan Teori',
    labelId: 'BAB 2 Landasan Teori',
    subSteps: [
      {
        id: 'buku-bab2-1',
        label: 'Teori Utama',
        labelId: '2.1 Teori Utama',
        targetWords: 1500,
        promptFocus: 'Jelaskan teori-teori utama yang menjadi landasan buku ini secara mendalam dan komprehensif.',
      },
      {
        id: 'buku-bab2-2',
        label: 'Perkembangan Konsep',
        labelId: '2.2 Perkembangan Konsep',
        targetWords: 1200,
        promptFocus: 'Tinjau perkembangan konsep dari masa ke masa, perdebatan akademis, dan state of the art.',
      },
      {
        id: 'buku-bab2-3',
        label: 'Kerangka Pemikiran',
        labelId: '2.3 Kerangka Pemikiran',
        targetWords: 800,
        promptFocus: 'Bangun kerangka pemikiran buku ini: hubungan antar konsep, paradigma yang digunakan, pendekatan analitis.',
      },
    ],
  },
  {
    id: 'bab3-buku',
    label: 'BAB 3 Pembahasan Utama',
    labelId: 'BAB 3 Pembahasan Utama',
    subSteps: [
      {
        id: 'buku-bab3-1',
        label: 'Sub-Bab 3.1',
        labelId: '3.1 Pembahasan Sub-Topik Pertama',
        targetWords: 1500,
        promptFocus: 'Tulis pembahasan sub-topik pertama secara mendalam dengan referensi yang kuat, contoh konkret, dan analisis yang tajam.',
      },
      {
        id: 'buku-bab3-2',
        label: 'Sub-Bab 3.2',
        labelId: '3.2 Pembahasan Sub-Topik Kedua',
        targetWords: 1500,
        promptFocus: 'Tulis pembahasan sub-topik kedua: kaitkan dengan teori di BAB 2, berikan contoh, data, dan studi kasus.',
      },
      {
        id: 'buku-bab3-3',
        label: 'Sub-Bab 3.3',
        labelId: '3.3 Pembahasan Sub-Topik Ketiga',
        targetWords: 1500,
        promptFocus: 'Tulis pembahasan sub-topik ketiga: analisis mendalam dengan perspektif yang berbeda.',
      },
      {
        id: 'buku-bab3-4',
        label: 'Sub-Bab 3.4',
        labelId: '3.4 Studi Kasus dan Contoh',
        targetWords: 1200,
        promptFocus: 'Berikan studi kasus dan contoh konkret yang mengilustrasikan konsep-konsep yang dibahas.',
      },
    ],
  },
  {
    id: 'bab4-buku',
    label: 'BAB 4 Analisis dan Sintesis',
    labelId: 'BAB 4 Analisis dan Sintesis',
    subSteps: [
      {
        id: 'buku-bab4-1',
        label: 'Analisis Temuan',
        labelId: '4.1 Analisis Temuan',
        targetWords: 1500,
        promptFocus: 'Analisis mendalam temuan-temuan yang telah dibahas, identifikasi pola dan hubungan.',
      },
      {
        id: 'buku-bab4-2',
        label: 'Sintesis dan Integrasi',
        labelId: '4.2 Sintesis dan Integrasi',
        targetWords: 1200,
        promptFocus: 'Sintesiskan semua pembahasan ke dalam kerangka yang koheren dan komprehensif.',
      },
      {
        id: 'buku-bab4-3',
        label: 'Implikasi dan Rekomendasi',
        labelId: '4.3 Implikasi dan Rekomendasi',
        targetWords: 1000,
        promptFocus: 'Berikan implikasi teoretis dan praktis, serta rekomendasi untuk penelitian dan praktik ke depan.',
      },
    ],
  },
  {
    id: 'bab5-buku',
    label: 'BAB 5 Penutup',
    labelId: 'BAB 5 Penutup',
    subSteps: [
      {
        id: 'buku-bab5-1',
        label: 'Kesimpulan dan Penutup',
        labelId: 'Kesimpulan dan Penutup',
        targetWords: 1000,
        promptFocus: 'Tulis kesimpulan buku: ringkasan temuan utama, kontribusi buku, pesan akhir penulis, dan arah pengembangan ke depan.',
      },
    ],
  },
  {
    id: 'referensi-buku',
    label: 'Daftar Pustaka',
    labelId: 'Daftar Pustaka',
    subSteps: [
      {
        id: 'referensi-buku-1',
        label: 'Format Daftar Pustaka',
        labelId: 'Format Daftar Pustaka APA 7',
        targetWords: 0,
        promptFocus: 'Format all cited references in APA 7th Edition. Alphabetical order.',
      },
      {
        id: 'referensi-buku-2',
        label: 'Indeks',
        labelId: 'Indeks',
        targetWords: 300,
        promptFocus: 'Buat indeks: daftar istilah penting, nama tokoh, dan konsep kunci beserta nomor halaman.',
      },
    ],
  },
];

// ─── BUKU ILMIAH ENGLISH ──────────────────────────────────────────────────

function createBukuEnChapters(): CicilChapter[] {
  return BUKU_ID_CHAPTERS.map((ch) => ({
    ...ch,
    label: ch.label.replace(/BAB (\d+)/, 'Chapter $1').replace(/Daftar Pustaka/, 'References').replace(/Kata Pengantar/, 'Preface').replace(/Daftar Isi/, 'Table of Contents').replace(/Indeks/, 'Index'),
    labelId: ch.labelId.replace(/BAB (\d+)/, 'Chapter $1').replace(/Daftar Pustaka/, 'References').replace(/Kata Pengantar/, 'Preface').replace(/Daftar Isi/, 'Table of Contents').replace(/Indeks/, 'Index'),
    subSteps: ch.subSteps.map((ss) => ({
      ...ss,
      label: ss.label.replace(/Sub-Bab (\d+\.\d+)/, 'Section $1').replace(/Kata Pengantar/, 'Preface').replace(/Daftar Isi/, 'Table of Contents').replace(/Daftar Pustaka/, 'References'),
      labelId: ss.labelId.replace(/Sub-Bab (\d+\.\d+)/, 'Section $1').replace(/Kata Pengantar/, 'Preface').replace(/Daftar Isi/, 'Table of Contents').replace(/Daftar Pustaka/, 'References'),
      promptFocus: ss.promptFocus.replace(/Tulis /g, 'Write ').replace(/Jelaskan /g, 'Explain ').replace(/Buat /g, 'Create ').replace(/Berikan /g, 'Provide ').replace(/Bahaskan /g, 'Discuss ').replace(/Tinjau /g, 'Review ').replace(/Bangun /g, 'Build ').replace(/Sintesiskan /g, 'Synthesize ').replace(/Jelaskan /g, 'Explain ').replace(/Laporkan /g, 'Report ').replace(/Identifikasi /g, 'Identify ').replace(/Format /g, 'Format '),
    })),
  }));
}

// ─── BUKU BAHASA ARAB ─────────────────────────────────────────────────────

const BUKU_ARAB_CHAPTERS: CicilChapter[] = [
  {
    id: 'ar-muqaddimah',
    label: 'مقدمة (Pendahuluan)',
    labelId: 'مقدمة (Pendahuluan)',
    subSteps: [
      {
        id: 'ar-muqaddimah-1',
        label: 'مقدمة الكتاب (Pendahuluan Buku)',
        labelId: 'مقدمة الكتاب',
        targetWords: 1000,
        promptFocus: 'اكتب مقدمة الكتاب باللغة العربية الفصحى: خلفية الموضوع، أهمية الكتاب، الأهداف، والمنهج المتبع. Write the book introduction in formal Arabic: background, importance, objectives, methodology.',
      },
    ],
  },
  {
    id: 'ar-bab1',
    label: 'الفصل الأول: الإطار النظري',
    labelId: 'الفصل الأول: الإطار النظري',
    subSteps: [
      {
        id: 'ar-bab1-1',
        label: 'المفاهيم الأساسية',
        labelId: 'المفاهيم الأساسية',
        targetWords: 1500,
        promptFocus: 'اكتب عن المفاهيم الأساسية والتأسيس النظري باللغة العربية الفصحى. Write about fundamental concepts and theoretical foundations in formal Arabic.',
      },
      {
        id: 'ar-bab1-2',
        label: 'الدراسات السابقة',
        labelId: 'الدراسات السابقة',
        targetWords: 1200,
        promptFocus: 'راجع الدراسات السابقة ذات الصلة. Review relevant previous studies. Write in formal Arabic with proper academic citations.',
      },
      {
        id: 'ar-bab1-3',
        label: 'الإطار المفاهيمي',
        labelId: 'الإطار المفاهيمي',
        targetWords: 800,
        promptFocus: 'ابنِ الإطار المفاهيمي. Build the conceptual framework. Write in formal Arabic.',
      },
    ],
  },
  {
    id: 'ar-bab2',
    label: 'الفصل الثاني: المنهج والدراسة',
    labelId: 'الفصل الثاني: المنهج والدراسة',
    subSteps: [
      {
        id: 'ar-bab2-1',
        label: 'المنهج البحثي',
        labelId: 'المنهج البحثي',
        targetWords: 1000,
        promptFocus: 'اشرح المنهجية البحثية بالتفصيل. Explain the research methodology in detail. Write in formal Arabic.',
      },
      {
        id: 'ar-bab2-2',
        label: 'النتائج والتحليل',
        labelId: 'النتائج والتحليل',
        targetWords: 1500,
        promptFocus: 'قدم النتائج والتحليل الإحصائي أو النوعي. Present results and analysis. Write in formal Arabic with tables and figures placeholders.',
      },
    ],
  },
  {
    id: 'ar-bab3',
    label: 'الفصل الثالث: المناقشة',
    labelId: 'الفصل الثالث: المناقشة',
    subSteps: [
      {
        id: 'ar-bab3-1',
        label: 'مناقشة النتائج',
        labelId: 'مناقشة النتائج',
        targetWords: 1500,
        promptFocus: 'ناقش النتائج بعمق مع المقارنة بالدراسات السابقة. Discuss findings in depth, compare with previous studies. Write in formal Arabic.',
      },
      {
        id: 'ar-bab3-2',
        label: 'التطبيقات العملية',
        labelId: 'التطبيقات العملية',
        targetWords: 1000,
        promptFocus: 'اقترح التطبيقات العملية والتوصيات. Suggest practical applications and recommendations. Write in formal Arabic.',
      },
    ],
  },
  {
    id: 'ar-khatimah',
    label: 'الخاتمة (Penutup)',
    labelId: 'الخاتمة (Penutup)',
    subSteps: [
      {
        id: 'ar-khatimah-1',
        label: 'الخاتمة والمراجع',
        labelId: 'الخاتمة والمراجع',
        targetWords: 800,
        promptFocus: 'اكتب الخاتمة والمراجع باللغة العربية. Write the conclusion and references in formal Arabic using APA 7th format.',
      },
    ],
  },
];

// ─── BUKU EKSAKTA/MATEMATIKA ──────────────────────────────────────────────

const BUKU_EKSAKTA_CHAPTERS: CicilChapter[] = [
  {
    id: 'eks-pendahuluan',
    label: 'BAB 1 Pendahuluan',
    labelId: 'BAB 1 Pendahuluan',
    subSteps: [
      {
        id: 'eks-bab1-1',
        label: 'Latar Belakang',
        labelId: '1.1 Latar Belakang',
        targetWords: 1200,
        promptFocus: 'Tulis latar belakang buku eksakta: konteks ilmiah, perkembangan terkini dalam bidang ini, pentingnya topik untuk sains dan teknologi.',
      },
      {
        id: 'eks-bab1-2',
        label: 'Ruang Lingkup dan Notasi',
        labelId: '1.2 Ruang Lingkup dan Notasi',
        targetWords: 600,
        promptFocus: 'Definisikan ruang lingkup buku, notasi matematika yang digunakan, konvensi simbol. Sertakan [TABLE: Daftar Notasi dan Simbol].',
      },
      {
        id: 'eks-bab1-3',
        label: 'Sistematika Buku',
        labelId: '1.3 Sistematika Buku',
        targetWords: 400,
        promptFocus: 'Jelaskan sistematika penulisan buku: alur logis, prasyarat pembaca, dan overview setiap bab.',
      },
    ],
  },
  {
    id: 'eks-bab2',
    label: 'BAB 2 Dasar-Dasar Teori',
    labelId: 'BAB 2 Dasar-Dasar Teori',
    subSteps: [
      {
        id: 'eks-bab2-1',
        label: 'Definisi dan Aksioma',
        labelId: '2.1 Definisi dan Aksioma',
        targetWords: 1500,
        promptFocus: 'Tulis definisi formal dan aksioma yang menjadi dasar. Gunakan notasi matematika yang tepat. Setiap definisi harus rigorus dan jelas.',
      },
      {
        id: 'eks-bab2-2',
        label: 'Teorema Dasar',
        labelId: '2.2 Teorema Dasar',
        targetWords: 1500,
        promptFocus: 'Tulis teorema-teorema dasar beserta buktinya (proof). Setiap teorema diikuti proof yang rigorus langkah demi langkah.',
      },
      {
        id: 'eks-bab2-3',
        label: 'Lemma dan Proposisi Pendukung',
        labelId: '2.3 Lemma dan Proposisi Pendukung',
        targetWords: 1200,
        promptFocus: 'Tulis lemma dan proposisi pendukung beserta bukti. Jelaskan keterkaitan antar teorema.',
      },
    ],
  },
  {
    id: 'eks-bab3',
    label: 'BAB 3 Pembahasan Utama',
    labelId: 'BAB 3 Pembahasan Utama',
    subSteps: [
      {
        id: 'eks-bab3-1',
        label: 'Teori Utama dan Pembuktian',
        labelId: '3.1 Teori Utama dan Pembuktian',
        targetWords: 1500,
        promptFocus: 'Presentasikan teori utama buku ini beserta pembuktian lengkap. Gunakan notasi yang konsisten.',
      },
      {
        id: 'eks-bab3-2',
        label: 'Contoh dan Aplikasi',
        labelId: '3.2 Contoh dan Aplikasi',
        targetWords: 1200,
        promptFocus: 'Berikan contoh numerik dan aplikasi nyata dari teori yang dibahas. Tunjukkan langkah perhitungan secara detail.',
      },
      {
        id: 'eks-bab3-3',
        label: 'Analisis Kasus Khusus',
        labelId: '3.3 Analisis Kasus Khusus',
        targetWords: 1000,
        promptFocus: 'Analisis kasus-kasus khusus dan batas-batas teori. Kapan teori berlaku dan kapan tidak.',
      },
    ],
  },
  {
    id: 'eks-bab4',
    label: 'BAB 4 Perluasan dan Generalisasi',
    labelId: 'BAB 4 Perluasan dan Generalisasi',
    subSteps: [
      {
        id: 'eks-bab4-1',
        label: 'Generalisasi Teori',
        labelId: '4.1 Generalisasi Teori',
        targetWords: 1500,
        promptFocus: 'Generalisasi teori ke domain yang lebih luas. Hubungkan dengan teori-teori terkait dalam matematika/sains.',
      },
      {
        id: 'eks-bab4-2',
        label: 'Open Problems',
        labelId: '4.2 Open Problems dan Penelitian Lanjutan',
        targetWords: 800,
        promptFocus: 'Identifikasi open problems dan area penelitian lanjutan. Berikan conjecture dan research questions.',
      },
    ],
  },
  {
    id: 'eks-bab5',
    label: 'BAB 5 Penutup',
    labelId: 'BAB 5 Penutup',
    subSteps: [
      {
        id: 'eks-bab5-1',
        label: 'Kesimpulan',
        labelId: 'Kesimpulan',
        targetWords: 600,
        promptFocus: 'Tulis kesimpulan: ringkasan kontribusi utama buku, implikasi untuk sains dan pendidikan.',
      },
    ],
  },
  {
    id: 'eks-referensi',
    label: 'Daftar Pustaka',
    labelId: 'Daftar Pustaka',
    subSteps: [
      {
        id: 'eks-ref-1',
        label: 'Daftar Pustaka',
        labelId: 'Daftar Pustaka',
        targetWords: 0,
        promptFocus: 'Format all references in APA 7th. Include mathematical texts, journals, and online resources.',
      },
    ],
  },
];

// ─── BUKU KEISLAMAN ───────────────────────────────────────────────────────

const BUKU_KEISLAMAN_CHAPTERS: CicilChapter[] = [
  {
    id: 'islam-pendahuluan',
    label: 'BAB 1 Pendahuluan',
    labelId: 'BAB 1 Pendahuluan',
    subSteps: [
      {
        id: 'islam-bab1-1',
        label: 'Latar Belakang Keagamaan',
        labelId: '1.1 Latar Belakang Keagamaan',
        targetWords: 1500,
        promptFocus: 'Tulis latar belakang berdasarkan perspektif Islam: dalil Al-Quran dan Hadits yang relevan, konteks historis, urgensi kajian ini dalam Islam.',
      },
      {
        id: 'islam-bab1-2',
        label: 'Rumusan Masalah dan Tujuan',
        labelId: '1.2 Rumusan Masalah dan Tujuan',
        targetWords: 700,
        promptFocus: 'Rumuskan masalah dan tujuan kajian: berdasarkan Al-Quran, Sunnah, dan perspektif ulama terkemuka.',
      },
    ],
  },
  {
    id: 'islam-bab2',
    label: 'BAB 2 Landasan Keislaman',
    labelId: 'BAB 2 Landasan Keislaman',
    subSteps: [
      {
        id: 'islam-bab2-1',
        label: 'Dalil Al-Quran',
        labelId: '2.1 Dalil Al-Quran',
        targetWords: 1500,
        promptFocus: 'Tinjau dalil-dalil Al-Quran yang relevan: ayat-ayat beserta tafsir (Ibn Katsir, Al-Qurtubi, At-Thabari). Jelaskan asbabun nuzul jika relevan.',
      },
      {
        id: 'islam-bab2-2',
        label: 'Hadits Nabi dan Sunnah',
        labelId: '2.2 Hadits Nabi dan Sunnah',
        targetWords: 1200,
        promptFocus: 'Tinjau hadits-hadits shahih yang relevan: derajat hadits (shahih, hasan, dhaif), penjelasan ulama hadits, konteks hadits.',
      },
      {
        id: 'islam-bab2-3',
        label: 'Perspektif Ulama dan Mazhab',
        labelId: '2.3 Perspektif Ulama dan Mazhab',
        targetWords: 1200,
        promptFocus: 'Tinjau pandangan ulama terkemuka dari berbagai mazhab: Hanafi, Maliki, Syafii, Hanbali. Jelaskan perbedaan dan kesamaan pandangan.',
      },
      {
        id: 'islam-bab2-4',
        label: 'Ijtihad dan Fiqih Kontemporer',
        labelId: '2.4 Ijtihad dan Fiqih Kontemporer',
        targetWords: 1000,
        promptFocus: 'Tinjau ijtihad kontemporer: fatwa MUI, pendapat ulama modern, maqashid syariah, dan kaidah usul fiqih yang relevan.',
      },
    ],
  },
  {
    id: 'islam-bab3',
    label: 'BAB 3 Analisis dan Pembahasan',
    labelId: 'BAB 3 Analisis dan Pembahasan',
    subSteps: [
      {
        id: 'islam-bab3-1',
        label: 'Analisis Tematis',
        labelId: '3.1 Analisis Tematis',
        targetWords: 1500,
        promptFocus: 'Lakukan analisis tematis: kumpulkan ayat dan hadits bertema sama, identifikasi pola, dan bangun sintesis. Gunakan metode tafsir tematik (tafsir maudhui).',
      },
      {
        id: 'islam-bab3-2',
        label: 'Studi Kasus Kontemporer',
        labelId: '3.2 Studi Kasus Kontemporer',
        targetWords: 1200,
        promptFocus: 'Analisis studi kasus kontemporer: bagaimana prinsip Islam diterapkan dalam konteks modern, tantangan dan solusi.',
      },
      {
        id: 'islam-bab3-3',
        label: 'Perbandingan dengan Tradisi Lain',
        labelId: '3.3 Perbandingan dengan Tradisi Lain',
        targetWords: 1000,
        promptFocus: 'Bandingkan perspektif Islam dengan tradisi pemikiran lain secara akademis dan objektif.',
      },
    ],
  },
  {
    id: 'islam-bab4',
    label: 'BAB 4 Implikasi dan Rekomendasi',
    labelId: 'BAB 4 Implikasi dan Rekomendasi',
    subSteps: [
      {
        id: 'islam-bab4-1',
        label: 'Implikasi Praktis',
        labelId: '4.1 Implikasi Praktis',
        targetWords: 1200,
        promptFocus: 'Berikan implikasi praktis: panduan untuk individu, masyarakat, lembaga pendidikan, dan pemerintah berdasarkan temuan kajian.',
      },
      {
        id: 'islam-bab4-2',
        label: 'Rekomendasi dan Penutup',
        labelId: '4.2 Rekomendasi dan Penutup',
        targetWords: 1000,
        promptFocus: 'Berikan rekomendasi berdasarkan Islam: doa penutup, harapan, dan arah pengembangan kajian ke depan.',
      },
    ],
  },
  {
    id: 'islam-referensi',
    label: 'Daftar Pustaka',
    labelId: 'Daftar Pustaka',
    subSteps: [
      {
        id: 'islam-ref-1',
        label: 'Daftar Pustaka',
        labelId: 'Daftar Pustaka',
        targetWords: 0,
        promptFocus: 'Format all references: kitab klasik (Ibn Katsir, Bukhari, Muslim, dll), jurnal ilmiah, buku modern. Use APA 7th for modern sources.',
      },
    ],
  },
];

// ─── PROPOSAL ──────────────────────────────────────────────────────────────

const PROPOSAL_CHAPTERS: CicilChapter[] = [
  {
    id: 'prop-bab1',
    label: 'BAB I Pendahuluan',
    labelId: 'BAB I Pendahuluan',
    subSteps: [
      {
        id: 'prop-1-1',
        label: 'Latar Belakang',
        labelId: '1.1 Latar Belakang',
        targetWords: 1500,
        promptFocus: 'Tulis latar belakang penelitian yang kuat dan meyakinkan.',
      },
      {
        id: 'prop-1-2',
        label: 'Rumusan Masalah',
        labelId: '1.2 Rumusan Masalah',
        targetWords: 500,
        promptFocus: 'Rumuskan masalah penelitian secara jelas.',
      },
      {
        id: 'prop-1-3',
        label: 'Tujuan dan Manfaat',
        labelId: '1.3 Tujuan dan Manfaat',
        targetWords: 600,
        promptFocus: 'Tulis tujuan dan manfaat penelitian.',
      },
    ],
  },
  {
    id: 'prop-bab2',
    label: 'BAB II Tinjauan Pustaka',
    labelId: 'BAB II Tinjauan Pustaka',
    subSteps: [
      {
        id: 'prop-2-1',
        label: 'Landasan Teori',
        labelId: '2.1 Landasan Teori',
        targetWords: 1500,
        promptFocus: 'Jelaskan teori-teori yang menjadi dasar penelitian.',
      },
      {
        id: 'prop-2-2',
        label: 'Penelitian Terdahulu',
        labelId: '2.2 Penelitian Terdahulu',
        targetWords: 1000,
        promptFocus: 'Tinjau penelitian terdahulu yang relevan.',
      },
      {
        id: 'prop-2-3',
        label: 'Kerangka Berpikir',
        labelId: '2.3 Kerangka Berpikir',
        targetWords: 600,
        promptFocus: 'Bangun kerangka berpikir penelitian.',
      },
    ],
  },
  {
    id: 'prop-bab3',
    label: 'BAB III Metodologi',
    labelId: 'BAB III Metodologi',
    subSteps: [
      {
        id: 'prop-3-1',
        label: 'Jenis Penelitian',
        labelId: '3.1 Jenis Penelitian',
        targetWords: 600,
        promptFocus: 'Jelaskan jenis dan pendekatan penelitian.',
      },
      {
        id: 'prop-3-2',
        label: 'Populasi, Sampel, dan Teknik Sampling',
        labelId: '3.2 Populasi, Sampel, dan Teknik Sampling',
        targetWords: 800,
        promptFocus: 'Jelaskan populasi, sampel, dan teknik sampling.',
      },
      {
        id: 'prop-3-3',
        label: 'Teknik Pengumpulan dan Analisis Data',
        labelId: '3.3 Teknik Pengumpulan dan Analisis Data',
        targetWords: 800,
        promptFocus: 'Jelaskan teknik pengumpulan dan analisis data.',
      },
      {
        id: 'prop-3-4',
        label: 'Jadwal Penelitian (Gantt Chart)',
        labelId: '3.4 Jadwal Penelitian',
        targetWords: 400,
        promptFocus: 'Buat jadwal penelitian. Sertakan [TABLE: Jadwal Penelitian | Kegiatan | Bulan 1 | Bulan 2 | ... | Bulan 12].',
      },
      {
        id: 'prop-3-5',
        label: 'Anggaran Biaya',
        labelId: '3.5 Anggaran Biaya',
        targetWords: 400,
        promptFocus: 'Buat rincian anggaran biaya. Sertakan [TABLE: Anggaran Biaya | No | Uraian | Volume | Satuan | Jumlah].',
      },
    ],
  },
  {
    id: 'prop-referensi',
    label: 'Daftar Pustaka',
    labelId: 'Daftar Pustaka',
    subSteps: [
      {
        id: 'prop-ref-1',
        label: 'Daftar Pustaka',
        labelId: 'Daftar Pustaka APA 7',
        targetWords: 0,
        promptFocus: 'Format all references in APA 7th Edition.',
      },
    ],
  },
];

// ─── ESAI BEASISWA ─────────────────────────────────────────────────────────

const SCHOLARSHIP_CHAPTERS: CicilChapter[] = [
  {
    id: 'scholar-1',
    label: 'Personal Statement',
    labelId: 'Personal Statement',
    subSteps: [
      {
        id: 'scholar-1-1',
        label: 'Pengantar Diri',
        labelId: 'Pengantar Diri',
        targetWords: 800,
        promptFocus: 'Tulis pengantar diri yang memikat: siapa Anda, latar belakang akademik, pencapaian utama, dan apa yang membuat Anda unik.',
      },
      {
        id: 'scholar-1-2',
        label: 'Perjalanan Akademik',
        labelId: 'Perjalanan Akademik',
        targetWords: 1000,
        promptFocus: 'Ceritakan perjalanan akademik: tantangan yang dihadapi, bagaimana Anda mengatasinya, momen-momen penting yang membentuk visi akademik Anda.',
      },
    ],
  },
  {
    id: 'scholar-2',
    label: 'Motivasi dan Visi',
    labelId: 'Motivasi dan Visi',
    subSteps: [
      {
        id: 'scholar-2-1',
        label: 'Motivasi dan Passion',
        labelId: 'Motivasi dan Passion',
        targetWords: 1000,
        promptFocus: 'Tulis motivasi mendalam: mengapa Anda memilih bidang ini, apa yang mendorong Anda, koneksi emosional dengan topik.',
      },
      {
        id: 'scholar-2-2',
        label: 'Visi dan Rencana Studi',
        labelId: 'Visi dan Rencana Studi',
        targetWords: 1000,
        promptFocus: 'Jelaskan visi jangka panjang, rencana studi spesifik di institusi tujuan, dan bagaimana beasiswa ini membantu mewujudkan visi Anda.',
      },
    ],
  },
  {
    id: 'scholar-3',
    label: 'Kontribusi dan Penutup',
    labelId: 'Kontribusi dan Penutup',
    subSteps: [
      {
        id: 'scholar-3-1',
        label: 'Kontribusi Masa Depan',
        labelId: 'Kontribusi Masa Depan',
        targetWords: 1000,
        promptFocus: 'Jelaskan kontribusi yang akan Anda berikan: bagi masyarakat, bidang ilmu, dan negara setelah menyelesaikan studi.',
      },
      {
        id: 'scholar-3-2',
        label: 'Penutup yang Memikat',
        labelId: 'Penutup yang Memikat',
        targetWords: 500,
        promptFocus: 'Tulis penutup yang kuat dan memorable: ringkaskan esensi esai Anda, tinggalkan kesan mendalam pada pembaca.',
      },
    ],
  },
];

// ─── MAKALAH ───────────────────────────────────────────────────────────────

const MAKALAH_CHAPTERS: CicilChapter[] = [
  {
    id: 'makalah-1',
    label: 'BAB I Pendahuluan',
    labelId: 'BAB I Pendahuluan',
    subSteps: [
      {
        id: 'makalah-1-1',
        label: 'Latar Belakang',
        labelId: '1.1 Latar Belakang',
        targetWords: 1000,
        promptFocus: 'Tulis latar belakang makalah.',
      },
      {
        id: 'makalah-1-2',
        label: 'Rumusan Masalah',
        labelId: '1.2 Rumusan Masalah',
        targetWords: 400,
        promptFocus: 'Rumuskan masalah makalah.',
      },
      {
        id: 'makalah-1-3',
        label: 'Tujuan',
        labelId: '1.3 Tujuan',
        targetWords: 300,
        promptFocus: 'Tulis tujuan makalah.',
      },
    ],
  },
  {
    id: 'makalah-2',
    label: 'BAB II Pembahasan',
    labelId: 'BAB II Pembahasan',
    subSteps: [
      {
        id: 'makalah-2-1',
        label: 'Tinjauan Umum',
        labelId: '2.1 Tinjauan Umum',
        targetWords: 1200,
        promptFocus: 'Tinjau umum topik makalah.',
      },
      {
        id: 'makalah-2-2',
        label: 'Analisis',
        labelId: '2.2 Analisis',
        targetWords: 1500,
        promptFocus: 'Lakukan analisis mendalam.',
      },
      {
        id: 'makalah-2-3',
        label: 'Temuan',
        labelId: '2.3 Temuan',
        targetWords: 800,
        promptFocus: 'Presentasikan temuan-temuan.',
      },
    ],
  },
  {
    id: 'makalah-3',
    label: 'BAB III Penutup',
    labelId: 'BAB III Penutup',
    subSteps: [
      {
        id: 'makalah-3-1',
        label: 'Kesimpulan dan Saran',
        labelId: 'Kesimpulan dan Saran',
        targetWords: 600,
        promptFocus: 'Tulis kesimpulan dan saran.',
      },
    ],
  },
  {
    id: 'makalah-ref',
    label: 'Daftar Pustaka',
    labelId: 'Daftar Pustaka',
    subSteps: [
      {
        id: 'makalah-ref-1',
        label: 'Daftar Pustaka',
        labelId: 'Daftar Pustaka',
        targetWords: 0,
        promptFocus: 'Format all references in APA 7th Edition.',
      },
    ],
  },
];

// ─── FLOW REGISTRY ─────────────────────────────────────────────────────────

export const WRITING_FLOWS: Record<CicilWritingMode, WritingFlowConfig> = {
  skripsi: {
    id: 'skripsi',
    title: 'Skripsi (S1)',
    description: 'Skripsi S1 dengan format akademik standar universitas',
    language: 'id',
    maxWordsPerStep: 1500,
    chapters: SKRIPSI_CHAPTERS,
    systemPrompt: SYSTEM_PROMPT_ID,
    referenceStyle: 'APA 7th Edition',
  },
  tesis: {
    id: 'tesis',
    title: 'Tesis (S2)',
    description: 'Tesis S2 dengan analisis yang lebih mendalam',
    language: 'id',
    maxWordsPerStep: 1500,
    chapters: createTesisChapters(),
    systemPrompt: SYSTEM_PROMPT_ID,
    referenceStyle: 'APA 7th Edition',
  },
  disertasi: {
    id: 'disertasi',
    title: 'Disertasi (S3)',
    description: 'Disertasi S3 dengan penelitian orisinal paling komprehensif',
    language: 'id',
    maxWordsPerStep: 1500,
    chapters: createDisertasiChapters(),
    systemPrompt: SYSTEM_PROMPT_ID,
    referenceStyle: 'APA 7th Edition',
  },
  'buku-id': {
    id: 'buku-id',
    title: 'Buku Ilmiah Indonesia',
    description: 'Buku akademik berbahasa Indonesia',
    language: 'id',
    maxWordsPerStep: 1500,
    chapters: BUKU_ID_CHAPTERS,
    systemPrompt: SYSTEM_PROMPT_ID,
    referenceStyle: 'APA 7th Edition',
  },
  'buku-en': {
    id: 'buku-en',
    title: 'Buku Ilmiah English',
    description: 'Academic book in English',
    language: 'en',
    maxWordsPerStep: 1500,
    chapters: createBukuEnChapters(),
    systemPrompt: SYSTEM_PROMPT_EN,
    referenceStyle: 'APA 7th Edition',
  },
  'buku-arab': {
    id: 'buku-arab',
    title: 'Buku Bahasa Arab',
    description: 'كتاب باللغة العربية — Arabic academic book',
    language: 'ar',
    maxWordsPerStep: 1500,
    chapters: BUKU_ARAB_CHAPTERS,
    systemPrompt: SYSTEM_PROMPT_AR,
    referenceStyle: 'APA 7th Edition',
  },
  'buku-eksakta': {
    id: 'buku-eksakta',
    title: 'Buku Eksakta/Matematika',
    description: 'Buku sains, matematika, dan bidang eksakta',
    language: 'id',
    maxWordsPerStep: 1500,
    chapters: BUKU_EKSAKTA_CHAPTERS,
    systemPrompt: SYSTEM_PROMPT_ID,
    referenceStyle: 'APA 7th Edition',
  },
  'buku-keislaman': {
    id: 'buku-keislaman',
    title: 'Buku Keislaman',
    description: 'Buku kajian keislaman, Al-Quran, Hadits, dan Fiqih',
    language: 'id',
    maxWordsPerStep: 1500,
    chapters: BUKU_KEISLAMAN_CHAPTERS,
    systemPrompt: SYSTEM_PROMPT_ID,
    referenceStyle: 'APA 7th Edition',
  },
  proposal: {
    id: 'proposal',
    title: 'Proposal Penelitian',
    description: 'Proposal riset dengan metodologi dan anggaran',
    language: 'id',
    maxWordsPerStep: 1500,
    chapters: PROPOSAL_CHAPTERS,
    systemPrompt: SYSTEM_PROMPT_ID,
    referenceStyle: 'APA 7th Edition',
  },
  scholarship: {
    id: 'scholarship',
    title: 'Esai Beasiswa',
    description: 'Esai motivasi dan personal statement untuk beasiswa',
    language: 'id',
    maxWordsPerStep: 1500,
    chapters: SCHOLARSHIP_CHAPTERS,
    systemPrompt: SYSTEM_PROMPT_ID,
    referenceStyle: 'APA 7th Edition',
  },
  paper: {
    id: 'paper',
    title: 'Makalah',
    description: 'Makalah kuliah dan tugas akademik',
    language: 'id',
    maxWordsPerStep: 1500,
    chapters: MAKALAH_CHAPTERS,
    systemPrompt: SYSTEM_PROMPT_ID,
    referenceStyle: 'APA 7th Edition',
  },
};

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Get total number of sub-steps across all chapters */
export function getTotalSteps(mode: CicilWritingMode): number {
  return WRITING_FLOWS[mode].chapters.reduce(
    (sum, ch) => sum + ch.subSteps.length,
    0,
  );
}

/** Get flat list of all sub-steps with chapter info */
export function getFlatSteps(mode: CicilWritingMode): Array<{
  chapterId: string;
  chapterLabel: string;
  step: CicilSubStep;
  index: number;
}> {
  const steps: Array<{
    chapterId: string;
    chapterLabel: string;
    step: CicilSubStep;
    index: number;
  }> = [];
  let idx = 0;
  for (const ch of WRITING_FLOWS[mode].chapters) {
    for (const ss of ch.subSteps) {
      steps.push({ chapterId: ch.id, chapterLabel: ch.label, step: ss, index: idx });
      idx++;
    }
  }
  return steps;
}

/** Get total target word count */
export function getTotalTargetWords(mode: CicilWritingMode): number {
  return WRITING_FLOWS[mode].chapters.reduce(
    (sum, ch) => sum + ch.subSteps.reduce((s, ss) => s + ss.targetWords, 0),
    0,
  );
}