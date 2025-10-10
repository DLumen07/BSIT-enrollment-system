
'use client';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { User, UserCog } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function Home() {
  const schoolLogo = PlaceHolderImages.find(p => p.id === 'school-logo');

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-1 flex flex-col items-center justify-center text-center p-4">
        <div className="flex flex-col items-center space-y-6 border rounded-lg p-8 md:p-12 animate-glow">
          {schoolLogo && (
            <Image
              src={schoolLogo.imageUrl}
              alt={schoolLogo.description}
              width={250}
              height={250}
              data-ai-hint={schoolLogo.imageHint}
              className="rounded-full"
            />
          )}
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            BSIT Enrollment System
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-xs">
            <Button asChild size="lg">
              <Link href="/student-login">
                <User />
                Students
              </Link>
            </Button>
            <Button asChild variant="accent" size="lg">
              <Link href="/admin-login">
                <UserCog />
                Administrator
              </Link>
            </Button>
          </div>
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
