'use client';

import React from 'react';
import { Home, History, Sun, Moon, LogIn, UserCircle } from 'lucide-react';

interface MobileBottomNavProps {
  onHome: () => void;
  onHistory: () => void;
  onThemeToggle: () => void;
  onAuth: () => void;
  isDark: boolean;
  isLoggedIn: boolean;
}

export default function MobileBottomNav({
  onHome,
  onHistory,
  onThemeToggle,
  onAuth,
  isDark,
  isLoggedIn,
}: MobileBottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden"
      aria-label="Mobile navigation"
    >
      {/* Emerald gradient top border */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, #10b981 20%, #14b8a6 50%, #059669 80%, transparent 100%)',
        }}
      />
      <div className="glass-card rounded-none border-t-0 border-b-0">
        <div className="flex items-center justify-around h-14 px-2">
          {/* Home */}
          <button
            onClick={onHome}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            aria-label="Home"
          >
            <Home className="size-5" />
            <span className="text-[10px] leading-none">Home</span>
          </button>

          {/* History */}
          <button
            onClick={onHistory}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            aria-label="Article history"
          >
            <History className="size-5" />
            <span className="text-[10px] leading-none">History</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={onThemeToggle}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? (
              <Sun className="size-5" />
            ) : (
              <Moon className="size-5" />
            )}
            <span className="text-[10px] leading-none">
              {isDark ? 'Light' : 'Dark'}
            </span>
          </button>

          {/* Sign In / Profile */}
          <button
            onClick={onAuth}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            aria-label={isLoggedIn ? 'Profile' : 'Sign in'}
          >
            {isLoggedIn ? (
              <UserCircle className="size-5" />
            ) : (
              <LogIn className="size-5" />
            )}
            <span className="text-[10px] leading-none">
              {isLoggedIn ? 'Profile' : 'Sign In'}
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
}