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

function LoginForm() {
  const router = useRouter();
  const { adminData } = useAdmin();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const student = adminData.students.find(s => s.email === email);

    if (student) {
        router.push(`/student/dashboard?email=${encodeURIComponent(email)}`);
    } else {
        toast({
            variant: 'destructive',
            title: 'Login Failed',
            description: 'No student account found with that email address.',
        });
    }
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
                placeholder="student@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 rounded-xl focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all pl-10"
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
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 rounded-xl focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-all pl-10 pr-10"
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
      <Button onClick={handleLogin} className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02] mt-2">
          Login
      </Button>
    </div>
  );
}

export default function StudentLoginPage() {
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
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-center font-sans selection:bg-orange-500/30">
      <BSITBackground />

      <main className="container relative z-10 px-4 flex flex-col items-center justify-center py-10">
        
        <motion.div 
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative group perspective-[1000px] w-full max-w-md"
          onMouseMove={handleMouseMove}
        >
          {/* Gradient Border */}
          <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-500 via-orange-500 to-blue-600 rounded-[2rem] blur opacity-30 group-hover:opacity-60 transition duration-500" />
          
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

            {/* Spotlight */}
            <motion.div
              className="pointer-events-none absolute -inset-px rounded-[2rem] opacity-0 transition duration-500 group-hover:opacity-100"
              style={{
                background: useMotionTemplate`
                  radial-gradient(
                    500px circle at ${mouseX}px ${mouseY}px,
                    rgba(255,255,255,0.06),
                    transparent 80%
                  )
                `,
              }}
            />

            <div className="relative z-10 flex flex-col items-center text-center pt-4">
              <h1 className="text-3xl font-black tracking-tighter text-white mb-8">
                Student <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-orange-600">Login</span>
              </h1>
              
              {isClient && <LoginForm />}

              <div className="mt-6 text-center text-sm text-slate-500">
                Don't have an account?{' '}
                <Link href="/student-signup" className="text-blue-400 hover:text-blue-300 font-medium underline underline-offset-4 transition-colors">
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
