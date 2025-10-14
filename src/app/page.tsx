
'use client';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { User, UserCog } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

const AnimatedSubtitle = () => {
  const subtitles = ["Seamless, simple, and secure enrollment for the new academic year."];
  const [currentSubtitle, setCurrentSubtitle] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(100);

  useEffect(() => {
    const handleTyping = () => {
      const i = loopNum % subtitles.length;
      const fullTxt = subtitles[i];

      if (isDeleting) {
        setCurrentSubtitle(fullTxt.substring(0, currentSubtitle.length - 1));
        setTypingSpeed(50);
      } else {
        setCurrentSubtitle(fullTxt.substring(0, currentSubtitle.length + 1));
        setTypingSpeed(100);
      }

      if (!isDeleting && currentSubtitle === fullTxt) {
        setTimeout(() => setIsDeleting(true), 1500);
      } else if (isDeleting && currentSubtitle === '') {
        setIsDeleting(false);
        setLoopNum(loopNum + 1);
      }
    };

    const ticker = setTimeout(() => {
      handleTyping();
    }, typingSpeed);

    return () => clearTimeout(ticker);
  }, [currentSubtitle, isDeleting, loopNum, subtitles, typingSpeed]);

  return (
    <p className="text-sm text-muted-foreground max-w-md font-mono h-12">
      {currentSubtitle}
      <span className="animate-pulse">|</span>
    </p>
  );
};


export default function Home() {
  const schoolLogo = PlaceHolderImages.find(p => p.id === 'school-logo');

  return (
    <div className={cn(
        "relative flex flex-col min-h-screen bg-background",
        "bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,hsl(var(--primary)/0.3),hsl(var(--background)))]",
        "animate-background-pan"
    )}>
      <main className="flex-1 flex flex-col items-center justify-center text-center p-4">
        <div className="flex flex-col items-center space-y-4 border rounded-3xl p-8 md:p-12 bg-background/50 backdrop-blur-sm shadow-[0_8px_16px_-4px_hsl(var(--primary)/0.3),0_-8px_16px_-4px_hsl(var(--accent)/0.3)]">
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
          <AnimatedSubtitle />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-xs pt-4">
            <Button asChild size="lg" className="rounded-full">
              <Link href="/student-login">
                <User />
                Students
              </Link>
            </Button>
            <Button asChild variant="accent" size="lg" className="rounded-full">
              <Link href="/admin-login">
                <UserCog />
                Administrator
              </Link>
            </Button>
          </div>
        </div>
      </main>
      <footer className="py-6 w-full shrink-0 items-center px-4 md:px-6 border-t bg-background/50 backdrop-blur-sm">
        <p className="text-xs text-muted-foreground text-center">
          &copy; BUMBBLEBITTECH | All rights reserved.
        </p>
      </footer>
    </div>
  );
}
