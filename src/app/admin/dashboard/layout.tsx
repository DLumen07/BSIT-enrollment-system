
'use client';
import Link from 'next/link';
import {
  Bell,
  Home,
  Search,
  LogOut,
  Users2,
  ClipboardList,
  BarChart3,
} from 'lucide-react';
import Image from 'next/image';
import React from 'react';
import { usePathname } from 'next/navigation';

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
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/theme-toggle';


export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Image
              src="https://picsum.photos/seed/school-logo/40/40"
              alt="School Logo"
              width={40}
              height={40}
              data-ai-hint="school logo"
              className="rounded-full"
            />
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
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith('/admin/dashboard/manage-enrollment')}>
                  <Link href="/admin/dashboard/manage-enrollment">
                      <ClipboardList />
                      Manage Enrollment
                  </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton href="#">
                <BarChart3 />
                Reports
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
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6 md:hidden">
          <SidebarTrigger />
           <div className="flex items-center gap-2">
            <Image
              src="https://picsum.photos/seed/school-logo/40/40"
              alt="School Logo"
              width={40}
              height={40}
              data-ai-hint="school logo"
              className="rounded-full"
            />
            <span className="font-semibold text-lg">BSIT Enrollment</span>
          </div>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
