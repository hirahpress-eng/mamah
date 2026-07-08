'use client';

import { motion } from 'framer-motion';
import { Quote, Star } from 'lucide-react';

export default function SocialProofSection() {
  const stats = [
    { value: 4, suffix: '', label: 'Tim Penulis', display: '4' },
    { value: 8, suffix: '+', label: 'Database Akademik', display: '8+' },
    { value: 7, suffix: 'th', label: 'Edition', display: 'APA 7th', prefix: 'Format ' },
    { value: 3, suffix: '', label: 'Export Format', display: 'PDF, DOCX, MD' },
  ];

  const testimonials = [
    {
      text: 'Mamah sangat membantu saya menulis artikel ilmiah untuk jurnal. Referensi yang dihasilkan relevan dan tulisan sudah siap dipublikasikan.',
      author: 'Dr. Siti Nurhaliza',
      title: 'Dosen Universitas Indonesia',
      stars: 5,
    },
    {
      text: 'Sebagai peneliti, saya bisa menghemat waktu hingga 80% untuk menulis artikel jurnal. Kualitas tulisan sangat akademis dan terstruktur.',
      author: 'Ahmad Fauzi',
      title: 'Peneliti SINTA',
      stars: 5,
    },
    {
      text: 'Dengan 4 tim penulis AI, saya bisa memilih tim terbaik untuk topik penelitian saya. Hasilnya sangat akademis dan terstruktur sesuai standar jurnal.',
      author: 'Prof. Budi Santoso',
      title: 'Peneliti & Dosen',
      stars: 5,
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
  };

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={containerVariants}
      className="max-w-4xl mx-auto mt-12 sm:mt-16 space-y-10 sm:space-y-14"
    >
      <motion.div variants={fadeUp}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              variants={fadeUp}
              className="glass-card rounded-xl p-4 sm:p-5 text-center"
            >
              <motion.p
                className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-gradient-emerald"
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
              >
                {stat.prefix && <span className="text-base sm:text-lg font-bold text-muted-foreground">{stat.prefix}</span>}
                {stat.display}
              </motion.p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 font-medium">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div variants={fadeUp}>
        <h2 className="text-center text-lg sm:text-xl font-bold text-foreground mb-6 sm:mb-8">
          Dipercaya oleh Ribuan Penulis Akademik
        </h2>
        <p className="text-xs text-muted-foreground text-center -mt-1 mb-6 sm:mb-8">
          * Testimoni di bawah merupakan contoh ilustrasi
        </p>
        <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.author}
              variants={fadeUp}
              custom={i}
              className="glass-card rounded-xl p-5 sm:p-6 flex flex-col gap-4"
            >
              <Quote className="size-6 text-emerald-500/40 shrink-0" />
              <p className="text-sm leading-relaxed text-foreground/80 flex-1">
                &ldquo;{t.text}&rdquo;
              </p>
              <div className="pt-2 border-t border-border/40">
                <p className="text-sm font-bold text-foreground">{t.author}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.title}</p>
              </div>
              <div className="flex gap-0.5" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, si) => (
                  <Star
                    key={si}
                    className={`size-3.5 ${si < t.stars ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'}`}
                  />
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.section>
  );
}