import React from 'react';
import { cn } from '../../lib/utils';
import { CheckCircle2, Clock, XCircle, AlertCircle, PlayCircle, PauseCircle, Wrench } from 'lucide-react';

export type StatusType =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'available'
  | 'in-use'
  | 'maintenance'
  | 'paused'
  | 'draft'
  | 'verified'
  | 'in_progress'
  | 'confirmed'
  | 'payment_pending';

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className, showIcon = true }) => {
  const configs: Record<StatusType, { label: string; bg: string; text: string; border: string; icon: React.ReactNode }> = {
    pending: {
      label: 'Pending Approval',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      icon: <Clock className="w-3.5 h-3.5 text-amber-600" />,
    },
    accepted: {
      label: 'Confirmed',
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
    },
    active: {
      label: 'Active / In-Field',
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      border: 'border-blue-200',
      icon: <PlayCircle className="w-3.5 h-3.5 text-blue-600 animate-pulse" />,
    },
    completed: {
      label: 'Completed',
      bg: 'bg-[#F0F5F2]',
      text: 'text-[#164B35]',
      border: 'border-[#BCD3C6]',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#347653]" />,
    },
    rejected: {
      label: 'Declined',
      bg: 'bg-rose-50',
      text: 'text-rose-800',
      border: 'border-rose-200',
      icon: <XCircle className="w-3.5 h-3.5 text-rose-600" />,
    },
    cancelled: {
      label: 'Cancelled',
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      border: 'border-gray-200',
      icon: <AlertCircle className="w-3.5 h-3.5 text-gray-500" />,
    },
    available: {
      label: 'Available to Rent',
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
    },
    'in-use': {
      label: 'Currently In-Use',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      icon: <PlayCircle className="w-3.5 h-3.5 text-amber-600" />,
    },
    maintenance: {
      label: 'Maintenance',
      bg: 'bg-orange-50',
      text: 'text-orange-800',
      border: 'border-orange-200',
      icon: <Wrench className="w-3.5 h-3.5 text-orange-600" />,
    },
    paused: {
      label: 'Listing Paused',
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      border: 'border-gray-200',
      icon: <PauseCircle className="w-3.5 h-3.5 text-gray-500" />,
    },
    draft: {
      label: 'Draft',
      bg: 'bg-slate-50',
      text: 'text-slate-700',
      border: 'border-slate-200',
      icon: <Clock className="w-3.5 h-3.5 text-slate-500" />,
    },
    verified: {
      label: 'Verified Farmer',
      bg: 'bg-[#B8D96B]/25',
      text: 'text-[#164B35]',
      border: 'border-[#B8D96B]',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#164B35]" />,
    },
    in_progress: {
      label: 'Active / In-Field',
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      border: 'border-blue-200',
      icon: <PlayCircle className="w-3.5 h-3.5 text-blue-600 animate-pulse" />,
    },
    confirmed: {
      label: 'Confirmed',
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
    },
    payment_pending: {
      label: 'Payment Pending',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      icon: <Clock className="w-3.5 h-3.5 text-amber-600" />,
    },
  };

  const current = (configs as Record<string, typeof configs.pending>)[status] || configs.pending;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border',
        current.bg,
        current.text,
        current.border,
        className
      )}
    >
      {showIcon && current.icon}
      <span>{current.label}</span>
    </span>
  );
};
