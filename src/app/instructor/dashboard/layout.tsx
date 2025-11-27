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
import PageTransition from '@/components/page-transition';
import NotificationBell from '@/components/notification-bell';
import { useNotificationCenter } from '@/hooks/use-notification-center';
import type { NotificationSeed } from '@/types/notifications';

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

    return (
         <header className="flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
            <SidebarTrigger className="md:hidden"/>
            <div className="flex-1">
              <Breadcrumb />
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <NotificationBell
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkAsRead={markAsRead}
                onMarkAllAsRead={markAllAsRead}
                onDismissNotification={dismissNotification}
              />
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
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            {schoolLogo && (
                <Image
                src={schoolLogo.imageUrl}
                alt={schoolLogo.description}
                width={48}
                height={48}
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
              <SidebarMenuButton asChild isActive={isClassesPath}>
                <Link href={`/instructor/dashboard/classes?${emailQuery}`}>
                  <BookCopy />
                  My Classes
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isClassesHistoryPath}>
                <Link href={`/instructor/dashboard/classes/history?${emailQuery}`}>
                  <History />
                  Classes History
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
