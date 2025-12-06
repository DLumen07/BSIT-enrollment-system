
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
import { Suspense, Fragment, useMemo, useCallback, useState, type ReactNode } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { StudentProvider, useStudent } from '@/app/student/context/student-context';
import Loading from '@/app/loading';

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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const Breadcrumb = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const querySuffix = queryString ? `?${queryString}` : '';
  const segments = pathname.split('/').filter(Boolean);

  const formatSegment = (segment: string) => {
    const decoded = decodeURIComponent(segment);
    const spaced = decoded.replace(/-/g, ' ');
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  };

  if (segments.length < 2) {
    return null;
  }

  const crumbs = segments
    .map((segment, index) => {
      if (segment === 'student') {
        return null;
      }

      const path = `/${segments.slice(0, index + 1).join('/')}`;
      const name = segment === 'dashboard' ? 'Dashboard' : formatSegment(segment);
      const href = segment === 'dashboard'
        ? `/student/dashboard${querySuffix}`
        : `${path}${querySuffix}`;

      return { name, href };
    })
    .filter(Boolean) as Array<{ name: string; href: string }>;

  if (!crumbs.length) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <Fragment key={`${crumb.href}-${crumb.name}`}>
            {index > 0 && <ChevronRight className="h-4 w-4" />}
            {isLast ? (
              <span className="text-foreground">{crumb.name}</span>
            ) : (
              <Link href={crumb.href} className="hover:text-foreground">
                {crumb.name}
              </Link>
            )}
          </Fragment>
        );
      })}
    </div>
  );
};

type HeaderProps = {
  querySuffix: string;
  onLogout: () => void;
};

