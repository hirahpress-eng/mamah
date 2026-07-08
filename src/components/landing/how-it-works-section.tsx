'use client';

import { motion } from 'framer-motion';
import { FileText, Search, Wand2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function HowItWorksSection() {
  const steps = [
    {
      number: '01',
      icon: FileText,
      title: 'Masukkan Topik & Pilih Tim',
      description: 'Masukkan judul atau kata kunci penelitian Anda, pilih salah satu dari 4 tim penulis, dan tentukan metode penelitian.'
    },
    {
      number: '02',
      icon: Search,
      title: 'Cari & Analisis Referensi',
      description: 'Sistem menemukan hingga 50 referensi ilmiah relevan, menerjemahkan kata kunci, dan menyusun daftar pustaka APA 7th edition.',
    },
    {
      number: '03',
      icon: Wand2,
      title: 'Generate & Export Artikel',
      description: 'Tim AI menulis artikel IMRAD lengkap — abstrak, pendahuluan, metode, hasil & diskusi, kesimpulan. Export ke PDF atau DOCX.',
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6 }}
      className="max-w-4xl mx-auto mt-12 sm:mt-16"
    >
      <div className="text-center mb-10">
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800 mb-3">
          Cara Kerja
        </Badge>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          3 Langkah Mudah
        </h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">
          Dari ide penelitian hingga karya akademik siap publikasi — semudah 1-2-3
        </p>
      </div>

      <div className="relative">
        <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-emerald-500/40 via-teal-500/30 to-transparent -translate-x-1/2" />
        <div className="space-y-8 md:space-y-12">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isLeft = index % 2 === 0;
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="relative"
              >
                <div className="hidden md:flex absolute left-1/2 top-6 -translate-x-1/2 size-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 items-center justify-center shadow-lg shadow-emerald-500/25 z-10">
                  <span className="text-white text-xs font-bold">{step.number}</span>
                </div>
                <div className={`md:w-[calc(50%-2.5rem)] ${isLeft ? 'md:mr-auto md:pr-0 md:text-right' : 'md:ml-auto md:pl-0 md:text-left'}`}>
                  <div className="glass-card rounded-2xl p-5 sm:p-6 group hover:shadow-lg hover:shadow-emerald-500/10 transition-shadow duration-300">
                    <div className={`flex items-center gap-3 mb-3 ${isLeft ? 'md:flex-row-reverse md:text-right' : ''}`}>
                      <div className="md:hidden flex items-center justify-center size-9 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 shrink-0">
                        <StepIcon className="size-4" />
                      </div>
                      <h3 className="text-base font-bold text-foreground">{step.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}