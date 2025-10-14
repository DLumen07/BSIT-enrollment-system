
'use client';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useAdmin } from '@/app/admin/context/admin-context';


function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { adminData, setAdminData } = useAdmin();
  const { adminUsers, instructors } = adminData;

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  const handleLogin = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    const admin = adminUsers.find(user => user.email === email);
    if (admin) {
        setAdminData(prev => ({ ...prev, currentUser: admin }));
        sessionStorage.setItem('currentUser', JSON.stringify(admin));
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
        <Input 
          id="password" 
          type="password" 
          required 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-xl hover:border-accent focus-visible:ring-accent hover:shadow-[0_0_8px_hsl(var(--accent)/0.5)] focus-visible:shadow-[0_0_8px_hsl(var(--accent)/0.5)] transition-all"
        />
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
        "bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,hsl(var(--primary)/0.3),hsl(var(--accent)/0.3)))]",
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
          &copy; BUMBBLEBITTECH | All rights reserved.
        </p>
      </footer>
    </div>
  );
}
