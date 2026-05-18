import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="flex h-[calc(100dvh-3.5rem-4rem)] lg:h-[calc(100dvh-3.5rem)] flex-col gap-2">
      <Skeleton className="h-12 w-full rounded-md" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-md" />
        ))}
      </div>
      <div className="flex flex-1 gap-2 min-h-0">
        <div className="flex-1 flex flex-col gap-2">
          <Skeleton className="h-32 rounded-md" />
          <Skeleton className="flex-1 rounded-md" />
        </div>
        <div className="hidden lg:flex flex-col gap-2 w-1/3">
          <Skeleton className="flex-1 rounded-md" />
          <Skeleton className="h-40 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function NavigationSkeleton() {
  return (
    <div className="flex h-[calc(100dvh-3.5rem-4rem)] lg:h-[calc(100dvh-3.5rem)] w-full overflow-hidden">
      <div className="flex-1 relative">
        <Skeleton className="absolute inset-0 rounded-none" />
        <div className="absolute top-4 left-4 space-y-3 z-10">
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </div>
      <div className="w-80 border-l hidden xl:flex flex-col">
        <Skeleton className="h-12 border-b" />
        <div className="flex-1 p-4 space-y-4">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-20 w-full rounded-md" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-20 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function SectionSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-6 w-48" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}
