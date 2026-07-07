'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Crown } from 'lucide-react';

const STORAGE_KEY = 'mamah-promo-dismissed';

let listeners: Array<() => void> = [];

function subscribe(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function getSnapshot(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function getServerSnapshot(): boolean {
  return true; // hidden on server to prevent flash
}

function setDismissed(value: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, value ? 'true' : '');
  } catch {
    /* noop */
  }
  listeners.forEach((l) => l());
}

export default function PromoBanner() {
  const dismissed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  if (dismissed) return null;

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="overflow-hidden"
        >
          <div className="relative bg-gradient-to-r from-emerald-600/90 via-teal-600/90 to-emerald-700/90 dark:from-emerald-800/80 dark:via-teal-800/80 dark:to-emerald-900/80 backdrop-blur-md">
            <div className="flex items-center justify-center gap-2 sm:gap-3 px-4 py-2.5 sm:px-6 max-w-7xl mx-auto text-center">
              {/* Left decoration */}
              <div className="hidden sm:flex items-center gap-1.5 text-amber-300">
                <Crown className="size-3.5" />
              </div>

              {/* Banner text */}
              <p className="text-xs sm:text-sm font-medium text-white/95 truncate">
                <Sparkles className="inline size-3 sm:size-3.5 mr-1 -mt-0.5 text-amber-200" />
                <span className="hidden sm:inline">
                  Akses fitur Pro — unlimited generasi, export premium, dan
                  prioritas AI.
                </span>
                <span className="sm:hidden">
                  Coba fitur Pro — unlimited & export premium!
                </span>{' '}
                <span className="text-amber-200 font-semibold">
                  Coba gratis 7 hari!
                </span>
              </p>

              {/* CTA button */}
              <button
                className="btn-gradient flex-shrink-0 text-xs font-semibold text-white px-3 py-1 rounded-full transition-all hover:scale-105 active:scale-95"
                onClick={() => {
                  /* navigate to pro page */
                }}
              >
                <span className="hidden sm:inline">Coba Pro Gratis</span>
                <span className="sm:hidden">Coba</span>
              </button>

              {/* Dismiss button */}
              <button
                onClick={handleDismiss}
                className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
                aria-label="Tutup banner"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}