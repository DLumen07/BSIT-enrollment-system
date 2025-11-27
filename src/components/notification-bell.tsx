'use client';

import * as React from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  CalendarClock,
  ClipboardList,
  GraduationCap,
  Inbox,
  Info,
  Megaphone,
} from 'lucide-react';
import type { NotificationCategory, NotificationItem } from '@/types/notifications';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const categoryMeta: Record<NotificationCategory, { label: string; icon: LucideIcon; accent: string }> = {
  application: { label: 'Application', icon: ClipboardList, accent: 'text-sky-600 dark:text-sky-400' },
  enrollment: { label: 'Enrollment', icon: Megaphone, accent: 'text-emerald-600 dark:text-emerald-400' },
  schedule: { label: 'Schedule', icon: CalendarClock, accent: 'text-indigo-600 dark:text-indigo-400' },
  records: { label: 'Records', icon: Inbox, accent: 'text-amber-600 dark:text-amber-400' },
  system: { label: 'System', icon: Info, accent: 'text-muted-foreground' },
  grade: { label: 'Grades', icon: GraduationCap, accent: 'text-purple-600 dark:text-purple-400' },
};

const formatRelativeTime = (timestamp: string): string => {
  const parsed = Date.parse(timestamp ?? '');
  if (Number.isNaN(parsed)) {
    return 'Just now';
  }
  const now = Date.now();
  const diffMs = Math.max(0, now - parsed);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) {
    return 'Just now';
  }
  if (diffMs < hour) {
    const mins = Math.floor(diffMs / minute);
    return `${mins}m ago`;
  }
  if (diffMs < day) {
    const hours = Math.floor(diffMs / hour);
    return `${hours}h ago`;
  }
  const days = Math.floor(diffMs / day);
  return `${days}d ago`;
};

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
    <Bell className="h-6 w-6 text-muted-foreground" />
    <div className="space-y-1">
      <p className="text-sm font-medium">All caught up</p>
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  </div>
);

export type NotificationBellProps = {
  notifications: NotificationItem[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDismissNotification?: (id: string) => void;
  emptyMessage?: string;
};

export const NotificationBell: React.FC<NotificationBellProps> = ({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismissNotification,
  emptyMessage = 'We will let you know when something needs your attention.',
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full p-0">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Open notifications</span>
          {unreadCount > 0 && (
            <span className="absolute right-0 top-0 inline-flex h-4 min-w-[1rem] translate-x-1/4 -translate-y-1/4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 rounded-xl overflow-hidden" sideOffset={8}>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : 'No unread notifications'}
            </p>
          </div>
          <Button size="sm" variant="ghost" className="text-xs" onClick={onMarkAllAsRead} disabled={unreadCount === 0}>
            Mark all read
          </Button>
        </div>
        {notifications.length === 0 ? (
          <EmptyState message={emptyMessage} />
        ) : (
          <ScrollArea className="max-h-[360px]">
            <ul className="divide-y">
              {notifications.map((notification) => {
                const meta = categoryMeta[notification.category] ?? categoryMeta.system;
                const Icon = meta.icon;
                return (
                  <li key={notification.id} className={cn('flex gap-3 px-4 py-3 transition-colors', !notification.read && 'bg-muted/40')}>
                    <div
                      className={cn(
                        'mt-1 flex h-9 w-9 items-center justify-center rounded-full border',
                        notification.read ? 'border-border text-muted-foreground' : 'border-primary/50 text-primary'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium leading-tight">{notification.title}</p>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{formatRelativeTime(notification.createdAt)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{notification.description}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="secondary" className={cn('bg-transparent text-xs font-medium', meta.accent, 'px-1.5')}>{meta.label}</Badge>
                        {!notification.read && (
                          <button type="button" className="font-semibold text-primary hover:underline" onClick={() => onMarkAsRead(notification.id)}>
                            Mark read
                          </button>
                        )}
                        {notification.action && (
                          <Link href={notification.action.href} className="font-semibold text-muted-foreground hover:text-primary hover:underline">
                            {notification.action.label}
                          </Link>
                        )}
                        {onDismissNotification && (
                          <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => onDismissNotification(notification.id)}>
                            Dismiss
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;
