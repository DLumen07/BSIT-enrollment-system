import type {Metadata} from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from "@/components/ui/toaster"
import { AdminProvider } from './admin/context/admin-context';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'BSIT Enrollment System',
  description: 'Enrollment management portal for the BSIT program.',
  icons: {
    icon: '/image/favicon.svg.png',
    shortcut: '/image/favicon.svg.png',
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
        <link rel="icon" type="image/png" href="/image/favicon.svg.png" />
        <link rel="shortcut icon" type="image/png" href="/image/favicon.svg.png" />
      </head>
      <body className={cn("font-body antialiased transition-colors duration-300")}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AdminProvider>
            {children}
          </AdminProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
