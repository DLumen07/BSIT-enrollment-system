
'use client';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import React from 'react';
import { cn } from '@/lib/utils';

export default function AdminLoginPage() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  React.useEffect(() => {
    setEmail('admin@example.com');
    setPassword('password');
  }, []);

  return (
    <div className={cn(
        "flex flex-col min-h-screen bg-background",
        "bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,hsl(var(--accent)/0.3),hsl(var(--background)))]",
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
              <CardTitle className="text-2xl">Administrator Login</CardTitle>
              <CardDescription>
                Enter your credentials to access the admin dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2 text-left">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
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
                <Button asChild className="w-full rounded-xl hover:shadow-[0_0_8px_hsl(var(--accent)/0.5)] transition-shadow" variant="accent">
                  <Link href="/admin/dashboard">Login</Link>
                </Button>
              </div>
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
