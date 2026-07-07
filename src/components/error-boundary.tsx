'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorId: string;
}

function generateErrorId(): string {
  return `ERR-${Date.now().toString(36).toUpperCase()}`;
}

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorId: '' };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error, errorId: generateErrorId() };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log full details to console for debugging, but NEVER show to user
    console.error('[ErrorBoundary]', this.state.errorId, error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorId: '' });
  };

  handleReloadNow = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
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

                  {/* Heading — NO error details shown */}
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                      Terjadi Kesalahan
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Maaf, sesuatu tidak beres. Silakan coba muat ulang halaman.
                    </p>
                  </div>

                  {/* Error ID for support (safe, no details) */}
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                    ID: {this.state.errorId}
                  </p>

                  {/* Action buttons */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-3"
                  >
                    <Button
                      onClick={this.handleReloadNow}
                      className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all duration-200 hover:shadow-lg hover:shadow-emerald-600/30"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Muat Ulang Halaman
                    </Button>
                    <Button
                      variant="outline"
                      onClick={this.handleGoHome}
                      className="gap-2"
                    >
                      <Home className="w-4 h-4" />
                      Kembali ke Beranda
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