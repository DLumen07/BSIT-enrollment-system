import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-1 flex flex-col items-center justify-center text-center p-4">
        <div className="flex flex-col items-center space-y-6 border rounded-lg shadow-lg p-8 md:p-12">
          <Image
            src="https://picsum.photos/seed/school-logo/150/150"
            alt="School Logo"
            width={150}
            height={150}
            data-ai-hint="school logo"
            className="rounded-full"
          />
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            BSIT Enrollment System
          </h1>
          <div className="flex gap-4">
            <Button asChild size="lg">
              <Link href="/student-login">Students</Link>
            </Button>
            <Button asChild variant="destructive" size="lg">
              <Link href="/admin-login">Administrator</Link>
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
