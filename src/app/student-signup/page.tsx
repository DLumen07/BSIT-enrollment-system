
'use client';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function StudentSignupPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md relative">
           <Button asChild variant="ghost" size="icon" className="absolute top-4 left-4">
            <Link href="/student-login">
              <ArrowLeft />
              <span className="sr-only">Back to Login</span>
            </Link>
          </Button>
          <Card className="shadow-[0_8px_16px_-4px_hsl(var(--primary)/0.3),0_-8px_16px_-4px_hsl(var(--accent)/0.3)]">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Create Student Account</CardTitle>
              <CardDescription>
                Fill out the form below to create your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div className="space-y-2 text-left">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Juan Dela Cruz"
                    required
                  />
                </div>
                <div className="space-y-2 text-left">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="student@example.com"
                    required
                  />
                </div>
                <div className="space-y-2 text-left">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" required />
                </div>
                <div className="space-y-2 text-left">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input id="confirmPassword" type="password" required />
                </div>
                <Button type="submit" className="w-full">
                  Create Account
                </Button>
              </form>
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
