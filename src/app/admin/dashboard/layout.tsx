

'use client';
import Link from 'next/link';
import {
  Bell,
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

        return breadcrumbs;
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

  const handleLogout = () => {
    sessionStorage.removeItem('currentUser');
    setAdminData(prev => ({ ...prev, currentUser: null }));
    router.push('/admin-login');
  };

  React.useEffect(() => {
    if (!currentUser) {
      router.push('/admin-login');
    }
  }, [currentUser, router]);

  if (!currentUser) {
    return <div>Loading user or redirecting...</div>;
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
                  width={60}
                  height={60}
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
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/admin/dashboard/users'}>
                  <Link href="/admin/dashboard/users">
                    <Users />
                    Users
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/admin/dashboard/students'}>
                  <Link href="/admin/dashboard/students">
                    <Users2 />
                    Students
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
                          </SidebarMenuSub>
                      </CollapsibleContent>
                  </Collapsible>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === '/admin/dashboard/reports'}>
                  <Link href="/admin/dashboard/reports">
                    <BarChart3 />
                    Reports
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {currentUser.role !== 'Moderator' && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith('/admin/dashboard/instructors')}>
                    <Link href="/admin/dashboard/instructors">
                      <BookUser />
                      Instructors
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
            <SidebarMenu>
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
              <Button variant="ghost" size="icon" className="rounded-full">
                <Bell className="h-5 w-5" />
                <span className="sr-only">Toggle notifications</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Image
                      src={currentUser.avatar}
                      width={32}
                      height={32}
                      alt={currentUser.name}
                      className="rounded-full"
                      data-ai-hint="person avatar"
                    />
                    <span className="sr-only">Toggle user menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{currentUser.name}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/admin/dashboard/settings">Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => toast({ title: 'Feature in progress', description: 'Support page is not yet implemented.' })}>Support</DropdownMenuItem>
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
