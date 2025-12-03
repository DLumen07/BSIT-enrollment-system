'use client';

import { ArrowLeft, Eye, EyeOff, Mail, Lock, Copyright } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import React, { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAdmin } from '@/app/admin/context/admin-context';
import { BSITBackground } from '@/components/bsit-background';
import { motion, useMotionValue, useMotionTemplate } from 'framer-motion';
import { resolveMediaUrl } from '@/lib/utils';

const ADMIN_PORTAL_API_BASE = (process.env.NEXT_PUBLIC_BSIT_API_BASE_URL ?? 'http://localhost/bsit_api')
  .replace(/\/+$/, '')
  .trim();

function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { adminData, setAdminData } = useAdmin();
  const { adminUsers, instructors } = adminData;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (email.trim() === '' || password.trim() === '') {
      toast({
        variant: 'destructive',
        title: 'Missing Credentials',
        description: 'Please enter both your email and password to continue.',
      });
      return;
    }

    const admin = adminUsers.find(user => user.email === email);
    if (admin) {
      const normalizedAdmin = {
        ...admin,
        avatar: resolveMediaUrl(admin.avatar ?? null, ADMIN_PORTAL_API_BASE) ?? (admin.avatar ?? ''),
      };
      setAdminData(prev => ({ ...prev, currentUser: normalizedAdmin }));
      sessionStorage.setItem('currentUser', JSON.stringify(normalizedAdmin));
        router.push('/admin/dashboard');
        return;
    }

    const instructor = instructors.find(user => user.email === email);
    if (instructor) {
      router.push(`/instructor/dashboard?email=${encodeURIComponent(email)}`);
      return;
    }
    
    toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'No account found with that email address. Please check your credentials.',
    });
  };

  return (
    <div className="space-y-4 w-full text-left">
      <div className="space-y-2">
          <Label htmlFor="email" className="text-slate-300">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
                id="email"
                type="email"
                placeholder="staff@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 rounded-xl focus-visible:ring-orange-500 focus-visible:border-orange-500 transition-all pl-10"
            />
          </div>
      </div>
      <div className="space-y-2">
          <Label htmlFor="password" className="text-slate-300">Password</Label>
          <div className="relative group">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
                id="password" 
                type={showPassword ? "text" : "password"}
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 rounded-xl focus-visible:ring-orange-500 focus-visible:border-orange-500 transition-all pl-10 pr-10"
            />
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-slate-400 hover:text-white hover:bg-transparent"
                onClick={() => setShowPassword(prev => !prev)}
            >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
      </div>
      <Button onClick={handleLogin} className="w-full h-12 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl shadow-lg shadow-orange-900/20 transition-all hover:scale-[1.02] mt-2">
          Login
      </Button>
    </div>
  );
}

export default function AdminLoginPage() {
    const [isClient, setIsClient] = useState(false);

    // 3D Tilt Logic
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const handleMouseMove = ({ currentTarget, clientX, clientY }: React.MouseEvent) => {
      const { left, top } = currentTarget.getBoundingClientRect();
      mouseX.set(clientX - left);
      mouseY.set(clientY - top);
    };

    useEffect(() => {
        setIsClient(true);
    }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-center font-sans selection:bg-blue-500/30">
      <BSITBackground />

      <main className="container relative z-10 px-4 flex flex-col items-center justify-center py-10">
        
        <motion.div 
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative group perspective-[1000px] w-full max-w-md"
          onMouseMove={handleMouseMove}
        >
          {/* Gradient Border (Orange dominant for Admin) */}
          <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-900 via-orange-500 to-white rounded-[2rem] blur opacity-30 group-hover:opacity-50 transition duration-500" />
          
          <div className="relative w-full bg-[#0B1121]/90 backdrop-blur-xl rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl p-8 md:p-10">
            
            {/* Back Button (Inside Card) */}
            <Link 
              href="/" 
              className="absolute top-6 left-6 z-20 flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-xs font-medium group/back"
            >
              <div className="p-2 rounded-full bg-white/5 border border-white/10 group-hover/back:bg-white/10 transition-all">
                <ArrowLeft className="w-4 h-4" />
              </div>
            </Link>

            {/* Tech Grid Pattern Reveal */}
            <motion.div
              className="pointer-events-none absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-40"
              style={{
                backgroundImage: 'radial-gradient(rgba(59, 130, 246, 0.15) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
                maskImage: useMotionTemplate`radial-gradient(350px circle at ${mouseX}px ${mouseY}px, black, transparent)`,
                WebkitMaskImage: useMotionTemplate`radial-gradient(350px circle at ${mouseX}px ${mouseY}px, black, transparent)`,
              }}
            />

            {/* Spotlight */}
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
                Admin <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-blue-700">Portal</span>
              </h1>
              
              {isClient && <LoginForm />}

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
