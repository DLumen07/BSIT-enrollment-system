

'use client';
import Link from 'next/link';
import {
  Home,
  LogOut,
  Users2,
  ClipboardList,
  BarChart3,
  ChevronRight,
  Search,
  ChevronDown,
  FileSignature,
  LayoutGrid,
  BookCopy,
  Settings,
  Shield,
  BookUser,
  Users,
  Clock,
} from 'lucide-react';
import Image from 'next/image';
import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
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
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAdmin } from '../context/admin-context';
import { useToast } from '@/hooks/use-toast';
import PageTransition from '@/components/page-transition';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import NotificationBell from '@/components/notification-bell';
import { useNotificationCenter } from '@/hooks/use-notification-center';
import type { NotificationSeed } from '@/types/notifications';

const Breadcrumb = () => {
    const pathname = usePathname();
    const { adminData } = useAdmin();
    const segments = pathname.split('/').filter(Boolean);

    const formatSegment = (s: string) => {
        if (!s) return '';
        const decoded = decodeURIComponent(s);
        const str = decoded.replace(/-/g, ' ');
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    if (segments.length < 2) {
        return null;
    }

    const buildBreadcrumbs = () => {
        let path = '';
        const breadcrumbs = segments.map((segment, index) => {
            path += `/${segment}`;
            let name = formatSegment(segment);
            let href = path;

            // Handle special cases based on path structure
            if (segment === 'admin' || segment === 'dashboard') {
                 if (segment === 'admin') return null; // Don't show 'Admin'
                 name = 'Dashboard';
                 href = '/admin/dashboard';
            } else if (segments[index-1] === 'manage-blocks' && index === 3) {
                 const block = adminData.blocks.find(b => b.year === decodeURIComponent(segment));
                 if (block) name = formatSegment(block.year);
            } else if (segments[index-2] === 'instructors' && index === 4) {
                 const instructor = adminData.instructors.find(i => i.id.toString() === decodeURIComponent(segment));
                 if (instructor) name = instructor.name;
            } else if (segments[index-1] === 'schedule' && index === 3) {
                 const block = adminData.blocks.find(b => b.name === decodeURIComponent(segment));
                 if (block) name = `Schedule: ${block.name}`;
            }

            return { name, href };
        }).filter(Boolean);
        
        // Custom logic for schedule pages to insert parent links
        const schedulePathIndex = breadcrumbs.findIndex(crumb => crumb?.name.startsWith('Schedule:'));
        if (schedulePathIndex > -1) {
            const blockNameSegment = segments[3];
            const block = adminData.blocks.find(b => b.name === decodeURIComponent(blockNameSegment));
            if (block) {
                breadcrumbs.splice(schedulePathIndex, 0,
                    { name: 'Manage Blocks', href: '/admin/dashboard/manage-blocks' },
                    { name: formatSegment(block.year), href: `/admin/dashboard/manage-blocks/${block.year}` }
                );
            }
        }
        
        // Custom logic for instructor schedule pages
        const instructorPathIndex = breadcrumbs.findIndex(crumb => segments.includes('instructors') && crumb?.href.includes(segments[3]));
        if (instructorPathIndex > -1 && segments.length > 4) {
             breadcrumbs.splice(instructorPathIndex, 0,
                { name: 'Instructors', href: '/admin/dashboard/instructors' }
            );
        }

        const uniqueCrumbs: Array<{ name: string; href: string }> = [];
        const seen = new Set<string>();

        for (const crumb of breadcrumbs) {
          if (!crumb) {
            continue;
          }
          const key = `${crumb.href}::${crumb.name}`;
          if (seen.has(key)) {
            continue;
          }
          seen.add(key);
          uniqueCrumbs.push(crumb);
        }

        return uniqueCrumbs;
    };
    
    const breadcrumbs = buildBreadcrumbs();

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
        <div className="text-center px-2 group-data-[collapsible=icon]:hidden">
            <p className="text-2xl font-bold font-mono text-sidebar-foreground">{time}</p>
            <p className="text-xs text-sidebar-foreground/80">{fullDate}</p>
        </div>
    );
};


