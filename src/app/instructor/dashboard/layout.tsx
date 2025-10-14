
'use client';
import Link from 'next/link';
import {
  Bell,
  Home,
  LogOut,
  Settings,
  BookCopy,
  CalendarCheck2,
} from 'lucide-react';
import Image from 'next/image';
import React, { Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { InstructorProvider, useInstructor } from '@/app/instructor/context/instructor-context';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/theme-toggle';
import { PlaceHolderImages } from '@/lib/placeholder-images';

function Header() {
    const { instructorData } = useInstructor();
    if (!instructorData) return null;

    return (
         <header className="flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
            <SidebarTrigger className="md:hidden"/>
            <div className="flex-1">
              <h1 className="text-lg font-semibold">
                  Instructor Portal
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <Button variant="ghost" size="icon" className="rounded-full">
                <Bell className="h-5 w-5" />
                <span className="sr-only">Toggle notifications</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Image
                      src={instructorData.personal.avatar}
                      width={32}
                      height={32}
                      alt="Instructor Avatar"
                      className="rounded-full"
                      data-ai-hint="person avatar"
                    />
                    <span className="sr-only">Toggle user menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={`/instructor/dashboard/settings?${useSearchParams().toString()}`}>Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>Support</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/">Logout</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
    )
}

function InstructorLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const schoolLogo = PlaceHolderImages.find(p => p.id === 'school-logo-sm');
  const emailQuery = searchParams.toString();

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            {schoolLogo && (
                <Image
                src={schoolLogo.imageUrl}
                alt={schoolLogo.description}
                width={60}
                height={60}
                data-ai-hint={schoolLogo.imageHint}
                className="rounded-full"
                />
            )}
            <span className="font-semibold text-lg">Instructor Portal</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/instructor/dashboard'}>
                <Link href={`/instructor/dashboard?${emailQuery}`}>
                  <Home />
                  Dashboard
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith('/instructor/dashboard/schedule')}>
                <Link href={`/instructor/dashboard/schedule?${emailQuery}`}>
                  <CalendarCheck2 />
                  My Schedule
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith('/instructor/dashboard/classes')}>
                <Link href={`/instructor/dashboard/classes?${emailQuery}`}>
                  <BookCopy />
                  My Classes
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/instructor/dashboard/settings'}>
                <Link href={`/instructor/dashboard/settings?${emailQuery}`}>
                  <Settings />
                  Settings
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/">
                  <LogOut />
                  Logout
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <Header />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function InstructorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <InstructorProvider>
        <InstructorLayoutContent>{children}</InstructorLayoutContent>
      </InstructorProvider>
    </Suspense>
  );
}
