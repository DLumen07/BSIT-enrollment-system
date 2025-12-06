'use client';

import { ArrowLeft, Calendar, Eye, EyeOff, IdCard, Lock, Copyright } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { BSITBackground } from '@/components/bsit-background';
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion';

const API_BASE_URL = (process.env.NEXT_PUBLIC_BSIT_API_BASE_URL ?? 'http://localhost/bsit_api')
  .replace(/\/$/, '')
  .trim();

const buildApiUrl = (endpoint: string) => `${API_BASE_URL}/${endpoint.replace(/^\//, '')}`;
const RESET_PASSWORD_ENDPOINT = buildApiUrl('reset_student_password.php');

function ForgotPasswordForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [birthdateFocused, setBirthdateFocused] = useState(false);
  const [formValues, setFormValues] = useState({
    studentIdNumber: '',
    birthdate: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleChange = (field: keyof typeof formValues) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setFormValues((prev) => ({
      ...prev,
      [field]: field === 'studentIdNumber' ? value.toUpperCase() : value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const trimmedId = formValues.studentIdNumber.trim();
    const trimmedBirthdate = formValues.birthdate.trim();

    if (!trimmedId || !trimmedBirthdate) {
      setErrorMessage('Please provide both your Student ID and birthdate.');
      return;
    }

    if (formValues.newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }

    if (formValues.newPassword !== formValues.confirmPassword) {
      setErrorMessage('New password and confirmation must match.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(RESET_PASSWORD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          studentIdNumber: trimmedId,
          birthdate: trimmedBirthdate,
          newPassword: formValues.newPassword,
          confirmPassword: formValues.confirmPassword,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload || payload.status !== 'success') {
        const message = payload?.message ?? 'Unable to reset your password right now.';
        throw new Error(message);
      }

      toast({
        title: 'Password reset',
        description: payload.message ?? 'You can now log in with your new password.',
      });

      setFormValues({
        studentIdNumber: '',
        birthdate: '',
        newPassword: '',
        confirmPassword: '',
      });
      router.push('/student-login');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to reset your password right now.';
      setErrorMessage(message);
      toast({
        variant: 'destructive',
        title: 'Reset failed',
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="reset-student-id" className="text-slate-300">
          Student ID Number
        </Label>
        <div className="relative">
          <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            id="reset-student-id"
            placeholder="24-00-0001"
            value={formValues.studentIdNumber}
            onChange={handleChange('studentIdNumber')}
            className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 rounded-xl focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all pl-10"
            autoComplete="username"
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="reset-birthdate" className="text-slate-300">
          Date of Birth
        </Label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            id="reset-birthdate"
            type={birthdateFocused || formValues.birthdate ? 'date' : 'text'}
            placeholder="Date of Birth"
            value={formValues.birthdate}
            onChange={handleChange('birthdate')}
            onFocus={() => setBirthdateFocused(true)}
            onBlur={() => setBirthdateFocused(false)}
            className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 rounded-xl focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all pl-10 [&::-webkit-calendar-picker-indicator]:hidden"
            autoComplete="bday"
            required
          />
        </div>
        <p className="text-xs text-slate-500 ml-1">
          Use the same birthdate format you submitted during enrollment.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="reset-new-password" className="text-slate-300">
          New Password
        </Label>
        <div className="relative group">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            id="reset-new-password"
            type={showNewPassword ? 'text' : 'password'}
            value={formValues.newPassword}
            onChange={handleChange('newPassword')}
            className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 rounded-xl focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all pl-10 pr-10"
            autoComplete="new-password"
            minLength={8}
            required
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-slate-400 hover:text-white hover:bg-transparent"
            onClick={() => setShowNewPassword((prev) => !prev)}
          >
            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="reset-confirm-password" className="text-slate-300">
          Confirm Password
        </Label>
        <div className="relative group">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            id="reset-confirm-password"
            type={showConfirmPassword ? 'text' : 'password'}
            value={formValues.confirmPassword}
            onChange={handleChange('confirmPassword')}
            className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 rounded-xl focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all pl-10 pr-10"
            autoComplete="new-password"
            minLength={8}
            required
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-slate-400 hover:text-white hover:bg-transparent"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      {errorMessage && (
        <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl p-3" role="alert">
          {errorMessage}
        </p>
      )}

      <Button
        type="submit"
        className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02] mt-2"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Resetting…' : 'Reset Password'}
      </Button>
    </form>
  );
}

export default function ForgotPasswordPage() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = ({ currentTarget, clientX, clientY }: React.MouseEvent) => {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-center font-sans selection:bg-orange-500/30">
      <BSITBackground />

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
              href="/student-login"
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
                Reset <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-orange-600">Password</span>
              </h1>

              <ForgotPasswordForm />

              <div className="mt-6 text-center text-sm text-slate-500">
                Remember your password?{' '}
                <Link
                  href="/student-login"
                  className="text-blue-400 hover:text-blue-300 font-medium underline underline-offset-4 transition-colors"
                >
                  Login
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
