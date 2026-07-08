'use client';

import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';

export default function PrivasiPage() {
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
            <Shield className="size-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Kebijakan Privasi
          </h1>
        </div>

        <p className="text-sm text-muted-foreground mb-8">
          Terakhir diperbarui: 1 Januari 2025
        </p>

        <div className="prose prose-sm sm:prose dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">1. Pendahuluan</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Mamah (&quot;Kami&quot;) berkomitmen untuk melindungi privasi pengguna layanan kami. Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, menyimpan, dan melindungi informasi pribadi Anda ketika Anda menggunakan aplikasi Mamah, termasuk situs web, API, dan layanan terkait lainnya. Dengan menggunakan layanan kami, Anda menyetujui praktik yang dijelaskan dalam kebijakan ini.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">2. Informasi yang Kami Kumpulkan</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              Kami mengumpulkan beberapa jenis informasi untuk menyediakan dan meningkatkan layanan kami:
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground leading-relaxed space-y-1">
              <li><strong className="text-foreground">Informasi Akun:</strong> Nama, alamat email, dan foto profil yang Anda berikan saat mendaftar atau masuk melalui akun Google.</li>
              <li><strong className="text-foreground">Konten Pengguna:</strong> Judul, kata kunci, dan instruksi yang Anda masukkan untuk menghasilkan konten akademik. Konten yang dihasilkan oleh AI disimpan secara sementara untuk memungkinkan Anda mengakses riwayat penulisan.</li>
              <li><strong className="text-foreground">Data Penggunaan:</strong> Informasi tentang bagaimana Anda menggunakan layanan, termasuk halaman yang dikunjungi, fitur yang digunakan, dan waktu akses.</li>
              <li><strong className="text-foreground">Data Perangkat:</strong> Jenis browser, sistem operasi, dan alamat IP anonim untuk tujuan keamanan dan analitik.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">3. Penggunaan Informasi</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              Informasi yang kami kumpulkan digunakan untuk:
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground leading-relaxed space-y-1">
              <li>Menyediakan, memelihara, dan meningkatkan layanan Mamah</li>
              <li>Memproses permintaan pembuatan konten akademik Anda</li>
              <li>Menyimpan riwayat penulisan untuk akses mudah di masa mendatang</li>
              <li>Mengirimkan notifikasi penting terkait akun atau layanan</li>
              <li>Menganalisis penggunaan untuk pengembangan fitur baru</li>
              <li>Menjaga keamanan dan mencegah penyalahgunaan layanan</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">4. Pembagian Informasi</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Kami tidak menjual, memperdagangkan, atau menyewakan informasi pribadi Anda kepada pihak ketiga. Kami dapat membagikan informasi Anda dengan penyedia layanan penulisan yang membantu kami memproses permintaan konten. Informasi yang dibagikan dibatasi hanya pada data yang diperlukan untuk memproses permintaan Anda. Kami juga dapat mengungkapkan informasi jika diwajibkan oleh hukum atau untuk melindungi hak, properti, atau keselamatan Mamah dan penggunanya.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">5. Keamanan Data</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Kami menerapkan langkah-langkah keamanan teknis dan organisasi yang wajar untuk melindungi informasi pribadi Anda dari akses tidak sah, perubahan, pengungkapan, atau penghancuran. Ini termasuk enkripsi data saat transit, kontrol akses yang ketat, dan pemantauan keamanan secara berkala. Namun, tidak ada metode transmisi melalui internet yang 100% aman, dan kami tidak dapat menjamin keamanan absolut.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">6. Penyimpanan dan Penghapusan Data</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Kami menyimpan data pengguna selama akun Anda aktif atau sesuai kebutuhan untuk menyediakan layanan. Anda dapat meminta penghapusan akun dan data pribadi Anda kapan saja dengan menghubungi kami. Setelah akun dihapus, kami akan menghapus data pribadi Anda dalam waktu 30 hari kerja, kecuali jika penyimpanan diperlukan oleh hukum.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">7. Hak Pengguna</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              Anda memiliki hak untuk:
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground leading-relaxed space-y-1">
              <li>Mengakses dan mengunduh data pribadi Anda</li>
              <li>Meminta koreksi data yang tidak akurat</li>
              <li>Meminta penghapusan data pribadi Anda</li>
              <li>Menolak pemrosesan data untuk tujuan tertentu</li>
              <li>Menarik persetujuan Anda kapan saja</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">8. Perubahan Kebijakan</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu. Perubahan signifikan akan diberitahukan melalui email atau pemberitahuan di dalam aplikasi. Penggunaan layanan Anda yang berkelanjutan setelah perubahan berarti Anda menyetujui kebijakan yang diperbarui. Kami mendorong Anda untuk meninjau kebijakan ini secara berkala.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">9. Kontak</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Jika Anda memiliki pertanyaan atau kekhawatiran tentang Kebijakan Privasi ini atau praktik privasi kami, silakan hubungi kami melalui email di <strong className="text-foreground">privasi@hirahpress.com</strong>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}