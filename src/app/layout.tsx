import type {Metadata} from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from "@/components/ui/toaster"
import { AdminProvider } from './admin/context/admin-context';
import { QueryProvider } from '@/components/providers/query-provider';
import { cn } from '@/lib/utils';
import { ScrollReveal } from '@/components/ui/scroll-reveal';

export const metadata: Metadata = {
  title: 'BSIT Enrollment System',
  description: 'Enrollment management portal for the BSIT program.',
  icons: {
    icon: '/image/system-logo.svg',
    shortcut: '/image/system-logo.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" type="image/svg+xml" href="/image/system-logo.svg" />
        <link rel="shortcut icon" type="image/svg+xml" href="/image/system-logo.svg" />
      </head>
      <body className={cn("font-body antialiased transition-colors duration-300")}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          forcedTheme="dark"
          disableTransitionOnChange
        >
          <QueryProvider>
            <AdminProvider>
              <ScrollReveal className="min-h-screen">
                {children}
              </ScrollReveal>
            </AdminProvider>
          </QueryProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
