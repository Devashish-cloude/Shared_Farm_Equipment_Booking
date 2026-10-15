import React from 'react';
import { BookingStatus } from '../../types';
import { Check, Clock, Play, CheckCircle2, XCircle } from 'lucide-react';

interface BookingTimelineProps {
  status: BookingStatus;
}

export const BookingTimeline: React.FC<BookingTimelineProps> = ({ status }) => {
  if (status === 'cancelled' || status === 'rejected') {
    return (
      <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
        <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
        <span>This booking was {status === 'cancelled' ? 'cancelled' : 'declined by the owner'}.</span>
      </div>
    );
  }

  const steps = [
    { key: 'pending', label: 'Requested', icon: Clock },
    { key: 'accepted', label: 'Confirmed', icon: Check },
    { key: 'active', label: 'In-Field', icon: Play },
    { key: 'completed', label: 'Completed', icon: CheckCircle2 },
  ];

  const getStepIndex = (s: BookingStatus) => {
    switch (s) {
      case 'pending': return 0;
      case 'accepted': return 1;
      case 'active': return 2;
      case 'completed': return 3;
      default: return 0;
    }
  };

  const currentIndex = getStepIndex(status);

  return (
    <div className="py-2">
      <div className="flex items-center justify-between relative">
        {/* Background track line */}
        <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-0.5 bg-[#E2E7DE] -z-0" />
        {/* Active progress bar */}
        <div
          className="absolute top-1/2 left-4 -translate-y-1/2 h-0.5 bg-[#164B35] transition-all duration-300 -z-0"
          style={{ width: `${(currentIndex / (steps.length - 1)) * 90}%` }}
        />

        {steps.map((step, idx) => {
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const StepIcon = step.icon;

          return (
            <div key={step.key} className="flex flex-col items-center gap-1.5 relative z-10">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                  isCurrent
                    ? 'bg-[#164B35] text-white ring-4 ring-[#B8D96B]/50'
                    : isDone
                    ? 'bg-[#347653] text-white'
                    : 'bg-white border-2 border-[#CBD5C7] text-[#7C8C83]'
                }`}
              >
                <StepIcon className="w-3.5 h-3.5" />
              </div>
              <span
                className={`text-[10px] font-bold ${
                  isCurrent ? 'text-[#164B35]' : isDone ? 'text-[#347653]' : 'text-[#7C8C83]'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
