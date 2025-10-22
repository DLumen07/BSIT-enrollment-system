'use client';

import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function Loading() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <LoadingSpinner className="h-8 w-8" />
    </div>
  );
}
