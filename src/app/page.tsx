import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-primary">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter text-primary-foreground sm:text-5xl xl:text-6xl/none">
                    BSIT Enrollment System
                  </h1>
                  <p className="max-w-[600px] text-primary-foreground/80 md:text-xl">
                    Streamline your enrollment process with our modern and
                    intuitive system.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button asChild size="lg">
                    <Link href="#">Enroll Now</Link>
                  </Button>
                  <Button asChild variant="secondary" size="lg">
                    <Link href="#">Learn More</Link>
                  </Button>
                </div>
              </div>
              <Image
                src="https://picsum.photos/seed/cs-students/600/400"
                alt="Hero"
                width={600}
                height={400}
                data-ai-hint="computer science students"
                className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last"
              />
            </div>
          </div>
        </section>
      </main>
      <footer className="py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground text-center">
          &copy; 2024 BSIT Enrollment System. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
