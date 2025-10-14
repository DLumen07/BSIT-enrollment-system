
'use client';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24 24" {...props}>
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
  
const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
<svg role="img" viewBox="0 0 24 24" {...props}>
    <path
    fill="currentColor"
    d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89H8.313v-2.89H10.44v-2.06c0-2.123 1.258-3.3 3.198-3.3c.902 0 1.8.15 1.8.15v2.46h-1.28c-1.033 0-1.38.618-1.38 1.32v1.59h2.77l-.445 2.89h-2.325v7.008C18.343 21.128 22 16.991 22 12z"
    />
</svg>
);

function LoginForm() {
  const router = useRouter();

  const handleLogin = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    router.push('/student/dashboard');
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2 text-left">
          <Label htmlFor="email">Email</Label>
          <Input
              id="email"
              type="email"
              placeholder="student@example.com"
              required
              className="rounded-xl hover:border-primary focus-visible:ring-primary hover:shadow-[0_0_8px_hsl(var(--primary)/0.5)] focus-visible:shadow-[0_0_8px_hsl(var(--primary)/0.5)] transition-all"
          />
      </div>
      <div className="space-y-2 text-left">
          <Label htmlFor="password">Password</Label>
          <Input 
              id="password" 
              type="password" 
              required 
              className="rounded-xl hover:border-primary focus-visible:ring-primary hover:shadow-[0_0_8px_hsl(var(--primary)/0.5)] focus-visible:shadow-[0_0_8px_hsl(var(--primary)/0.5)] transition-all"
          />
      </div>
      <Button onClick={handleLogin} className="w-full rounded-xl hover:shadow-[0_0_8px_hsl(var(--primary)/0.5)] transition-shadow">
          Login
      </Button>
    </div>
  );
}

export default function StudentLoginPage() {
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
          <Button asChild variant="ghost" size="icon" className="absolute top-4 left-4 text-foreground hover:text-primary">
            <Link href="/">
              <ArrowLeft />
              <span className="sr-only">Back to Home</span>
            </Link>
          </Button>
          <Card className="shadow-[0_8px_16px_-4px_hsl(var(--primary)/0.3),0_-8px_16px_-4px_hsl(var(--accent)/0.3)] rounded-2xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Student Login</CardTitle>
              <CardDescription>
                Choose a login method to access your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button variant="outline" className="w-full rounded-xl hover:border-primary hover:shadow-[0_0_8px_hsl(var(--primary)/0.5)] transition-shadow">
                  <GoogleIcon className="mr-2 h-5 w-5" />
                  Sign in with Google
                </Button>
                <Button variant="outline" className="w-full rounded-xl hover:border-primary hover:shadow-[0_0_8px_hsl(var(--primary)/0.5)] transition-shadow">
                  <FacebookIcon className="mr-2 h-5 w-5 text-[#1877F2]" />
                  Sign in with Facebook
                </Button>
                <div className="flex items-center space-x-2">
                  <Separator className="flex-1" />
                  <span className="text-xs text-muted-foreground">OR</span>
                  <Separator className="flex-1" />
                </div>
                {isClient && <LoginForm />}
                <div className="text-center text-sm">
                  Don't have an account?{' '}
                  <Link href="/student-signup" className="underline">
                    Sign up
                  </Link>
                </div>
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
