import React, { useState } from 'react';
import { CreditCard, ShieldCheck, CheckCircle2, AlertTriangle, Loader2, Sparkles, ArrowRight } from 'lucide-react';
import { api } from '../../services/api.js';

interface PaymentCheckoutProps {
  bookingId: string;
  totalPrice: number;
  hourlyRate: number;
  totalHours: number;
  equipmentTitle: string;
  bookingStatus: string;
  onPaymentSuccess: (paymentData: any) => void;
}

export const PaymentCheckout: React.FC<PaymentCheckoutProps> = ({
  bookingId,
  totalPrice,
  hourlyRate,
  totalHours,
  equipmentTitle,
  bookingStatus,
  onPaymentSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<any | null>(null);
  const [isProcessingSignature, setIsProcessingSignature] = useState(false);

  const isConfirmed = bookingStatus === 'confirmed' || bookingStatus === 'in_progress' || bookingStatus === 'completed';

  const handleInitiateOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.createPaymentOrder(bookingId);
      setOrderData(res.data);
    } catch (err: any) {
      setError(err.message || 'Could not initiate payment order');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTestPayment = async () => {
    if (!orderData) return;
    try {
      setIsProcessingSignature(true);
      setError(null);

      // Simulated Razorpay payment ID for test mode
      const mockPaymentId = `pay_rzp_${Date.now()}`;
      
      // We pass is_demo_simulated: true so server's cryptographic verifier completes sandbox capture
      const verifyRes = await api.verifyPayment({
        razorpay_order_id: orderData.orderId,
        razorpay_payment_id: mockPaymentId,
        razorpay_signature: 'test_sandbox_signature_verified',
        is_demo_simulated: true,
      });

      onPaymentSuccess(verifyRes.data);
    } catch (err: any) {
      setError(err.message || 'Payment verification failed');
    } finally {
      setIsProcessingSignature(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl p-6 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-base">Razorpay Checkout</h3>
            <p className="text-xs text-slate-400">Authoritative payment processing & gateway verification</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-700/60 text-blue-300 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
          <span>RAZORPAY TEST MODE</span>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-700/60 text-red-300 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Authoritative Price Breakdown */}
      <div className="rounded-xl bg-slate-950/80 border border-slate-800/90 p-4 space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Authoritative Booking Cost Breakdown
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between text-slate-300">
            <span>Equipment Rental ({equipmentTitle})</span>
            <span className="font-mono">₹{hourlyRate.toFixed(2)} / hr</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Duration Reserved</span>
            <span className="font-mono">{totalHours} Hours</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Base Rental Amount</span>
            <span className="font-mono">₹{(hourlyRate * totalHours).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Platform Insurance & Booking Fee (5%)</span>
            <span className="font-mono">₹{(totalPrice - hourlyRate * totalHours).toFixed(2)}</span>
          </div>

          <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline">
            <span className="font-bold text-slate-100 text-sm">Total Authoritative Amount</span>
            <span className="font-mono text-lg font-extrabold text-emerald-400">
              ₹{totalPrice.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Action Flow */}
      {isConfirmed ? (
        <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-700/50 flex items-center gap-3 text-emerald-300 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <strong>Payment Verified:</strong> This booking is paid & confirmed. You can now proceed to
            start the active rental tracking session!
          </div>
        </div>
      ) : !orderData ? (
        <button
          id="btn-initiate-order"
          onClick={handleInitiateOrder}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-lg shadow-emerald-900/30 transition-all"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CreditCard className="w-4 h-4" />
          )}
          <span>Create Secure Razorpay Order (₹{totalPrice.toFixed(2)})</span>
        </button>
      ) : (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-800/40 space-y-1.5">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Razorpay Order ID:</span>
              <span className="font-mono text-emerald-400 font-semibold">{orderData.orderId}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Amount in Subunit (Paise):</span>
              <span className="font-mono">{orderData.amount} paise</span>
            </div>
          </div>

          <button
            id="btn-complete-razorpay"
            onClick={handleCompleteTestPayment}
            disabled={isProcessingSignature}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white shadow-xl shadow-emerald-950 transition-all"
          >
            {isProcessingSignature ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>Simulate Razorpay Test Payment & Verify Signature</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Security note */}
      <div className="flex items-center gap-2 text-[11px] text-slate-400 justify-center">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
        <span>PCI-DSS Compliant • HMAC SHA-256 Signature Verification • No Card Data Stored</span>
      </div>
    </div>
  );
};
