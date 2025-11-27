
'use client';
import Link from 'next/link';
import {
  Home,
  LogOut,
  User,
  CalendarCheck2,
  GraduationCap,
  FileSignature,
  ClipboardList,
  Settings,
  ChevronRight,
} from 'lucide-react';
import Image from 'next/image';
import React, { Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { StudentProvider, useStudent } from '@/app/student/context/student-context';

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
import { useToast } from '@/hooks/use-toast';
import PageTransition from '@/components/page-transition';
import NotificationBell from '@/components/notification-bell';
import { useNotificationCenter } from '@/hooks/use-notification-center';
import type { NotificationSeed } from '@/types/notifications';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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

        if (segment === 'student' || segment === 'dashboard') {
             if (segment === 'student') return null;
             name = 'Dashboard';
             href = `/student/dashboard?${emailQuery}`;
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


function Header() {
    const { studentData } = useStudent();
    const searchParams = useSearchParams();
    const queryString = searchParams.toString();
    const notificationStorageKey = studentData?.academic.studentId
        ? `student-${studentData.academic.studentId}`
        : 'student-guest';

    const notificationSeeds = React.useMemo(() => {
        if (!studentData) {
            return [];
        }

        const seeds = [] as NotificationSeed[];
        const announcements = Array.isArray(studentData.announcements) ? studentData.announcements.slice(0, 4) : [];
        const documents = studentData.records?.documents ?? [];
        const pendingDocuments = documents.filter((doc) => doc.status !== 'Submitted').slice(0, 3);

        announcements.forEach((announcement) => {
            seeds.push({
                id: `student-announcement-${announcement.id}`,
                title: announcement.title,
                description: announcement.message,
                category: 'system',
                createdAt: announcement.createdAt,
                action: { label: 'View dashboard', href: `/student/dashboard?${queryString}` },
            });
        });

        pendingDocuments.forEach((doc) => {
            seeds.push({
                id: `student-document-${doc.id}`,
                title: `${doc.name} is ${doc.status.toLowerCase()}`,
                description: doc.status === 'Rejected' ? 'Please update and re-upload the document.' : 'Submit the document to proceed with enrollment.',
                category: 'records',
                createdAt: doc.updatedAt ?? doc.uploadedAt ?? new Date().toISOString(),
                action: { label: 'Review documents', href: `/student/dashboard/records?${queryString}` },
            });
        });

        if (studentData.academic.enrollmentStatus) {
            seeds.push({
                id: 'student-enrollment-status',
                title: `Enrollment status: ${studentData.academic.enrollmentStatus}`,
                description: studentData.academic.statusDisplay,
                category: 'enrollment',
                createdAt: studentData.academic.dateEnrolled ?? new Date().toISOString(),
                action: { label: 'Track enrollment', href: `/student/dashboard/enrollment?${queryString}` },
            });
        }

        if (studentData.schedule?.length) {
            seeds.push({
                id: 'student-schedule-reminder',
                title: 'Check today’s schedule',
                description: `You have ${studentData.schedule.length} scheduled subject${studentData.schedule.length === 1 ? '' : 's'}.`,
                category: 'schedule',
                createdAt: new Date().toISOString(),
                action: { label: 'Open schedule', href: `/student/dashboard/schedule?${queryString}` },
            });
        }

        return seeds;
    }, [queryString, studentData]);

    const {
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        dismissNotification,
    } = useNotificationCenter(notificationStorageKey, notificationSeeds);

    if (!studentData) return null;

    const avatarInitials = `${studentData.personal.firstName.charAt(0)}${studentData.personal.lastName.charAt(0)}`.toUpperCase() || 'ST';

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
                  <Button variant="ghost" size="icon" className="rounded-full p-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={studentData.personal.avatarUrl ?? undefined}
                        alt={`${studentData.personal.firstName} avatar`}
                        data-ai-hint="person avatar"
                      />
                      <AvatarFallback>{avatarInitials}</AvatarFallback>
                    </Avatar>
                    <span className="sr-only">Toggle user menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{studentData.personal.firstName}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={`/student/dashboard/settings?${queryString}`}>Settings</Link>
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

function StudentLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const schoolLogo = PlaceHolderImages.find(p => p.id === 'school-logo-sm');
  const { toast } = useToast();
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
              width={48}
              height={48}
                data-ai-hint={schoolLogo.imageHint}
                className="rounded-full"
                />
            )}
            <span className="font-semibold text-lg">Student Portal</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/student/dashboard'}>
                <Link href={`/student/dashboard?${emailQuery}`}>
                  <Home />
                  Dashboard
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/student/dashboard/profile'}>
                <Link href={`/student/dashboard/profile?${emailQuery}`}>
                  <User />
                  Profile
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith('/student/dashboard/enrollment')}>
                <Link href={`/student/dashboard/enrollment?${emailQuery}`}>
                  <FileSignature />
                  Enrollment
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/student/dashboard/schedule'}>
                <Link href={`/student/dashboard/schedule?${emailQuery}`}>
                  <CalendarCheck2 />
                  Schedule
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/student/dashboard/grades'}>
                <Link href={`/student/dashboard/grades?${emailQuery}`}>
                  <GraduationCap />
                  Grades
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/student/dashboard/records'}>
                <Link href={`/student/dashboard/records?${emailQuery}`}>
                  <ClipboardList />
                  Records
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/student/dashboard/settings'}>
                <Link href={`/student/dashboard/settings?${emailQuery}`}>
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

export default function StudentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
     <Suspense fallback={<div>Loading...</div>}>
      <StudentProvider>
        <StudentLayoutContent>{children}</StudentLayoutContent>
      </StudentProvider>
    </Suspense>
  );
}
