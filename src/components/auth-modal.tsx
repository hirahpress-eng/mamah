'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  GraduationCap,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  Sparkles,
  Shield,
  BookOpen,
  LogOut,
} from 'lucide-react';
import { toast } from 'sonner';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onAuthSuccess: (user: {
    id: string;
    email: string;
    name?: string | null;
    avatarUrl?: string | null;
    role?: string;
    subscriptionTier?: string;
  }) => void;
}

/* ── Google Identity Types (HIDDEN — commented out per user request) ──
interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

// Declare global for the GIS script
declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          prompt: () => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme: string;
              size: string;
              width: string;
              text: string;
              shape: string;
              logo_alignment: string;
            }
          ) => void;
        };
      };
    };
  }
}
── End Google Identity Types ── */

export default function AuthModal({ open, onClose, onAuthSuccess }: AuthModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  // const [googleLoading, setGoogleLoading] = useState(false); // Google OAuth hidden
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  // const googleButtonRef = useRef<HTMLDivElement>(null); // Google OAuth hidden
  // const scriptLoaded = useRef(false); // Google OAuth hidden

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  /* ── Google Identity Services script loading (HIDDEN) ──
  useEffect(() => {
    if (!open || scriptLoaded.current) return;

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      scriptLoaded.current = true;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: false,
      });

      if (googleButtonRef.current) {
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          width: '360',
          text: 'signin_with',
          shape: 'pill',
          logo_alignment: 'center',
        });
      }
    };
    document.head.appendChild(script);

    return () => {
      if (googleButtonRef.current) {
        googleButtonRef.current.innerHTML = '';
      }
    };
  }, [open]);
  ── End Google GIS loading ── */

  /* ── Google Credential Handler (HIDDEN) ──
  const handleGoogleCredentialResponse = useCallback(async (response: { credential: string }) => {
    setGoogleLoading(true);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`Selamat datang, ${data.user.name || data.user.email}! 🎉`);
        onAuthSuccess(data.user);
        onClose();
      } else {
        toast.error(data.error || 'Login Google gagal');
      }
    } catch {
      toast.error('Koneksi gagal. Silakan coba lagi.');
    } finally {
      setGoogleLoading(false);
    }
  }, [onAuthSuccess, onClose]);
  ── End Google Credential Handler ── */

  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      toast.error('Email dan password harus diisi');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Selamat datang kembali! 🎉');
        onAuthSuccess(data.user);
        onClose();
      } else {
        toast.error(data.error || 'Login gagal');
      }
    } catch {
      toast.error('Koneksi gagal. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      toast.error('Semua field harus diisi');
      return;
    }
    if (formData.password.length < 6) {
      toast.error('Password minimal 6 karakter');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Password tidak cocok');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          fullName: formData.name,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Akun dibuat! Cek email untuk konfirmasi 📧');
        onClose();
      } else {
        toast.error(data.error || 'Signup gagal');
      }
    } catch {
      toast.error('Koneksi gagal. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      toast.success('Berhasil logout');
      window.location.reload();
    } catch {
      toast.error('Gagal logout');
    }
  };

  // Google OAuth hidden — clientId, currentOrigin, isLocalhost commented out
  // const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  // const [currentOrigin, setCurrentOrigin] = useState('');
  // useEffect(() => { if (open) setCurrentOrigin(window.location.origin); }, [open]);
  // const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md"
          >
            <Card className="shadow-2xl border-0 overflow-hidden">
              {/* Gradient Header */}
              <div className="h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

              <CardHeader className="text-center pb-2">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                  className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg"
                >
                  <GraduationCap className="h-7 w-7 text-white" />
                </motion.div>
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Mamah
                </CardTitle>
                <CardDescription className="text-sm">
                  Masuk untuk menyimpan & mengelola riset Anda
                </CardDescription>
              </CardHeader>

              <CardContent>
                {/* ── Email Login / Signup (Primary) ── */}
                <div className="space-y-3">
                    {/* Name (for signup) */}
                    <div className="space-y-1.5">
                      <Label htmlFor="login-name" className="text-xs">Nama Lengkap</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          id="login-name"
                          type="text"
                          placeholder="Nama Anda"
                          className="pl-9 h-9 text-sm"
                          value={formData.name}
                          onChange={(e) => updateField('name', e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSignup()}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="login-email" className="text-xs">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="email@anda.com"
                          className="pl-9 h-9 text-sm"
                          value={formData.email}
                          onChange={(e) => updateField('email', e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="login-password" className="text-xs">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          className="pl-9 pr-9 h-9 text-sm"
                          value={formData.password}
                          onChange={(e) => updateField('password', e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                        >
                          {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={handleLogin}
                        disabled={loading}
                        size="sm"
                        className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md"
                      >
                        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5 mr-1" />}
                        Masuk
                      </Button>
                      <Button
                        onClick={handleSignup}
                        disabled={loading}
                        variant="outline"
                        size="sm"
                      >
                        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                        Daftar
                      </Button>
                    </div>
                  </div>
              </CardContent>

              <CardFooter className="justify-center border-t pt-3 pb-5">
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    <span>Terenkripsi</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    <span>Gratis</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    Login Aman
                  </Badge>
                </div>
              </CardFooter>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}