export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const schoolLogo = PlaceHolderImages.find(p => p.id === 'school-logo-sm');
  const isEnrollmentPath = pathname.startsWith('/admin/dashboard/manage-');
  const [isEnrollmentOpen, setIsEnrollmentOpen] = React.useState(isEnrollmentPath);

  React.useEffect(() => {
    setIsEnrollmentOpen(pathname.startsWith('/admin/dashboard/manage-'));
  }, [pathname]);

  const { adminData, setAdminData } = useAdmin();
  const { currentUser } = adminData;

  const pendingApplications = adminData.pendingApplications ?? [];
  const enrollmentSchedule = adminData.phasedEnrollmentSchedule ?? {};
  const blocks = adminData.blocks ?? [];

  const notificationSeeds = React.useMemo<NotificationSeed[]>(() => {
    const seeds: NotificationSeed[] = [];

    const sortedPending = [...pendingApplications]
      .sort((a, b) => {
        const aDate = Date.parse(a.submittedAt ?? '');
        const bDate = Date.parse(b.submittedAt ?? '');
        return (isNaN(bDate) ? 0 : bDate) - (isNaN(aDate) ? 0 : aDate);
      })
      .slice(0, 3);

    sortedPending.forEach((application) => {
      seeds.push({
        id: `pending-application-${application.id}`,
        title: 'Application ready for review',
        description: `${application.name} submitted a ${application.status.toLowerCase()} application (${application.course}).`,
        category: 'application',
        createdAt: application.submittedAt ?? new Date().toISOString(),
        action: { label: 'Review queue', href: '/admin/dashboard/manage-applications' },
      });
    });

    if (pendingApplications.length > sortedPending.length) {
      seeds.push({
        id: 'pending-application-summary',
        title: 'Enrollment queue growing',
        description: `${pendingApplications.length} total applications are awaiting action.`,
        category: 'application',
        createdAt: new Date().toISOString(),
        action: { label: 'Open applications', href: '/admin/dashboard/manage-applications' },
      });
    }

    Object.entries(enrollmentSchedule).forEach(([yearLevel, schedule]) => {
      const eventDate = schedule?.date instanceof Date ? schedule.date : schedule?.date ? new Date(schedule.date) : null;
      if (!eventDate) {
        return;
      }
      const now = Date.now();
      if (eventDate.getTime() + 72 * 60 * 60 * 1000 < now) {
        return;
      }
      const formattedYear = yearLevel.replace(/-/g, ' ');
      seeds.push({
        id: `enrollment-window-${yearLevel}`,
        title: `${formattedYear} enrollment window`,
        description: `Runs ${eventDate.toLocaleDateString()} • ${schedule?.startTime ?? '08:00'}-${schedule?.endTime ?? '17:00'}.`,
        category: 'enrollment',
        createdAt: eventDate.toISOString(),
        action: { label: 'View schedule', href: '/admin/dashboard' },
      });
    });

    blocks
      .filter((block) => block.capacity - block.enrolled <= 5)
      .slice(0, 3)
      .forEach((block) => {
        const remaining = Math.max(0, block.capacity - block.enrolled);
        seeds.push({
          id: `block-capacity-${block.id}`,
          title: `${block.name} is almost full`,
          description: `${remaining} slot${remaining === 1 ? '' : 's'} remaining for ${block.course}.`,
          category: 'records',
          createdAt: new Date().toISOString(),
          action: { label: 'Manage blocks', href: '/admin/dashboard/manage-blocks' },
        });
      });

    return seeds;
  }, [pendingApplications, enrollmentSchedule, blocks]);

  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const notificationStorageKey = currentUser ? `admin-${currentUser.id}` : 'admin-guest';
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
  } = useNotificationCenter(notificationStorageKey, notificationSeeds);

  const isModerator = currentUser?.role === 'Moderator';

  const handleLogout = () => {
    setIsLoggingOut(true);
    sessionStorage.removeItem('currentUser');
    setAdminData(prev => ({ ...prev, currentUser: null }));
    router.push('/');
  };

  React.useEffect(() => {
    if (!currentUser) {
      if (isLoggingOut) {
        return;
      }
      router.push('/admin-login');
    }
  }, [currentUser, isLoggingOut, router]);

  if (!currentUser) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <LoadingSpinner className="h-8 w-8" />
        </div>
    );
  }

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
              <span className="font-semibold text-lg">BSIT Enrollment</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/admin/dashboard'}>
                  <Link href="/admin/dashboard">
                    <Home />
                    Dashboard
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem asChild>
                  <Collapsible open={isEnrollmentOpen} onOpenChange={setIsEnrollmentOpen}>
                      <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                              className="justify-between"
                              isActive={isEnrollmentPath}
                          >
                              <div className="flex items-center gap-2">
                                  <ClipboardList className="h-4 w-4" />
                                  Manage Enrollment
                              </div>
                              <ChevronDown className="h-4 w-4 data-[state=open]:rotate-180" />
                          </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                          <SidebarMenuSub>
                              <SidebarMenuSubItem>
                                  <SidebarMenuSubButton asChild isActive={pathname === '/admin/dashboard/manage-applications'}>
                                      <Link href="/admin/dashboard/manage-applications">
                                          <FileSignature />
                                          <span>Manage Applications</span>
                                      </Link>
                                  </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                              {!isModerator && (
                                <>
                                  <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={pathname.startsWith('/admin/dashboard/manage-blocks') || pathname.startsWith('/admin/dashboard/schedule')}>
                                      <Link href="/admin/dashboard/manage-blocks">
                                        <LayoutGrid />
                                        <span>Manage Blocks</span>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                  <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={pathname === '/admin/dashboard/manage-subjects'}>
                                      <Link href="/admin/dashboard/manage-subjects">
                                        <BookCopy />
                                        <span>Manage Subjects</span>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                </>
                              )}
                              {isModerator && (
                                <>
                                  <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={pathname === '/admin/dashboard/view-blocks'}>
                                      <Link href="/admin/dashboard/view-blocks">
                                        <LayoutGrid />
                                        <span>View Blocks &amp; Schedules</span>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                  <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={pathname === '/admin/dashboard/view-subjects'}>
                                      <Link href="/admin/dashboard/view-subjects">
                                        <BookCopy />
                                        <span>View Subjects</span>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                </>
                              )}
                          </SidebarMenuSub>
                      </CollapsibleContent>
                  </Collapsible>
              </SidebarMenuItem>
              <SidebarMenuItem>
                           <SidebarMenuButton asChild isActive={pathname === '/admin/dashboard/students'}>
                      <Link href="/admin/dashboard/students">
                          <Users2 />
                          Students
                      </Link>
                  </SidebarMenuButton>
              </SidebarMenuItem>
              {!isModerator && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith('/admin/dashboard/instructors')}>
                    <Link href="/admin/dashboard/instructors">
                      <BookUser />
                      Instructors
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {!isModerator && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === '/admin/dashboard/users'}>
                    <Link href="/admin/dashboard/users">
                      <Users />
                      Users
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {currentUser.role === 'Super Admin' && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === '/admin/dashboard/administrators'}>
                    <Link href="/admin/dashboard/administrators">
                      <Shield />
                      Administrators
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {isModerator ? (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === '/admin/dashboard/view-reports'}>
                    <Link href="/admin/dashboard/view-reports">
                      <BarChart3 />
                      Reports (Read-Only)
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === '/admin/dashboard/reports'}>
                    <Link href="/admin/dashboard/reports">
                      <BarChart3 />
                      Reports
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
               <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/admin/dashboard/settings'}>
                  <Link href="/admin/dashboard/settings">
                    <Settings />
                    Settings
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            <SidebarSeparator />
            <SidebarMenu>
                <SidebarMenuItem>
                     <SidebarClock />
                </SidebarMenuItem>
                <SidebarSeparator />
                <SidebarMenuItem>
                    <SidebarMenuButton onClick={handleLogout}>
                    <LogOut />
                    Logout
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
            <SidebarTrigger />
            <div className="flex-1">
               <Breadcrumb />
            </div>
             {pathname === '/admin/dashboard' && (
               <div className="relative hidden md:block">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search..."
                    className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px] rounded-full"
                  />
                </div>
              )}
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
                    {typeof currentUser.avatar === 'string' && currentUser.avatar.trim() !== '' ? (
                      <Image
                        src={currentUser.avatar}
                        width={32}
                        height={32}
                        alt={currentUser.name}
                        className="rounded-full"
                        data-ai-hint="person avatar"
                      />
                    ) : (
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                        {currentUser.name?.charAt(0).toUpperCase() ?? 'A'}
                      </span>
                    )}
                    <span className="sr-only">Toggle user menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{currentUser.name}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/admin/dashboard/settings">Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => toast({ title: 'Contact Support', description: 'For any support questions, please email us at support@enrollease.com' })}>Support</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <PageTransition>
            {children}
          </PageTransition>
        </SidebarInset>
      </SidebarProvider>
  );
}
