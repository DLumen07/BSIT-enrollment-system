'use client';

import { ArrowLeft, Eye, EyeOff, Mail, Lock, Copyright } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import React, { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { BSITBackground } from '@/components/bsit-background';
import { motion, useMotionValue, useMotionTemplate } from 'framer-motion';
import Loading from '@/app/loading';

const API_BASE_URL = (process.env.NEXT_PUBLIC_BSIT_API_BASE_URL ?? 'http://localhost/bsit_api')
  .replace(/\/$/, '')
  .trim();

const buildApiUrl = (endpoint: string) => `${API_BASE_URL}/${endpoint.replace(/^\//, '')}`;
const LOGIN_ENDPOINT = buildApiUrl('student_login.php');

type StudentLoginResponse = {
  status: 'success' | 'error';
  message?: string;
  data?: {
    email?: string;
    studentId?: string;
    name?: string;
    needsPasswordUpdate?: boolean | number | string;
  };
};

type LoginFormProps = {
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
};

function LoginForm({ isSubmitting, setIsSubmitting }: LoginFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const trimmedEmail = email.trim();
    if (trimmedEmail === '' || password.trim() === '') {
      setFormError('Please provide both your email and password.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    
    const startTime = Date.now();

    try {
      const response = await fetch(LOGIN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: trimmedEmail,
          password,
        }),
      });

      const payload: StudentLoginResponse | null = await response.json().catch(() => null);
      if (!response.ok || !payload || payload.status !== 'success') {
        const message = payload?.message ?? 'Unable to log in right now.';
        throw new Error(message);
      }

      const data = payload.data ?? {};
      const resolvedEmail = typeof data.email === 'string' && data.email.trim() !== '' ? data.email.trim() : trimmedEmail;

      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('bsit_student_email', resolvedEmail);
      }

      const params = new URLSearchParams();
      if (data.needsPasswordUpdate === true || data.needsPasswordUpdate === 1 || data.needsPasswordUpdate === '1') {
        params.set('needsPasswordUpdate', '1');
      }

      // Minimum loading time of 2 seconds
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime < 2000) {
        await new Promise(resolve => setTimeout(resolve, 2000 - elapsedTime));
      }

      const queryString = params.toString();
      router.push(queryString ? `/student/dashboard?${queryString}` : '/student/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to log in right now.';
      setFormError(message);
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: message,
      });
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-4 w-full text-left" onSubmit={handleLogin} noValidate>
      <div className="space-y-2">
        <Label htmlFor="email" className="text-slate-300">
          Email
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            id="email"
            type="email"
            placeholder="student@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
            disabled={isSubmitting}
            className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 rounded-xl focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all pl-10"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-slate-300">
          Password
        </Label>
        <div className="relative group">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            disabled={isSubmitting}
            className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 rounded-xl focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all pl-10 pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-slate-400 hover:text-white hover:bg-transparent"
            onClick={() => setShowPassword((prev) => !prev)}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      {formError && (
        <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl p-3" role="alert">
          {formError}
        </p>
      )}
      <Button
        type="submit"
        className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02] mt-2"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Signing in…' : 'Login'}
      </Button>
      <div className="flex justify-center">
        <Button type="button" variant="link" className="px-0 text-sm text-blue-300 hover:text-blue-200" asChild>
          <Link href="/student-login/forgot">Forgot password?</Link>
        </Button>
      </div>
    </form>
  );
}

export default function StudentLoginPage() {
  const [isClient, setIsClient] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = ({ currentTarget, clientX, clientY }: React.MouseEvent) => {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  };

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('bsit_student_email');
    }
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-center font-sans selection:bg-orange-500/30">
      <BSITBackground />

      {isSubmitting && (
        <div className="fixed inset-0 z-50">
            <Loading />
        </div>
      )}

      <main className="container relative z-10 px-4 flex flex-col items-center justify-center py-10">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative group perspective-[1000px] w-full max-w-md"
          onMouseMove={handleMouseMove}
        >
          <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-900 via-orange-500 to-white rounded-[2rem] blur opacity-30 group-hover:opacity-50 transition duration-500" />

          <div className="relative w-full bg-[#0B1121]/90 backdrop-blur-xl rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl p-8 md:p-10">
            <Link
              href="/"
              className="absolute top-6 left-6 z-20 flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-xs font-medium group/back"
            >
              <div className="p-2 rounded-full bg-white/5 border border-white/10 group-hover/back:bg-white/10 transition-all">
                <ArrowLeft className="w-4 h-4" />
              </div>
            </Link>

            <motion.div
              className="pointer-events-none absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-40"
              style={{
                backgroundImage: 'radial-gradient(rgba(59, 130, 246, 0.15) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
                maskImage: useMotionTemplate`radial-gradient(350px circle at ${mouseX}px ${mouseY}px, black, transparent)`,
                WebkitMaskImage: useMotionTemplate`radial-gradient(350px circle at ${mouseX}px ${mouseY}px, black, transparent)`,
              }}
            />

            <motion.div
              className="pointer-events-none absolute -inset-px rounded-[2rem] opacity-0 transition duration-500 group-hover:opacity-100"
              style={{
                background: useMotionTemplate`
                  radial-gradient(
                    650px circle at ${mouseX}px ${mouseY}px,
                    rgba(59, 130, 246, 0.05),
                    rgba(30, 58, 138, 0.1),
                    transparent 80%
                  )
                `,
              }}
            />

            <div className="relative z-10 flex flex-col items-center text-center pt-4">
              <h1 className="text-3xl font-black tracking-tighter text-white mb-8">
                Student <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-orange-600">Login</span>
              </h1>

              {isClient && <LoginForm isSubmitting={isSubmitting} setIsSubmitting={setIsSubmitting} />}

              <div className="mt-6 text-center text-sm text-slate-500">
                Don't have an account?{' '}
                <Link
                  href="/student-signup"
                  className="text-blue-400 hover:text-blue-300 font-medium underline underline-offset-4 transition-colors"
                >
                  Sign up
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      <footer className="absolute bottom-6 w-full text-center flex items-center justify-center gap-2 text-[10px] text-slate-600 font-medium uppercase tracking-wider">
        <Copyright className="w-3 h-3" />
        <span>DarenDL7</span>
        <span className="w-px h-3 bg-slate-700/50 mx-1" />
        <span>All Rights Reserved</span>
      </footer>
    </div>
  );
}
