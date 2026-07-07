'use client';

import Link from 'next/link';
import { ArrowLeft, FileCheck } from 'lucide-react';

export default function KetentuanPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors mb-8"
        >
          <ArrowLeft className="size-4" />
          Kembali ke Mamah
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
            <FileCheck className="size-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Ketentuan Layanan
          </h1>
        </div>

        <p className="text-sm text-muted-foreground mb-8">
          Terakhir diperbarui: 8 Juli 2026
        </p>

        <div className="prose prose-sm sm:prose dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">1. Penerimaan Ketentuan</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Dengan mengakses atau menggunakan aplikasi Mamah (&quot;Layanan&quot;), yang disediakan oleh HirahPress, Anda menyetujui untuk terikat oleh Ketentuan Layanan ini. Jika Anda tidak menyetujui ketentuan-ketentuan ini, harap tidak menggunakan Layanan kami. Ketentuan ini berlaku untuk semua pengguna, termasuk pengguna gratis dan berbayar.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">2. Deskripsi Layanan</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Mamah adalah asisten penulisan akademik berbasis kecerdasan buatan yang membantu pengguna dalam membuat draf awal untuk berbagai jenis karya akademik, termasuk artikel jurnal, skripsi, tesis, disertasi, proposal, buku, dan makalah. Konten yang dihasilkan oleh AI bersifat draf awal dan harus ditinjau, disunting, dan diverifikasi oleh pengguna sebelum digunakan untuk keperluan akademik atau publikasi.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">3. Tanggung Jawab Pengguna</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              Sebagai pengguna Mamah, Anda bertanggung jawab untuk:
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground leading-relaxed space-y-1">
              <li>Meninjau dan menyunting semua konten yang dihasilkan AI sebelum penggunaan akhir</li>
              <li>Memastikan keakuratan faktual, kutipan, dan referensi dalam konten yang dihasilkan</li>
              <li>Mematuhi kebijakan integritas akademik institusi pendidikan Anda</li>
              <li>Tidak menggunakan Layanan untuk aktivitas yang melanggar hukum</li>
              <li>Menjaga keamanan akun dan tidak membagikan kredensial akses</li>
              <li>Memberikan informasi yang akurat saat membuat akun</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">4. Batasan Layanan</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              Mamah memiliki beberapa batasan penting yang perlu Anda pahami:
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground leading-relaxed space-y-1">
              <li>Konten yang dihasilkan adalah <strong className="text-foreground">draf awal</strong>, bukan hasil akhir yang siap publikasi</li>
              <li>AI dapat menghasilkan informasi yang tidak akurat atau referensi yang tidak ada (halusinasi)</li>
              <li>Kami tidak menjamin kualitas, keakuratan, orisinalitas, atau kesesuaian konten yang dihasilkan</li>
              <li>Layanan mungkin mengalami gangguan, pemeliharaan, atau perubahan tanpa pemberitahuan sebelumnya</li>
              <li>Penggunaan berlebihan atau penyalahgunaan dapat mengakibatkan pembatasan akses</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">5. Paket Berlangganan dan Pembayaran</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Mamah menawarkan paket gratis dan paket berbayar (Pro). Detail harga, fitur, dan batasan untuk masing-masing paket tersedia di dalam aplikasi. Pembayaran paket Pro diproses melalui penyedia pembayaran pihak ketiga yang terpercaya. Kami berhak mengubah harga dan fitur paket dengan pemberitahuan 30 hari sebelumnya. Tidak ada pengembalian dana untuk penggunaan parsial dalam periode berlangganan.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">6. Hak Kekayaan Intelektual</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Konten yang Anda masukkan ke dalam Mamah tetap menjadi milik Anda. Konten yang dihasilkan oleh AI berdasarkan input Anda diberikan kepada Anda dengan lisensi non-eksklusif untuk penggunaan pribadi dan akademik. Anda bertanggung jawab penuh atas konten yang dihasilkan dan penggunaannya. Aplikasi Mamah, termasuk desain, kode, merek dagang, dan logo, adalah milik HirahPress dan dilindungi oleh hukum hak kekayaan intelektual yang berlaku.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">7. Pembatasan Tanggung Jawab</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Mamah dan HirahPress tidak bertanggung jawab atas kerugian langsung, tidak langsung, insidental, khusus, atau konsekuensial yang timbul dari penggunaan atau ketidakmampuan menggunakan Layanan. Ini termasuk, namun tidak terbatas pada, kerugian akademik, penalti plagiarisme, atau konsekuensi dari penggunaan konten yang dihasilkan tanpa peninjauan yang memadai. Penggunaan Layanan sepenuhnya atas risiko Anda sendiri.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">8. Penghentian Akun</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Kami berhak menangguhkan atau mengakhiri akun Anda jika Anda melanggar Ketentuan Layanan ini, menggunakan Layanan secara tidak semestinya, atau terlibat dalam aktivitas yang merugikan Mamah, pengguna lain, atau pihak ketiga. Anda dapat menghentikan penggunaan Layanan dan meminta penghapusan akun kapan saja melalui pengaturan akun atau dengan menghubungi kami.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">9. Hukum yang Berlaku</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ketentuan Layanan ini diatur oleh dan ditafsirkan sesuai dengan hukum Republik Indonesia. Setiap perselisihan yang timbul dari atau terkait dengan ketentuan ini akan diselesaikan melalui musyawarah terlebih dahulu. Jika musyawarah tidak mencapai kesepakatan, perselisihan akan diselesaikan melalui pengadilan yang berwenang di Indonesia.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">10. Kontak</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Untuk pertanyaan tentang Ketentuan Layanan ini, silakan hubungi kami melalui email di <strong className="text-foreground">legal@hirahpress.com</strong>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}