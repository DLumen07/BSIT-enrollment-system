
'use client';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import React, { useState, useEffect } from 'react';
import { cn, resolveMediaUrl } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAdmin } from '@/app/admin/context/admin-context';
import { Eye, EyeOff } from 'lucide-react';

const ADMIN_PORTAL_API_BASE = (process.env.NEXT_PUBLIC_BSIT_API_BASE_URL ?? 'http://localhost/bsit_api')
  .replace(/\/+$/, '')
  .trim();


function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { adminData, setAdminData } = useAdmin();
  const { adminUsers, instructors } = adminData;

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
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
    <form className="space-y-4">
      <div className="space-y-2 text-left">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="staff@example.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-xl hover:border-accent focus-visible:ring-accent hover:shadow-[0_0_8px_hsl(var(--accent)/0.5)] focus-visible:shadow-[0_0_8px_hsl(var(--accent)/0.5)] transition-all"
        />
      </div>
      <div className="space-y-2 text-left">
        <Label htmlFor="password">Password</Label>
        <div className="relative group">
            <Input 
              id="password" 
              type={showPassword ? "text" : "password"} 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl hover:border-accent focus-visible:ring-accent hover:shadow-[0_0_8px_hsl(var(--accent)/0.5)] focus-visible:shadow-[0_0_8px_hsl(var(--accent)/0.5)] transition-all pr-10"
            />
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:bg-transparent opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
                onClick={() => setShowPassword(prev => !prev)}
            >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
        </div>
      </div>
      <Button onClick={handleLogin} className="w-full rounded-xl hover:shadow-[0_0_8px_hsl(var(--accent)/0.5)] transition-shadow" variant="accent">
        Login
      </Button>
    </form>
  )
}

export default function StaffLoginPage() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className={cn(
        "dark",
        "flex flex-col min-h-screen bg-background",
        "bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,hsl(var(--primary)/0.3),hsl(var(--background)))]",
    )}>
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md relative">
           <Button asChild variant="ghost" size="icon" className="absolute top-4 left-4 hover:text-accent">
            <Link href="/">
              <ArrowLeft />
              <span className="sr-only">Back to Home</span>
            </Link>
          </Button>
          <Card className="shadow-[0_8px_16px_-4px_hsl(var(--primary)/0.3),0_-8px_16px_-4px_hsl(var(--accent)/0.3)] rounded-2xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Faculty & Admin Login</CardTitle>
              <CardDescription>
                Enter your credentials to access your dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isClient ? <LoginForm /> : <div className="h-[212px]"></div>}
            </CardContent>
          </Card>
        </div>
      </main>
      <footer className="py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground text-center">
          &copy;{' '}
          <a
            href="https://github.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline-offset-4 hover:underline"
          >
            DarenDL7
          </a>{' '}
          | All rights reserved.
        </p>
      </footer>
    </div>
  );
}
