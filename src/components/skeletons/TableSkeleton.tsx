import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export const TableSkeleton = ({ rows = 10, columns = 7 }: TableSkeletonProps) => {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-9" />
        </div>
      </div>

      {/* Table skeleton - Desktop */}
      <div className="hidden md:block border rounded-lg overflow-hidden">
        {/* Table header */}
        <div className="bg-muted/50 border-b p-3 flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        
        {/* Table rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div 
            key={rowIndex} 
            className="border-b last:border-0 p-3 flex gap-4 items-center"
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton 
                key={colIndex} 
                className={`h-4 flex-1 ${colIndex === columns - 1 ? 'max-w-[80px]' : ''}`} 
              />
            ))}
          </div>
        ))}
      </div>

      {/* Mobile cards skeleton */}
      <div className="md:hidden space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-5 w-20" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <Skeleton className="h-5 w-28" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const FormSkeleton = () => {
  return (
    <div className="border rounded-lg p-4 space-y-4">
      {/* Date picker skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-10 w-full" />
      </div>
      
      {/* Form fields grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      {/* Submit button */}
      <div className="flex justify-between items-center pt-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-28" />
      </div>
    </div>
  );
};
