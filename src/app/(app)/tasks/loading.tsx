import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 md:p-6">
      <Skeleton className="h-40 w-full rounded-3xl" />
      <Skeleton className="h-10 w-full rounded-lg" />
      <div className="flex flex-col gap-6 lg:flex-row">
        <Skeleton className="h-64 w-full rounded-2xl lg:w-56" />
        <div className="flex flex-1 flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-2xl lg:w-72" />
      </div>
    </div>
  );
}
