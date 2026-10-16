import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { bookingsService } from '../../services/bookings.service';
import { paymentsService } from '../../services/payments.service';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
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
  ChevronLeft,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

export const BookingPaymentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'netbanking' | 'card'>('upi');
  const [upiId, setUpiId] = useState('farmer@upi');
  const [selectedBank, setSelectedBank] = useState('State Bank of India (SBI)');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const loadBooking = async () => {
      if (!id) return;
      try {
        const item = await bookingsService.getById(id);
        setBooking(item);
      } catch (err: any) {
        toast.error(t('pay.notFound', 'Booking not found'));
      }
    };
    loadBooking();
  }, [id, t]);

  if (!booking) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="w-8 h-8 border-3 border-[#164B35] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-semibold text-[#526058]">
          {t('pay.loading', 'Loading payment gateway...')}
        </p>
      </div>
    );
  }

  // Security check: Verify that the current user is authorized to pay for this booking
  const isUnauthorizedUser =
    user &&
    booking.renterId &&
    user.id !== booking.renterId &&
    !user.id.startsWith('farmer-') &&
    !booking.renterId.startsWith('farmer-');

  // Idempotency: Check if booking is already paid
  const isAlreadyPaid = booking.paymentStatus === 'paid';

  const handleSimulatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (isUnauthorizedUser) {
      const msg = t('pay.unauthorized', 'You are not authorized to pay for this booking.');
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }

    if (isAlreadyPaid) {
      toast.info(t('pay.alreadyPaid', 'This booking has already been paid.'));
      navigate(`/booking/${booking.id}/confirmation`);
      return;
    }

    setIsProcessing(true);

    try {
      // Simulate bank authorization delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      const result = await paymentsService.simulatePayment(booking.id, paymentMethod);

      if (result.success) {
        toast.success(t('pay.success', 'Test payment authorized successfully!'));
        navigate(`/booking/${booking.id}/confirmation`, {
          state: { transactionId: result.transactionId },
        });
      } else {
        const msg = result.error || t('pay.failed', 'Payment authorization failed');
        setErrorMsg(msg);
        toast.error(msg);
      }
    } catch (err: any) {
      const msg = err.message || t('pay.failed', 'Payment authorization failed');
      setErrorMsg(msg);
      toast.error(msg);
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
          <span>{t('pay.backToSummary', 'Back to Summary')}</span>
        </button>
      </div>

      {/* Clear Demo Payment Mode Notice */}
      <div className="bg-amber-50 border border-amber-300 p-4 rounded-2xl flex items-start gap-3 text-amber-900">
        <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold">{t('pay.testNoticeTitle', 'Test / Simulation Payment Mode')}</p>
          <p className="text-amber-800 leading-relaxed">
            {t(
              'pay.testNoticeDesc',
              'This is a simulated sandbox environment. No actual money or bank accounts will be charged. Raw card details and CVVs are strictly prohibited from being collected.'
            )}
          </p>
        </div>
      </div>

      {/* Unauthorized Warning if URL tampered */}
      {isUnauthorizedUser && (
        <div className="bg-red-50 border border-red-300 p-4 rounded-2xl flex items-start gap-3 text-red-900">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold">{t('pay.unauthorized', 'You are not authorized to pay for this booking.')}</p>
            <p className="text-red-700 leading-relaxed">
              This reservation belongs to another user account. Authorization has been restricted.
            </p>
          </div>
        </div>
      )}

      {/* Already Paid Banner */}
      {isAlreadyPaid && (
        <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-2xl flex items-start justify-between gap-3 text-emerald-900">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold">{t('pay.alreadyPaid', 'This booking has already been paid.')}</p>
              <p className="text-emerald-700 leading-relaxed">
                {t('pay.alreadyPaidDesc', 'Your rental is already confirmed and secured in escrow.')}
              </p>
            </div>
          </div>
          <Link to="/dashboard/rentals">
            <Button variant="primary" size="sm">
              {t('pay.goToRentals', 'View in My Rentals')}
            </Button>
          </Link>
        </div>
      )}

      {/* Error notification banner if any */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-300 p-4 rounded-2xl flex items-start gap-3 text-rose-900">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold">{t('pay.failed', 'Payment authorization failed')}</p>
            <p className="text-rose-700 mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-[#E2E7DE] shadow-medium p-6 sm:p-8 space-y-6">
        <div className="flex justify-between items-center pb-4 border-b border-[#E2E7DE]">
          <div>
            <h1 className="text-xl font-bold font-heading text-[#164B35]">
              {t('pay.title', 'Select Payment Method')}
            </h1>
            <p className="text-xs text-[#526058]">
              {t('pay.orderId', 'Order #')}{booking.id}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-[#7C8C83]">{t('pay.amountDue', 'Amount Due:')}</span>
            <p className="text-lg font-extrabold text-[#164B35]">
              {formatCurrency(booking.totalPrice)}
            </p>
          </div>
        </div>

        {/* Itemized Transparent Breakdown Card (Bug 3) */}
        <div className="p-4 bg-[#F7F8F2] rounded-2xl border border-[#E2E7DE] space-y-2.5 text-xs">
          <div className="flex justify-between items-center text-[#25312A] font-bold pb-2 border-b border-[#E2E7DE]">
            <span>{t('pay.breakdownTitle', 'Order Payment Breakdown')}</span>
            <span className="text-[11px] font-normal text-[#526058]">
              {booking.equipmentName} ({booking.durationHours} hrs)
            </span>
          </div>

          <div className="flex justify-between text-[#526058]">
            <span>{t('pay.baseRent', 'Base Machinery Rent')}:</span>
            <span className="font-semibold text-[#25312A]">{formatCurrency(booking.basePrice)}</span>
          </div>

          {(booking.withOperator || booking.operatorPrice > 0) && (
            <div className="flex justify-between text-[#526058]">
              <span>{t('pay.driverFee', 'Driver Fee')}:</span>
              <span className="font-semibold text-[#25312A]">{formatCurrency(booking.operatorPrice)}</span>
            </div>
          )}

          <div className="flex justify-between text-[#526058]">
            <span>{t('pay.escrowFee', 'Escrow Platform Fee (4%)')}:</span>
            <span className="font-semibold text-[#25312A]">{formatCurrency(booking.platformFee)}</span>
          </div>

          <div className="flex justify-between text-[#526058]">
            <span className="flex items-center gap-1">
              {t('pay.securityDeposit', 'Refundable Security Deposit')}:
              <span title={t('pay.depositNote', 'Held in protected escrow until return inspection')}>
                <Info className="w-3.5 h-3.5 text-[#347653]" />
              </span>
            </span>
            <span className="font-semibold text-[#25312A]">{formatCurrency(booking.securityDeposit)}</span>
          </div>

          <div className="pt-2 border-t border-[#E2E7DE] flex justify-between text-sm font-extrabold text-[#164B35]">
            <span>{t('pay.totalPayable', 'Total Payable')}:</span>
            <span>{formatCurrency(booking.totalPrice)}</span>
          </div>
        </div>

        {/* Payment Tabs */}
        <div className="grid grid-cols-3 gap-2 p-1 bg-[#F7F8F2] rounded-xl border border-[#E2E7DE]">
          <button
            type="button"
            onClick={() => setPaymentMethod('upi')}
            disabled={isProcessing || isUnauthorizedUser || isAlreadyPaid}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
              paymentMethod === 'upi'
                ? 'bg-white text-[#164B35] shadow-xs'
                : 'text-[#526058] hover:text-[#164B35]'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>{t('pay.upiQr', 'UPI / QR')}</span>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMethod('netbanking')}
            disabled={isProcessing || isUnauthorizedUser || isAlreadyPaid}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
              paymentMethod === 'netbanking'
                ? 'bg-white text-[#164B35] shadow-xs'
                : 'text-[#526058] hover:text-[#164B35]'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>{t('pay.netbanking', 'Net Banking')}</span>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMethod('card')}
            disabled={isProcessing || isUnauthorizedUser || isAlreadyPaid}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
              paymentMethod === 'card'
                ? 'bg-white text-[#164B35] shadow-xs'
                : 'text-[#526058] hover:text-[#164B35]'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>{t('pay.testCard', 'Test Card')}</span>
          </button>
        </div>

        <form onSubmit={handleSimulatePayment} className="space-y-5">
          {paymentMethod === 'upi' && (
            <div className="space-y-4 p-4 bg-[#F0F5F2] rounded-2xl border border-[#BCD3C6]">
              <div className="flex items-center gap-2 text-xs font-bold text-[#164B35]">
                <QrCode className="w-4 h-4" />
                <span>{t('pay.upiTitle', 'UPI Direct Payment (GPay, PhonePe, Paytm)')}</span>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#25312A] mb-1">
                  {t('pay.vpaLabel', 'Virtual Payment Address (VPA / UPI ID)')}
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder={t('pay.vpaPlaceholder', 'e.g. mobile@upi')}
                  disabled={isProcessing || isUnauthorizedUser || isAlreadyPaid}
                  className="w-full text-xs p-2.5 rounded-xl border border-[#CBD5C7] bg-white font-medium"
                />
              </div>
              <p className="text-[11px] text-[#526058]">
                {t('pay.upiHelper', 'A test UPI collect request will be authorized instantly in demo mode.')}
              </p>
            </div>
          )}

          {paymentMethod === 'netbanking' && (
            <div className="space-y-3 p-4 bg-[#F0F5F2] rounded-2xl border border-[#BCD3C6]">
              <label className="block text-xs font-bold text-[#25312A]">
                {t('pay.selectBank', 'Select Participating Rural / Commercial Bank')}
              </label>
              <select
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                disabled={isProcessing || isUnauthorizedUser || isAlreadyPaid}
                className="w-full text-xs p-2.5 rounded-xl border border-[#CBD5C7] bg-white"
              >
                <option value="State Bank of India (SBI)">State Bank of India (SBI)</option>
                <option value="Bank of Baroda (BoB)">Bank of Baroda (BoB)</option>
                <option value="HDFC Bank">HDFC Bank</option>
                <option value="Punjab National Bank (PNB)">Punjab National Bank (PNB)</option>
                <option value="Gujarat Gramin Bank">Gujarat Gramin Bank</option>
                <option value="Maharashtra Gramin Bank">Maharashtra Gramin Bank</option>
              </select>
            </div>
          )}

          {paymentMethod === 'card' && (
            <div className="space-y-3 p-4 bg-[#F0F5F2] rounded-2xl border border-[#BCD3C6] text-xs">
              <p className="font-bold text-[#164B35]">
                {t('pay.testCardTitle', 'Test Sandbox Card')}
              </p>
              <div className="p-3 bg-white rounded-xl border border-[#CBD5C7] space-y-2 text-[#526058]">
                <div className="flex justify-between">
                  <span>{t('pay.testCardNumber', 'Test Card Number:')}</span>
                  <span className="font-mono font-bold text-[#25312A]">4000 0000 0000 4242</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('pay.testCardExpiry', 'Expiry / CVV:')}</span>
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
              disabled={isProcessing || !!isUnauthorizedUser || isAlreadyPaid}
              leftIcon={<Lock className="w-4 h-4" />}
            >
              {isProcessing
                ? t('pay.authorizing', 'Authorizing...')
                : `${t('pay.authorizeBtn', 'Authorize Test Payment of')} ${formatCurrency(booking.totalPrice)}`}
            </Button>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#7C8C83]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#347653]" />
            <span>{t('pay.sslSecure', '256-Bit SSL Encrypted Escrow Gateway Simulation')}</span>
          </div>
        </form>
      </div>
    </div>
  );
};
