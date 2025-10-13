
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
} from 'lucide-react';
import Image from 'next/image';
import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
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

const Breadcrumb = () => {
    const pathname = usePathname();
    const segments = pathname.split('/').filter(Boolean);

    const formatSegment = (s: string) => {
        const decoded = decodeURIComponent(s);
        const str = decoded.replace(/-/g, ' ');
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    
    if (segments.length < 2) {
      return null;
    }

    return (
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            {segments.map((segment, index) => {
                 if (index === 0) return null;

                const href = '/' + segments.slice(0, index + 1).join('/');
                const isLast = index === segments.length - 1;
                
                const displayName = formatSegment(segment);

                 if (index === 1) { 
                    return isLast ? (
                        <span key={href} className="text-foreground">{displayName}</span>
                    ) : (
                         <Link key={href} href={href} className={'hover:text-foreground'}>
                           {displayName}
                        </Link>
                    )
                }

                return (
                    <React.Fragment key={href}>
                       <ChevronRight className="h-4 w-4" />
                        {isLast ? (
                           <span className="text-foreground">{displayName}</span>
                        ) : (
                           <Link href={href} className={'hover:text-foreground'}>
                                {displayName}
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
  const schoolLogo = PlaceHolderImages.find(p => p.id === 'school-logo-sm');
  const isEnrollmentPath = pathname.startsWith('/admin/dashboard/manage-');
  const [isEnrollmentOpen, setIsEnrollmentOpen] = useState(isEnrollmentPath);

  useEffect(() => {
    setIsEnrollmentOpen(pathname.startsWith('/admin/dashboard/manage-'));
  }, [pathname]);


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
              <SidebarMenuButton href="#">
                <Users2 />
                Students
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
                                <ClipboardList />
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
                                 <SidebarMenuSubButton asChild isActive={pathname === '/admin/dashboard/manage-blocks'}>
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
              <SidebarMenuButton href="#">
                <BarChart3 />
                Reports
              </SidebarMenuButton>
            </SidebarMenuItem>
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
                  className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px]"
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
                    src="https://picsum.photos/seed/admin-avatar/32/32"
                    width={32}
                    height={32}
                    alt="Admin Avatar"
                    className="rounded-full"
                    data-ai-hint="person avatar"
                  />
                  <span className="sr-only">Toggle user menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Admin Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuItem>Support</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/">Logout</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
