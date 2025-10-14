
'use client';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { User, UserCog } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

const AnimatedSubtitle = () => {
  const subtitles = [
    {
      line1: "Seamless, simple, and secure enrollment",
      line2: "for the new academic year."
    }
  ];
  const [currentLine1, setCurrentLine1] = useState('');
  const [currentLine2, setCurrentLine2] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(100);

  useEffect(() => {
    const handleTyping = () => {
      const i = loopNum % subtitles.length;
      const { line1: fullLine1, line2: fullLine2 } = subtitles[i];
      const isTypingLine1 = currentLine1.length < fullLine1.length;

      if (isDeleting) {
        if (currentLine2.length > 0) {
          setCurrentLine2(current => current.substring(0, current.length - 1));
          setTypingSpeed(50);
        } else if (currentLine1.length > 0) {
          setCurrentLine1(current => current.substring(0, current.length - 1));
          setTypingSpeed(50);
        } else {
          setIsDeleting(false);
          setLoopNum(loopNum + 1);
        }
      } else {
        if (isTypingLine1) {
          setCurrentLine1(fullLine1.substring(0, currentLine1.length + 1));
          setTypingSpeed(100);
        } else if (currentLine2.length < fullLine2.length) {
          setCurrentLine2(fullLine2.substring(0, currentLine2.length + 1));
          setTypingSpeed(100);
        } else {
          setTimeout(() => setIsDeleting(true), 2000);
        }
      }
    };

    const ticker = setTimeout(() => {
      handleTyping();
    }, typingSpeed);

    return () => clearTimeout(ticker);
  }, [currentLine1, currentLine2, isDeleting, loopNum, subtitles, typingSpeed]);

  const showLine1Cursor = currentLine1.length < subtitles[0].line1.length && !isDeleting && currentLine2.length === 0;
  const showLine2Cursor = currentLine2.length < subtitles[0].line2.length && !isDeleting && currentLine1.length === subtitles[0].line1.length;
  
  const showDeletingCursor1 = isDeleting && currentLine2.length === 0 && currentLine1.length > 0;
  const showDeletingCursor2 = isDeleting && currentLine2.length > 0;


  return (
    <p className="text-sm text-muted-foreground font-mono h-12 flex flex-col items-center">
      <span>
        {currentLine1}
        {(showLine1Cursor || showDeletingCursor1) && <span className="animate-pulse">|</span>}
      </span>
      <span>
        {currentLine2}
        {(showLine2Cursor || showDeletingCursor2) && <span className="animate-pulse">|</span>}
      </span>
    </p>
  );
};


export default function Home() {
  const schoolLogo = PlaceHolderImages.find(p => p.id === 'school-logo');

  return (
    <div className={cn(
        "relative flex flex-col min-h-screen bg-background",
        "bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,hsl(var(--primary)/0.3),hsl(var(--background)))]",
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
             <Button asChild variant="outline" size="lg" className="rounded-full border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
              <Link href="/student-login">
                <User />
                Students
              </Link>
            </Button>
             <Button asChild variant="outline" size="lg" className="rounded-full border-accent text-accent hover:bg-accent hover:text-accent-foreground transition-colors">
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
