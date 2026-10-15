import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'lime';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] rounded-xl select-none';

    const variants = {
      primary: 'bg-[#164B35] text-white hover:bg-[#235D40] focus-visible:ring-[#164B35] shadow-sm',
      secondary: 'bg-[#347653] text-white hover:bg-[#265B3E] focus-visible:ring-[#347653]',
      lime: 'bg-[#B8D96B] text-[#164B35] font-semibold hover:bg-[#a6c957] focus-visible:ring-[#B8D96B] shadow-sm',
      outline: 'border border-[#CBD5C7] text-[#25312A] bg-white hover:bg-[#F7F8F2] hover:border-[#164B35] focus-visible:ring-[#164B35]',
      ghost: 'text-[#25312A] hover:bg-[#EFF2EB] hover:text-[#164B35]',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600',
    };

    const sizes = {
      sm: 'text-xs px-3 py-1.5 gap-1.5',
      md: 'text-sm px-4 py-2.5 gap-2',
      lg: 'text-base px-6 py-3.5 gap-2.5 font-semibold',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {!isLoading && leftIcon}
        <span>{children}</span>
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
