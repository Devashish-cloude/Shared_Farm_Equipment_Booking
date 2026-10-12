import React from 'react';
import { CheckCircle2, ShieldCheck, Receipt, Clock, Hash } from 'lucide-react';

interface PaymentStatusProps {
  payment: {
    id: string;
    razorpay_order_id: string;
    razorpay_payment_id?: string;
    amount: number;
    currency: string;
    status: string;
    created_at: string;
  } | null;
}

export const PaymentStatus: React.FC<PaymentStatusProps> = ({ payment }) => {
  if (!payment) return null;

  return (
    <div className="rounded-2xl border border-emerald-800/60 bg-gradient-to-b from-slate-900 to-emerald-950/20 p-5 shadow-xl space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-slate-100 text-sm">Payment Verified & Captured</h4>
          <p className="text-xs text-emerald-400 font-mono">Status: {payment.status.toUpperCase()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-2">
          <Hash className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <div className="overflow-hidden">
            <span className="text-[10px] text-slate-400 uppercase block">Razorpay Payment ID</span>
            <span className="font-mono text-slate-200 font-semibold truncate block">
              {payment.razorpay_payment_id || 'N/A'}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-2">
          <Receipt className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <div className="overflow-hidden">
            <span className="text-[10px] text-slate-400 uppercase block">Razorpay Order ID</span>
            <span className="font-mono text-slate-200 font-semibold truncate block">
              {payment.razorpay_order_id}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>{new Date(payment.created_at).toLocaleString()}</span>
        </span>
        <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Verified Server-Side</span>
        </span>
      </div>
    </div>
  );
};
