

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
  Monitor, Database, Zap, Cpu, Server, Globe, Code2, Terminal, Wifi, Lock
} from 'lucide-react';
import Image from 'next/image';
import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { motion } from 'framer-motion';
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
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAdmin } from '../context/admin-context';
import { useToast } from '@/hooks/use-toast';
import PageTransition from '@/components/page-transition';
import Loading from '@/app/loading';
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
        <div className="px-2 group-data-[collapsible=icon]:hidden">
            <p className="text-3xl font-light tracking-tighter text-white">{time}</p>
            <p className="text-xs font-medium text-blue-200/50 uppercase tracking-widest">{fullDate}</p>
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

  const handleLogout = async () => {
    setIsLoggingOut(true);
    // Show loading screen for 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));
    
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
    return <Loading />;
  }

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
                <span className="text-xs text-blue-200/70 font-medium">Admin Portal</span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="px-2 py-4 relative z-10">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/admin/dashboard'} className="hover:bg-white/10 hover:text-white data-[active=true]:bg-blue-600 data-[active=true]:text-white data-[active=true]:shadow-md transition-all duration-200">
                  <Link href="/admin/dashboard">
                    <Home className="h-4 w-4" />
                    <span className="font-medium">Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem asChild>
                  <Collapsible open={isEnrollmentOpen} onOpenChange={setIsEnrollmentOpen}>
                      <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                              className="justify-between hover:bg-white/10 hover:text-white data-[active=true]:bg-white/10 data-[active=true]:text-white transition-all duration-200"
                              isActive={isEnrollmentPath}
                          >
                              <div className="flex items-center gap-2">
                                  <ClipboardList className="h-4 w-4" />
                                  <span className="font-medium">Manage Enrollment</span>
                              </div>
                              <ChevronDown className="h-4 w-4 text-white/50 data-[state=open]:rotate-180 transition-transform duration-200" />
                          </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pl-4 space-y-1 pt-1">
                          <SidebarMenuSub>
                              <SidebarMenuSubItem>
                                  <SidebarMenuSubButton asChild isActive={pathname === '/admin/dashboard/manage-applications'} className="hover:bg-white/10 hover:text-white data-[active=true]:text-blue-300 data-[active=true]:font-semibold transition-colors">
                                      <Link href="/admin/dashboard/manage-applications">
                                          <FileSignature className="h-4 w-4" />
                                          <span>Applications</span>
                                      </Link>
                                  </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                              {!isModerator && (
                                <>
                                  <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={pathname.startsWith('/admin/dashboard/manage-blocks') || pathname.startsWith('/admin/dashboard/schedule')} className="hover:bg-white/10 hover:text-white data-[active=true]:text-blue-300 data-[active=true]:font-semibold transition-colors">
                                      <Link href="/admin/dashboard/manage-blocks">
                                        <LayoutGrid className="h-4 w-4" />
                                        <span>Blocks</span>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                  <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={pathname === '/admin/dashboard/manage-subjects'} className="hover:bg-white/10 hover:text-white data-[active=true]:text-blue-300 data-[active=true]:font-semibold transition-colors">
                                      <Link href="/admin/dashboard/manage-subjects">
                                        <BookCopy className="h-4 w-4" />
                                        <span>Subjects</span>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                </>
                              )}
                              {isModerator && (
                                <>
                                  <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={pathname === '/admin/dashboard/view-blocks'} className="hover:bg-white/10 hover:text-white data-[active=true]:text-blue-300 data-[active=true]:font-semibold transition-colors">
                                      <Link href="/admin/dashboard/view-blocks">
                                        <LayoutGrid className="h-4 w-4" />
                                        <span>View Blocks</span>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                  <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild isActive={pathname === '/admin/dashboard/view-subjects'} className="hover:bg-white/10 hover:text-white data-[active=true]:text-blue-300 data-[active=true]:font-semibold transition-colors">
                                      <Link href="/admin/dashboard/view-subjects">
                                        <BookCopy className="h-4 w-4" />
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
                  <SidebarMenuButton asChild isActive={pathname === '/admin/dashboard/students'} className="hover:bg-white/10 hover:text-white data-[active=true]:bg-blue-600 data-[active=true]:text-white data-[active=true]:shadow-md transition-all duration-200">
                      <Link href="/admin/dashboard/students">
                          <Users2 className="h-4 w-4" />
                          <span className="font-medium">Students</span>
                      </Link>
                  </SidebarMenuButton>
              </SidebarMenuItem>
              {!isModerator && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith('/admin/dashboard/instructors')} className="hover:bg-white/10 hover:text-white data-[active=true]:bg-blue-600 data-[active=true]:text-white data-[active=true]:shadow-md transition-all duration-200">
                    <Link href="/admin/dashboard/instructors">
                      <BookUser className="h-4 w-4" />
                      <span className="font-medium">Instructors</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {!isModerator && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === '/admin/dashboard/users'} className="hover:bg-white/10 hover:text-white data-[active=true]:bg-blue-600 data-[active=true]:text-white data-[active=true]:shadow-md transition-all duration-200">
                    <Link href="/admin/dashboard/users">
                      <Users className="h-4 w-4" />
                      <span className="font-medium">Users</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {currentUser.role === 'Super Admin' && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === '/admin/dashboard/administrators'} className="hover:bg-white/10 hover:text-white data-[active=true]:bg-blue-600 data-[active=true]:text-white data-[active=true]:shadow-md transition-all duration-200">
                    <Link href="/admin/dashboard/administrators">
                      <Shield className="h-4 w-4" />
                      <span className="font-medium">Administrators</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {!isModerator && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === '/admin/dashboard/reports'} className="hover:bg-white/10 hover:text-white data-[active=true]:bg-blue-600 data-[active=true]:text-white data-[active=true]:shadow-md transition-all duration-200">
                    <Link href="/admin/dashboard/reports">
                      <BarChart3 className="h-4 w-4" />
                      <span className="font-medium">Reports</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
               <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/admin/dashboard/settings'} className="hover:bg-white/10 hover:text-white data-[active=true]:bg-blue-600 data-[active=true]:text-white data-[active=true]:shadow-md transition-all duration-200">
                  <Link href="/admin/dashboard/settings">
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
                    <SidebarMenuButton onClick={handleLogout} className="text-white/60 hover:bg-white/5 hover:text-white transition-all duration-200">
                    <LogOut className="mr-2 h-4 w-4" />
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