function Header({ querySuffix, onLogout }: HeaderProps) {
  const { studentData } = useStudent();
  const notificationStorageKey = studentData?.academic.studentId
    ? `student-${studentData.academic.studentId}`
    : 'student-guest';

  const notificationSeeds = useMemo(() => {
    if (!studentData) {
      return [];
    }

    const seeds: NotificationSeed[] = [];
    const announcements = Array.isArray(studentData.announcements)
      ? studentData.announcements.slice(0, 4)
      : [];
    const documents = studentData.records?.documents ?? [];
    const pendingDocuments = documents
      .filter((doc) => doc.status !== 'Submitted')
      .slice(0, 3);

    announcements.forEach((announcement) => {
      seeds.push({
        id: `student-announcement-${announcement.id}`,
        title: announcement.title,
        description: announcement.message,
        category: 'system',
        createdAt: announcement.createdAt,
        action: { label: 'View dashboard', href: `/student/dashboard${querySuffix}` },
      });
    });

    pendingDocuments.forEach((doc) => {
      seeds.push({
        id: `student-document-${doc.id}`,
        title: `${doc.name} is ${doc.status.toLowerCase()}`,
        description:
          doc.status === 'Rejected'
            ? 'Please update and re-upload the document.'
            : 'Submit the document to proceed with enrollment.',
        category: 'records',
        createdAt: doc.updatedAt ?? doc.uploadedAt ?? new Date().toISOString(),
        action: { label: 'Review documents', href: `/student/dashboard/records${querySuffix}` },
      });
    });

    if (studentData.academic.enrollmentStatus) {
      seeds.push({
        id: 'student-enrollment-status',
        title: `Enrollment status: ${studentData.academic.enrollmentStatus}`,
        description: studentData.academic.statusDisplay,
        category: 'enrollment',
        createdAt: studentData.academic.dateEnrolled ?? new Date().toISOString(),
        action: { label: 'Track enrollment', href: `/student/dashboard/enrollment${querySuffix}` },
      });
    }

    if (studentData.schedule?.length) {
      seeds.push({
        id: 'student-schedule-reminder',
        title: 'Check today’s schedule',
        description: `You have ${studentData.schedule.length} scheduled subject${
          studentData.schedule.length === 1 ? '' : 's'
        }.`,
        category: 'schedule',
        createdAt: new Date().toISOString(),
        action: { label: 'Open schedule', href: `/student/dashboard/schedule${querySuffix}` },
      });
    }

    return seeds;
  }, [querySuffix, studentData]);

  const { notifications, unreadCount, markAsRead, markAllAsRead, dismissNotification } =
    useNotificationCenter(notificationStorageKey, notificationSeeds);

  if (!studentData) return null;

  const avatarInitials = `${studentData.personal.firstName.charAt(0)}${
    studentData.personal.lastName.charAt(0)
  }`.toUpperCase() || 'ST';

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
      <SidebarTrigger className="md:hidden" />
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
              <Link href={`/student/dashboard/settings${querySuffix}`}>Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem>Support</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                onLogout();
              }}
            >
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function StudentLayoutContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const schoolLogo = PlaceHolderImages.find((p) => p.id === 'school-logo-sm');
  const queryString = searchParams.toString();
  const querySuffix = queryString ? `?${queryString}` : '';
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    // Show loading screen for 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('bsit_student_email');
    }
    router.replace('/student-login');
  }, [router]);

  return (
    <SidebarProvider>
      {isLoggingOut && (
        <div className="fixed inset-0 z-[100]">
            <Loading message="LOGGING OUT" />
        </div>
      )}
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
              <span className="font-bold text-lg tracking-tight text-white">BSIT Enrollment</span>
              <span className="text-xs text-blue-200/70 font-medium">Student Portal</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="relative z-10 px-2 py-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === '/student/dashboard'}
                className="hover:bg-white/10 hover:text-white data-[active=true]:bg-blue-600 data-[active=true]:text-white data-[active=true]:shadow-md transition-all duration-200"
              >
                <Link href={`/student/dashboard${querySuffix}`}>
                  <Home />
                  <span className="font-medium">Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === '/student/dashboard/profile'}
                className="hover:bg-white/10 hover:text-white data-[active=true]:bg-blue-600 data-[active=true]:text-white data-[active=true]:shadow-md transition-all duration-200"
              >
                <Link href={`/student/dashboard/profile${querySuffix}`}>
                  <User />
                  <span className="font-medium">Profile</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith('/student/dashboard/enrollment')}
                className="hover:bg-white/10 hover:text-white data-[active=true]:bg-blue-600 data-[active=true]:text-white data-[active=true]:shadow-md transition-all duration-200"
              >
                <Link href={`/student/dashboard/enrollment${querySuffix}`}>
                  <FileSignature />
                  <span className="font-medium">Enrollment</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === '/student/dashboard/schedule'}
                className="hover:bg-white/10 hover:text-white data-[active=true]:bg-blue-600 data-[active=true]:text-white data-[active=true]:shadow-md transition-all duration-200"
              >
                <Link href={`/student/dashboard/schedule${querySuffix}`}>
                  <CalendarCheck2 />
                  <span className="font-medium">Schedule</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === '/student/dashboard/grades'}
                className="hover:bg-white/10 hover:text-white data-[active=true]:bg-blue-600 data-[active=true]:text-white data-[active=true]:shadow-md transition-all duration-200"
              >
                <Link href={`/student/dashboard/grades${querySuffix}`}>
                  <GraduationCap />
                  <span className="font-medium">Grades</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === '/student/dashboard/records'}
                className="hover:bg-white/10 hover:text-white data-[active=true]:bg-blue-600 data-[active=true]:text-white data-[active=true]:shadow-md transition-all duration-200"
              >
                <Link href={`/student/dashboard/records${querySuffix}`}>
                  <ClipboardList />
                  <span className="font-medium">Records</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === '/student/dashboard/settings'}
                className="hover:bg-white/10 hover:text-white data-[active=true]:bg-blue-600 data-[active=true]:text-white data-[active=true]:shadow-md transition-all duration-200"
              >
                <Link href={`/student/dashboard/settings${querySuffix}`}>
                  <Settings />
                  <span className="font-medium">Settings</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="relative z-10">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="hover:bg-white/10 hover:text-white transition-all duration-200"
                onClick={handleLogout}
              >
                <LogOut />
                <span className="font-medium">Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <Header querySuffix={querySuffix} onLogout={handleLogout} />
        <PageTransition>{children}</PageTransition>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function StudentDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StudentProvider>
        <StudentLayoutContent>{children}</StudentLayoutContent>
      </StudentProvider>
    </Suspense>
  );
}
