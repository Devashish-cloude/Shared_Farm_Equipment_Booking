import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bookingsService } from '../../services/bookings.service';
import { paymentsService } from '../../services/payments.service';
import { Booking } from '../../types';
import { Button } from '../../components/ui/Button';
import { formatCurrency } from '../../lib/utils';
import {
  ShieldCheck,
  CreditCard,
  QrCode,
  Building2,
  Lock,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ChevronLeft
} from 'lucide-react';
import { toast } from 'sonner';

export const BookingPaymentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'netbanking' | 'card'>('upi');
  const [upiId, setUpiId] = useState('farmer@upi');
  const [selectedBank, setSelectedBank] = useState('State Bank of India (SBI)');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const loadBooking = async () => {
      if (!id) return;
      try {
        const item = await bookingsService.getById(id);
        setBooking(item);
      } catch (err) {
        toast.error('Booking not found');
      }
    };
    loadBooking();
  }, [id]);

  if (!booking) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-sm font-semibold text-[#526058]">Loading payment gateway...</p>
      </div>
    );
  }

  const handleSimulatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      // Simulate real bank authorization delay
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const result = await paymentsService.simulatePayment(booking.id, paymentMethod);

      if (result.success) {
        toast.success('Test payment authorized successfully!');
        navigate(`/booking/${booking.id}/confirmation`, {
          state: { transactionId: result.transactionId },
        });
      }
    } catch (err: any) {
      toast.error(err.message || 'Payment simulation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-bold text-[#164B35] hover:underline"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Summary</span>
        </button>
      </div>

      {/* Clear Demo Payment Mode Notice */}
      <div className="bg-amber-50 border border-amber-300 p-4 rounded-2xl flex items-start gap-3 text-amber-900">
        <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold">Test / Simulation Payment Mode</p>
          <p className="text-amber-800 leading-relaxed">
            This is a simulated sandbox environment. No actual money or bank accounts will be charged.
            Raw card details and CVVs are strictly prohibited from being collected.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-[#E2E7DE] shadow-medium p-6 sm:p-8 space-y-6">
        <div className="flex justify-between items-center pb-4 border-b border-[#E2E7DE]">
          <div>
            <h1 className="text-xl font-bold font-heading text-[#164B35]">
              Select Payment Method
            </h1>
            <p className="text-xs text-[#526058]">Order #{booking.id}</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-[#7C8C83]">Amount Due:</span>
            <p className="text-lg font-extrabold text-[#164B35]">
              {formatCurrency(booking.totalPrice)}
            </p>
          </div>
        </div>

        {/* Payment Tabs */}
        <div className="grid grid-cols-3 gap-2 p-1 bg-[#F7F8F2] rounded-xl border border-[#E2E7DE]">
          <button
            type="button"
            onClick={() => setPaymentMethod('upi')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
              paymentMethod === 'upi'
                ? 'bg-white text-[#164B35] shadow-xs'
                : 'text-[#526058] hover:text-[#164B35]'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>UPI / QR</span>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMethod('netbanking')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
              paymentMethod === 'netbanking'
                ? 'bg-white text-[#164B35] shadow-xs'
                : 'text-[#526058] hover:text-[#164B35]'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Net Banking</span>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMethod('card')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
              paymentMethod === 'card'
                ? 'bg-white text-[#164B35] shadow-xs'
                : 'text-[#526058] hover:text-[#164B35]'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Test Card</span>
          </button>
        </div>

        <form onSubmit={handleSimulatePayment} className="space-y-5">
          {paymentMethod === 'upi' && (
            <div className="space-y-4 p-4 bg-[#F0F5F2] rounded-2xl border border-[#BCD3C6]">
              <div className="flex items-center gap-2 text-xs font-bold text-[#164B35]">
                <QrCode className="w-4 h-4" />
                <span>UPI Direct Payment (GPay, PhonePe, Paytm)</span>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#25312A] mb-1">
                  Virtual Payment Address (VPA / UPI ID)
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. mobile@upi"
                  className="w-full text-xs p-2.5 rounded-xl border border-[#CBD5C7] bg-white font-medium"
                />
              </div>
              <p className="text-[11px] text-[#526058]">
                A test UPI collect request will be authorized instantly in demo mode.
              </p>
            </div>
          )}

          {paymentMethod === 'netbanking' && (
            <div className="space-y-3 p-4 bg-[#F0F5F2] rounded-2xl border border-[#BCD3C6]">
              <label className="block text-xs font-bold text-[#25312A]">
                Select Participating Rural / Commercial Bank
              </label>
              <select
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-[#CBD5C7] bg-white"
              >
                <option value="State Bank of India (SBI)">State Bank of India (SBI)</option>
                <option value="Bank of Baroda (BoB)">Bank of Baroda (BoB)</option>
                <option value="HDFC Bank">HDFC Bank</option>
                <option value="Punjab National Bank (PNB)">Punjab National Bank (PNB)</option>
                <option value="Gujarat Gramin Bank">Gujarat Gramin Bank</option>
              </select>
            </div>
          )}

          {paymentMethod === 'card' && (
            <div className="space-y-3 p-4 bg-[#F0F5F2] rounded-2xl border border-[#BCD3C6] text-xs">
              <p className="font-bold text-[#164B35]">Test Sandbox Card</p>
              <div className="p-3 bg-white rounded-xl border border-[#CBD5C7] space-y-2 text-[#526058]">
                <div className="flex justify-between">
                  <span>Test Card Number:</span>
                  <span className="font-mono font-bold text-[#25312A]">4000 0000 0000 4242</span>
                </div>
                <div className="flex justify-between">
                  <span>Expiry / CVV:</span>
                  <span className="font-mono font-bold text-[#25312A]">12/28 &bull; 123</span>
                </div>
              </div>
            </div>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isProcessing}
              leftIcon={<Lock className="w-4 h-4" />}
            >
              Authorize Test Payment of {formatCurrency(booking.totalPrice)}
            </Button>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#7C8C83]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#347653]" />
            <span>256-Bit SSL Encrypted Escrow Gateway Simulation</span>
          </div>
        </form>
      </div>
    </div>
  );
};
