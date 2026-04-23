import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-zinc-800/80", className)}
      aria-hidden
      {...props}
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4", i === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}

export function HomePageSkeleton() {
  return (
    <div className="space-y-10 sm:space-y-12 md:space-y-16" aria-hidden>
      <div className="space-y-4 text-center sm:text-left">
        <Skeleton className="mx-auto h-4 w-32 sm:mx-0" />
        <Skeleton className="mx-auto h-10 w-full max-w-lg sm:mx-0" />
        <Skeleton className="mx-auto h-4 w-full max-w-md sm:mx-0" />
        <div className="mx-auto flex flex-wrap justify-center gap-2 sm:justify-start">
          <Skeleton className="h-10 w-28 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>
      <Skeleton className="mx-auto h-12 w-full max-w-2xl" />
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="card-glow space-y-4">
          <Skeleton className="h-3 w-24" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between gap-2 border-b border-white/5 py-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
        <div className="card-glow space-y-3 p-1">
          <Skeleton className="h-3 w-28" />
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-4 w-40" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      </div>
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}

export function DashboardPageSkeleton() {
  return (
    <div className="w-full min-w-0 space-y-8 sm:space-y-10" aria-hidden>
      <div className="overflow-hidden rounded-2xl border border-violet-500/20 bg-zinc-900/20 px-4 py-5 sm:px-8 sm:py-8">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-4 h-9 w-48 max-w-full" />
        <Skeleton className="mt-2 h-4 w-full max-w-lg" />
        <div className="mt-5 flex flex-wrap gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-36 w-full rounded-2xl" />
    </div>
  );
}

export function WalletPageSkeleton() {
  return (
    <div className="w-full min-w-0 space-y-6 sm:space-y-8" aria-hidden>
      <div>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-3 h-8 w-64 max-w-full" />
        <Skeleton className="mt-1 h-4 w-full max-w-md" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  );
}

export function ReferralsPageSkeleton() {
  return (
    <div className="w-full min-w-0 space-y-6" aria-hidden>
      <div>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-2 h-4 w-full max-w-xl" />
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}

export function SellPageSkeleton() {
  return (
    <div className="w-full min-w-0 space-y-6" aria-hidden>
      <div>
        <Skeleton className="h-8 w-48 max-w-full" />
        <Skeleton className="mt-2 h-4 w-full max-w-lg" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-12 w-full max-w-sm rounded-lg" />
    </div>
  );
}

export function AuthPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-md space-y-6 px-0 sm:px-0" aria-hidden>
      <div className="text-center">
        <Skeleton className="mx-auto h-7 w-40" />
        <Skeleton className="mx-auto mt-2 h-4 w-56" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-11 w-full rounded-lg" />
        <Skeleton className="h-11 w-full rounded-lg" />
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>
    </div>
  );
}

export function StaffPageSkeleton() {
  return (
    <div className="w-full min-w-0 space-y-6" aria-hidden>
      <div>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-1 h-4 w-48" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-2xl" />
      ))}
    </div>
  );
}

export function OrderDetailSkeleton() {
  return (
    <div className="mx-auto w-full min-w-0 max-w-2xl space-y-6" aria-hidden>
      <div>
        <Skeleton className="h-7 w-32" />
        <Skeleton className="mt-2 h-3 w-48" />
      </div>
      <div className="flex flex-wrap gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-20 rounded-md" />
        ))}
      </div>
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}

export function AdminTableSkeleton({ rows = 8, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full min-w-0" aria-hidden>
      <div className="mb-4 flex min-w-0 flex-wrap gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full sm:w-32" />
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-white/5">
        <div className="flex border-b border-white/5 p-2">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="mx-1 h-3 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }, (_, r) => (
          <div key={`r-${r}`} className="flex border-b border-white/5 p-2 last:border-0">
            {Array.from({ length: cols }, (_, c) => (
              <Skeleton key={`c-${r}-${c}`} className="mx-1 h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminOverviewSkeleton() {
  return (
    <div className="min-w-0 max-w-full space-y-6" aria-hidden>
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-1 h-4 w-full max-w-md" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}
