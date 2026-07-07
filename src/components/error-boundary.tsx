'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  countdown: number;
}

const AUTO_RELOAD_SECONDS = 5;

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  private countdownTimer: ReturnType<typeof setInterval> | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, countdown: AUTO_RELOAD_SECONDS };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidMount() {
    // If somehow mounted with an error state already set, start countdown
    if (this.state.hasError) {
      this.startCountdown();
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps, prevState: ErrorBoundaryState) {
    // Start countdown when error first appears
    if (this.state.hasError && !prevState.hasError) {
      this.startCountdown();
    }

    // Reset completed: if error was cleared, clean up timer
    if (!this.state.hasError && prevState.hasError) {
      this.clearCountdownTimer();
    }
  }

  componentWillUnmount() {
    this.clearCountdownTimer();
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  private startCountdown = () => {
    this.clearCountdownTimer();
    this.setState({ countdown: AUTO_RELOAD_SECONDS });

    this.countdownTimer = setInterval(() => {
      this.setState(
        (prev) => {
          const next = prev.countdown - 1;
          if (next <= 0) {
            // Time's up — reload
            window.location.reload();
            return { countdown: 0 };
          }
          return { countdown: next };
        }
      );
    }, 1000);
  };

  private clearCountdownTimer = () => {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  };

  handleReset = () => {
    this.clearCountdownTimer();
    this.setState({ hasError: false, error: null, countdown: AUTO_RELOAD_SECONDS });
  };

  handleReloadNow = () => {
    this.clearCountdownTimer();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-4">
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <Card className="max-w-md w-full text-center border-emerald-200/50 dark:border-emerald-800/40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-lg shadow-emerald-500/5">
                <CardContent className="pt-10 pb-10 px-8 space-y-6">
                  {/* Animated icon */}
                  <motion.div
                    className="w-20 h-20 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <AlertTriangle className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                  </motion.div>

                  {/* Heading */}
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                      Terjadi Kesalahan
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Maaf, terjadi kesalahan. Halaman akan dimuat ulang otomatis...
                    </p>
                  </div>

                  {/* Countdown with animated spinner */}
                  <motion.div
                    className="flex items-center justify-center gap-3 text-emerald-600 dark:text-emerald-400"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Loader2 className="w-5 h-5" />
                    </motion.div>
                    <span className="text-sm font-medium">
                      Memuat ulang dalam {this.state.countdown}...
                    </span>
                  </motion.div>

                  {/* Error detail (collapsed) */}
                  <details className="text-left">
                    <summary className="text-xs text-slate-400 dark:text-slate-500 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                      Detail kesalahan
                    </summary>
                    <p className="mt-2 text-xs text-muted-foreground bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 font-mono break-all">
                      {this.state.error?.message || 'Unknown error'}
                    </p>
                  </details>

                  {/* Manual reload button */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <Button
                      onClick={this.handleReloadNow}
                      className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all duration-200 hover:shadow-lg hover:shadow-emerald-600/30"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Muat Ulang Sekarang
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      );
    }

    return this.props.children;
  }
}