'use client';
import Link from 'next/link';
import {
  Home,
  LogOut,
  Settings,
  BookCopy,
  CalendarCheck2,
  ChevronRight,
  History,
  Code2, Terminal, Cpu, Database, Globe, Zap, Wifi, Lock, Monitor, Server
} from 'lucide-react';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import React, { Suspense, useState, useEffect } from 'react';
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
import { PlaceHolderImages } from '@/lib/placeholder-images';
import PageTransition from '@/components/page-transition';
import NotificationBell from '@/components/notification-bell';
import { useNotificationCenter } from '@/hooks/use-notification-center';
import type { NotificationSeed } from '@/types/notifications';
import { cn } from '@/lib/utils';

const Breadcrumb = () => {
    const pathname = usePathname();
    const segments = pathname.split('/').filter(Boolean);
    const searchParams = useSearchParams();
    const emailQuery = searchParams.toString();

    const formatSegment = (s: string) => {
        if (!s) return '';
        const decoded = decodeURIComponent(s);
        const str = decoded.replace(/-/g, ' ');
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    if (segments.length < 2) {
        return null;
    }

    const breadcrumbs = segments.map((segment, index) => {
        let path = `/${segments.slice(0, index + 1).join('/')}`;
        let name = formatSegment(segment);
        let href = `${path}?${emailQuery}`;

        if (segment === 'instructor' || segment === 'dashboard') {
             if (segment === 'instructor') return null;
             name = 'Dashboard';
             href = `/instructor/dashboard?${emailQuery}`;
        }

        return { name, href };
    }).filter(Boolean);

    return (
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            {breadcrumbs.map((crumb, index) => {
                if (!crumb) return null;
                const isLast = index === breadcrumbs.length - 1;
                return (
                    <React.Fragment key={`${crumb.href}-${crumb.name}`}>
                        {index > 0 && <ChevronRight className="h-4 w-4" />}
                        {isLast ? (
                            <span className="text-foreground">{crumb.name}</span>
                        ) : (
                            <Link href={crumb.href} className="hover:text-foreground">
                                {crumb.name}
                            </Link>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

const SidebarClock = () => {
    const [date, setDate] = React.useState(new Date());

    React.useEffect(() => {
        const timer = setInterval(() => {
            setDate(new Date());
        }, 1000);
        return () => {
            clearInterval(timer);
        };
    }, []);

    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const fullDate = date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

    return (
        <div className="px-2 group-data-[collapsible=icon]:hidden">
            <p className="text-3xl font-light tracking-tighter text-white">{time}</p>
            <p className="text-xs font-medium text-blue-200/50 uppercase tracking-widest">{fullDate}</p>
        </div>
    );
};







const weekdayOrder: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
};

function Header() {
    const { instructorData } = useInstructor();
    const searchParams = useSearchParams();
    const queryString = searchParams.toString();
    const notificationStorageKey = instructorData?.personal.id
        ? `instructor-${instructorData.personal.id}`
        : 'instructor-guest';

    const notificationSeeds = React.useMemo(() => {
        if (!instructorData) {
            return [];
        }

        const seeds = [] as NotificationSeed[];
        const classes = instructorData.classes ?? [];
        const schedule = instructorData.schedule ?? [];
        const grades = instructorData.grades ?? {};

        classes.slice(0, 3).forEach((classInfo) => {
            seeds.push({
                id: `instructor-class-${classInfo.block}-${classInfo.subjectCode}`,
                title: `${classInfo.subjectCode} - ${classInfo.block}`,
                description: `${classInfo.studentCount} students enrolled.`,
                category: 'schedule',
                createdAt: new Date().toISOString(),
                action: { label: 'View class', href: `/instructor/dashboard/classes?${queryString}` },
            });
        });

        const pendingGrades = Object.values(grades)
          .flat()
          .filter((grade) =>
            grade.grade === null ||
            grade.grade === 'INC' ||
            grade.terms?.final?.grade === null ||
            grade.terms?.final?.grade === 'INC',
          ).length;
        if (pendingGrades > 0) {
            seeds.push({
                id: 'instructor-grade-reminder',
                title: 'Grades pending submission',
                description: `${pendingGrades} record${pendingGrades === 1 ? ' is' : 's are'} awaiting final grades.`,
                category: 'grade',
                createdAt: new Date().toISOString(),
                action: { label: 'Open gradebook', href: `/instructor/dashboard/classes?${queryString}` },
            });
        }

        if (schedule.length > 0) {
            const nextSession = [...schedule].sort((a, b) => {
                const dayDiff = (weekdayOrder[a.day] ?? 7) - (weekdayOrder[b.day] ?? 7);
                if (dayDiff !== 0) return dayDiff;
                return a.startTime.localeCompare(b.startTime);
            })[0];

            if (nextSession) {
                seeds.push({
                    id: `instructor-next-session-${nextSession.id ?? nextSession.code}`,
                    title: `${nextSession.code} with ${nextSession.block}`,
                    description: `${nextSession.day} • ${nextSession.startTime}-${nextSession.endTime}`,
                    category: 'schedule',
                    createdAt: new Date().toISOString(),
                    action: { label: 'View schedule', href: `/instructor/dashboard/schedule?${queryString}` },
                });
            }
        }

        return seeds;
    }, [instructorData, queryString]);

    const {
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        dismissNotification,
    } = useNotificationCenter(notificationStorageKey, notificationSeeds);

    if (!instructorData) return null;

    // Generate initials from instructor name (e.g., "John Doe" -> "JD")
    const nameParts = (instructorData.personal.name ?? '').trim().split(/\s+/);
    const avatarInitials = nameParts.length >= 2
        ? `${nameParts[0].charAt(0)}${nameParts[nameParts.length - 1].charAt(0)}`.toUpperCase()
        : (nameParts[0]?.substring(0, 2) ?? 'IN').toUpperCase();

    return (
         <header className="flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
            <SidebarTrigger className="md:hidden"/>
            <div className="flex-1">
              <Breadcrumb />
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkAsRead={markAsRead}
                onMarkAllAsRead={markAllAsRead}
                onDismissNotification={dismissNotification}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full p-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={instructorData.personal.avatar || undefined}
                        alt={`${instructorData.personal.name} avatar`}
                        data-ai-hint="person avatar"
                      />
                      <AvatarFallback className="bg-blue-600 text-white text-sm font-medium">
                        {avatarInitials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="sr-only">Toggle user menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{instructorData.personal.name}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={`/instructor/dashboard/settings?${queryString}`}>Settings</Link>
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
  const isClassesHistoryPath = pathname === '/instructor/dashboard/classes/history';
  const isClassesPath = pathname.startsWith('/instructor/dashboard/classes') && !isClassesHistoryPath;

  return (
    <SidebarProvider>
      <Sidebar className="border-r border-white/10 bg-[#020617] text-white overflow-hidden" variant="sidebar">

        <SidebarHeader className="border-b border-white/10 bg-white/5 backdrop-blur-sm py-4 relative z-10">
          <div className="flex items-center gap-3 px-2">
            {schoolLogo && (
                <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full shadow-lg shadow-blue-500/20">
                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 via-orange-500 to-blue-600" />
                    <div className="absolute inset-[2px] rounded-full bg-slate-900">
                        <Image
                        src={schoolLogo.imageUrl}
                        alt={schoolLogo.description}
                        fill
                        className="object-cover rounded-full"
                        data-ai-hint={schoolLogo.imageHint}
                        />
                    </div>
                </div>
            )}
            <div className="flex flex-col">
                <span className="font-bold text-lg tracking-tight text-white">Instructor Portal</span>
                <span className="text-xs text-blue-200/70 font-medium">BSIT Enrollment</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-2 py-4 relative z-10">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/instructor/dashboard'} className="hover:bg-white/10 hover:text-white data-[active=true]:bg-blue-600 data-[active=true]:text-white data-[active=true]:shadow-md transition-all duration-200">
                <Link href={`/instructor/dashboard?${emailQuery}`}>
                  <Home className="h-4 w-4" />
                  <span className="font-medium">Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith('/instructor/dashboard/schedule')} className="hover:bg-white/10 hover:text-white data-[active=true]:bg-blue-600 data-[active=true]:text-white data-[active=true]:shadow-md transition-all duration-200">
                <Link href={`/instructor/dashboard/schedule?${emailQuery}`}>
                  <CalendarCheck2 className="h-4 w-4" />
                  <span className="font-medium">My Schedule</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isClassesPath} className="hover:bg-white/10 hover:text-white data-[active=true]:bg-blue-600 data-[active=true]:text-white data-[active=true]:shadow-md transition-all duration-200">
                <Link href={`/instructor/dashboard/classes?${emailQuery}`}>
                  <BookCopy className="h-4 w-4" />
                  <span className="font-medium">My Classes</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isClassesHistoryPath} className="hover:bg-white/10 hover:text-white data-[active=true]:bg-blue-600 data-[active=true]:text-white data-[active=true]:shadow-md transition-all duration-200">
                <Link href={`/instructor/dashboard/classes/history?${emailQuery}`}>
                  <History className="h-4 w-4" />
                  <span className="font-medium">Classes History</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/instructor/dashboard/settings'} className="hover:bg-white/10 hover:text-white data-[active=true]:bg-blue-600 data-[active=true]:text-white data-[active=true]:shadow-md transition-all duration-200">
                <Link href={`/instructor/dashboard/settings?${emailQuery}`}>
                  <Settings className="h-4 w-4" />
                  <span className="font-medium">Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="border-t border-white/5 p-4 relative z-10">
          <SidebarMenu>
            <SidebarMenuItem>
                <div className="mb-6 mt-2">
                    <SidebarClock />
                </div>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="text-white/60 hover:bg-white/5 hover:text-white transition-all duration-200">
                <Link href="/">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <Header />
        <PageTransition>
          {children}
        </PageTransition>
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
