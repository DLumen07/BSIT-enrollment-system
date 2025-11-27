export type NotificationCategory = 'application' | 'enrollment' | 'schedule' | 'records' | 'system' | 'grade';

export type NotificationAction = {
  label: string;
  href: string;
};

export type NotificationItem = {
  id: string;
  title: string;
  description: string;
  category: NotificationCategory;
  createdAt: string;
  read?: boolean;
  action?: NotificationAction;
  meta?: Record<string, unknown>;
};

export type NotificationSeed = NotificationItem;
