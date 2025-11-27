'use client';

import * as React from 'react';
import type { NotificationItem, NotificationSeed } from '@/types/notifications';

const STORAGE_PREFIX = 'bsit-notifications::';

const isBrowser = typeof window !== 'undefined';

const sortByRecency = (a: NotificationItem, b: NotificationItem) => {
  const aTime = Date.parse(a.createdAt ?? '') || 0;
  const bTime = Date.parse(b.createdAt ?? '') || 0;
  return bTime - aTime;
};

type NotificationStoragePayload = {
  read: Record<string, boolean>;
  dismissed: Record<string, boolean>;
  custom: NotificationItem[];
};

const createDefaultStoragePayload = (): NotificationStoragePayload => ({
  read: {},
  dismissed: {},
  custom: [],
});

const isStoragePayload = (value: unknown): value is NotificationStoragePayload => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<NotificationStoragePayload>;
  return (
    !!candidate &&
    typeof candidate.read === 'object' &&
    typeof candidate.dismissed === 'object' &&
    Array.isArray(candidate.custom)
  );
};

const loadFromStorage = (storageKey: string): NotificationStoragePayload => {
  if (!isBrowser) {
    return createDefaultStoragePayload();
  }

  try {
    const cached = window.localStorage.getItem(storageKey);
    if (!cached) {
      return createDefaultStoragePayload();
    }
    const parsed = JSON.parse(cached);
    if (isStoragePayload(parsed)) {
      return {
        read: parsed.read ?? {},
        dismissed: parsed.dismissed ?? {},
        custom: Array.isArray(parsed.custom) ? parsed.custom : [],
      };
    }

    if (Array.isArray(parsed)) {
      const legacyNotifications = parsed as NotificationItem[];
      const read: Record<string, boolean> = {};
      legacyNotifications.forEach((notification) => {
        if (notification?.id && notification.read) {
          read[notification.id] = true;
        }
      });
      return {
        read,
        dismissed: {},
        custom: legacyNotifications,
      };
    }

    return createDefaultStoragePayload();
  } catch (_error) {
    return createDefaultStoragePayload();
  }
};

const persistToStorage = (storageKey: string, payload: NotificationStoragePayload) => {
  if (!isBrowser) {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch (_error) {
    // Silently ignore quota errors
  }
};

const mergeNotifications = (seeds: NotificationSeed[], state: NotificationStoragePayload): NotificationItem[] => {
  const dismissed = state.dismissed ?? {};
  const read = state.read ?? {};
  const seededIds = new Set<string>();

  const seededNotifications = (seeds ?? [])
    .filter((seed) => !dismissed[seed.id])
    .map((seed) => {
      seededIds.add(seed.id);
      return {
        ...seed,
        read: read[seed.id] ?? seed.read ?? false,
      };
    });

  const customNotifications = (state.custom ?? [])
    .filter((notification) => notification?.id)
    .filter((notification) => !dismissed[notification.id!] && !seededIds.has(notification.id!))
    .map((notification) => ({
      ...notification,
      read: read[notification.id] ?? notification.read ?? false,
    }));

  return [...seededNotifications, ...customNotifications].sort(sortByRecency);
};

export const useNotificationCenter = (storageKey: string, seeds: NotificationSeed[]) => {
  const normalizedStorageKey = React.useMemo(() => `${STORAGE_PREFIX}${storageKey}`, [storageKey]);
  const storageKeyRef = React.useRef(normalizedStorageKey);

  const [snapshot, setSnapshot] = React.useState<NotificationStoragePayload>(() => loadFromStorage(normalizedStorageKey));

  React.useEffect(() => {
    const nextKey = normalizedStorageKey;
    if (storageKeyRef.current === nextKey) {
      return;
    }
    storageKeyRef.current = nextKey;
    setSnapshot(loadFromStorage(nextKey));
  }, [normalizedStorageKey]);

  const notifications = React.useMemo(() => mergeNotifications(seeds, snapshot), [seeds, snapshot]);

  React.useEffect(() => {
    persistToStorage(normalizedStorageKey, snapshot);
  }, [normalizedStorageKey, snapshot]);

  const markAsRead = React.useCallback((id: string) => {
    setSnapshot((prev) => {
      if (prev.read[id]) {
        return prev;
      }
      return {
        ...prev,
        read: { ...prev.read, [id]: true },
      };
    });
  }, []);

  const markAllAsReadInternal = React.useCallback((currentNotifications?: NotificationItem[]) => {
    setSnapshot((prev) => {
      const target = currentNotifications ?? mergeNotifications(seeds, prev);
      const nextRead = { ...prev.read };
      target.forEach((notification) => {
        nextRead[notification.id] = true;
      });
      return {
        ...prev,
        read: nextRead,
      };
    });
  }, [seeds]);

  const dismissNotification = React.useCallback((id: string) => {
    setSnapshot((prev) => ({
      read: { ...prev.read, [id]: true },
      dismissed: { ...prev.dismissed, [id]: true },
      custom: prev.custom.filter((notification) => notification.id !== id),
    }));
  }, []);

  const addNotification = React.useCallback((notification: NotificationItem) => {
    setSnapshot((prev) => {
      const exists = prev.custom.some((entry) => entry.id === notification.id);
      const nextCustom = exists
        ? prev.custom.map((entry) => (entry.id === notification.id ? notification : entry))
        : [...prev.custom, notification];
      return {
        ...prev,
        custom: nextCustom,
      };
    });
  }, []);

  const clearAll = React.useCallback(() => {
    setSnapshot(createDefaultStoragePayload());
  }, []);

  const unreadCount = React.useMemo(() => notifications.filter((notification) => !notification.read).length, [notifications]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead: React.useCallback(() => markAllAsReadInternal(notifications), [markAllAsReadInternal, notifications]),
    dismissNotification,
    addNotification,
    clearAll,
  };
};
