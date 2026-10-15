import React from 'react';
import { cn } from '../../lib/utils';

interface LoadingSkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<LoadingSkeletonProps> = ({ className }) => {
  return (
    <div
      className={cn(
        'animate-pulse bg-[#E2E7DE]/70 rounded-lg',
        className
      )}
    />
  );
};

export const EquipmentCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl border border-[#E2E7DE] overflow-hidden p-4 shadow-sm space-y-4">
      <Skeleton className="w-full h-48 rounded-xl" />
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Skeleton className="w-24 h-5" />
          <Skeleton className="w-16 h-5" />
        </div>
        <Skeleton className="w-3/4 h-6" />
        <Skeleton className="w-1/2 h-4" />
      </div>
      <div className="pt-3 border-t border-[#E2E7DE] flex justify-between items-center">
        <Skeleton className="w-28 h-7" />
        <Skeleton className="w-24 h-9 rounded-xl" />
      </div>
    </div>
  );
};
