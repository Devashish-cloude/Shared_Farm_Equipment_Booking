import React from 'react';
import { formatCurrency } from '../../lib/utils';
import { cn } from '../../lib/utils';

interface PriceDisplayProps {
  pricePerHour: number;
  pricePerDay?: number;
  unit?: 'hour' | 'day';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBoth?: boolean;
}

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  pricePerHour,
  pricePerDay,
  unit = 'hour',
  size = 'md',
  className,
  showBoth = false,
}) => {
  const sizeClasses = {
    sm: { amount: 'text-sm font-semibold', unit: 'text-xs' },
    md: { amount: 'text-lg font-bold', unit: 'text-xs' },
    lg: { amount: 'text-2xl font-extrabold', unit: 'text-sm' },
    xl: { amount: 'text-3xl font-extrabold', unit: 'text-base' },
  };

  const primaryPrice = unit === 'hour' ? pricePerHour : (pricePerDay || pricePerHour * 8);

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex items-baseline gap-1">
        <span className={cn('text-[#164B35]', sizeClasses[size].amount)}>
          {formatCurrency(primaryPrice)}
        </span>
        <span className={cn('text-[#526058] font-medium', sizeClasses[size].unit)}>
          /{unit}
        </span>
      </div>

      {showBoth && pricePerDay && (
        <span className="text-xs text-[#7C8C83]">
          or {formatCurrency(pricePerDay)}/day
        </span>
      )}
    </div>
  );
};
