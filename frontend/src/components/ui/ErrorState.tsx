import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'We encountered an error loading this data. Please verify your backend connection or retry.',
  onRetry,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-rose-50/50 rounded-2xl border border-rose-200 shadow-sm',
        className
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-700 mb-4 shadow-sm">
        <AlertTriangle className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-bold text-rose-900 mb-1 font-heading">{title}</h3>
      <p className="text-sm text-rose-700 max-w-md mb-6">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          leftIcon={<RotateCcw className="w-4 h-4" />}
          onClick={onRetry}
          className="border-rose-300 text-rose-800 hover:bg-rose-100/60"
        >
          Try Again
        </Button>
      )}
    </div>
  );
};
