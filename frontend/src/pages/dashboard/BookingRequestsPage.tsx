import React, { useState, useEffect } from 'react';
import { bookingsService } from '../../services/bookings.service';
import { Booking } from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { useLanguage } from '../../context/LanguageContext';
import { formatCurrency, formatDate } from '../../lib/utils';
import {
  Inbox,
  User,
  Phone,
  Calendar,
  Clock,
  Check,
  X,
  AlertTriangle,
  FileText,
  MapPin
} from 'lucide-react';
import { toast } from 'sonner';

export const BookingRequestsPage: React.FC = () => {
  const { t } = useLanguage();
  const [requests, setRequests] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Reject dialog state
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const data = await bookingsService.getMyRequests();
      setRequests(data);
    } catch {
      toast.error('Failed to load incoming requests');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAccept = async (id: string) => {
    try {
      await bookingsService.acceptRequest(id);
      toast.success(t('requests.acceptSuccess'));
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message || 'Failed to accept request');
    }
  };

  const handleConfirmReject = async (reason?: string) => {
    if (!rejectId) return;
    setIsRejecting(true);
    try {
      await bookingsService.rejectRequest(rejectId, reason || 'Equipment unavailable on requested dates');
      toast.info(t('requests.declineSuccess'));
      setRejectId(null);
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject request');
    } finally {
      setIsRejecting(false);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const pastRequests = requests.filter((r) => r.status !== 'pending');

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-[#E2E7DE]">
        <h1 className="text-2xl font-extrabold text-[#164B35] font-heading">
          {t('requests.title')}
        </h1>
        <p className="text-xs text-[#526058] mt-1">
          {t('requests.subtitle')}
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-[#526058]">
          <div className="w-7 h-7 border-3 border-[#164B35] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs">{t('common.loading')}</p>
        </div>
      ) : requests.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={t('requests.noRequests')}
          description={t('requests.noRequestsDesc')}
        />
      ) : (
        <div className="space-y-8">
          {/* Pending Requests Section */}
          <div className="space-y-4">
            <h3 className="font-heading font-bold text-sm text-[#25312A] uppercase tracking-wider flex items-center gap-2">
              <span>Pending Action ({pendingRequests.length})</span>
              {pendingRequests.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              )}
            </h3>

            {pendingRequests.length === 0 ? (
              <div className="p-6 bg-white rounded-2xl border border-[#E2E7DE] text-center text-xs text-[#7C8C83]">
                No pending requests requiring approval.
              </div>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-white p-5 sm:p-6 rounded-2xl border-2 border-amber-200 shadow-sm space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E2E7DE]">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={req.status} />
                        <span className="text-xs font-mono text-[#7C8C83]">#{req.id}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-[#7C8C83]">Your Net Payout:</span>
                        <p className="text-base font-extrabold text-[#164B35]">
                          {formatCurrency(req.basePrice + req.operatorPrice)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Machine */}
                      <div className="flex items-center gap-3">
                        <img
                          src={req.equipmentImage}
                          alt={req.equipmentName}
                          className="w-14 h-14 rounded-xl object-cover shrink-0"
                        />
                        <div>
                          <span className="text-[10px] font-bold text-[#347653] uppercase">
                            {req.equipmentCategory}
                          </span>
                          <h4 className="text-sm font-bold text-[#25312A] font-heading">
                            {req.equipmentName}
                          </h4>
                        </div>
                      </div>

                      {/* Renter Details */}
                      <div className="space-y-1 text-xs text-[#526058]">
                        <div className="flex items-center gap-1.5 font-bold text-[#25312A]">
                          <User className="w-3.5 h-3.5 text-[#347653]" />
                          <span>{req.renterName}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#7C8C83]" />
                          <span>{req.renterVillage}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-[#7C8C83]" />
                          <span>{req.renterPhone}</span>
                        </div>
                      </div>

                      {/* Schedule & Operator */}
                      <div className="space-y-1 text-xs text-[#526058]">
                        <div className="flex items-center gap-1.5 font-bold text-[#25312A]">
                          <Calendar className="w-3.5 h-3.5 text-[#347653]" />
                          <span>{formatDate(req.startDate)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#7C8C83]">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{req.durationHours} Hours Session</span>
                        </div>
                        {req.withOperator && (
                          <span className="inline-block text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                            + Driver Requested (₹{req.operatorPrice})
                          </span>
                        )}
                      </div>
                    </div>

                    {req.renterNotes && (
                      <div className="p-3 bg-[#F7F8F2] rounded-xl text-xs text-[#526058] border border-[#E2E7DE]">
                        <span className="font-bold text-[#25312A] block mb-0.5">Renter Notes:</span>
                        <p>{req.renterNotes}</p>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="pt-2 flex justify-end items-center gap-3 border-t border-[#E2E7DE]">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-rose-600 border-rose-200 hover:bg-rose-50"
                        leftIcon={<X className="w-4 h-4" />}
                        onClick={() => setRejectId(req.id)}
                      >
                        {t('requests.decline')}
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<Check className="w-4 h-4" />}
                        onClick={() => handleAccept(req.id)}
                      >
                        {t('requests.accept')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past Requests History */}
          {pastRequests.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-[#E2E7DE]">
              <h3 className="font-heading font-bold text-sm text-[#7C8C83] uppercase tracking-wider">
                Request History ({pastRequests.length})
              </h3>
              <div className="space-y-3">
                {pastRequests.map((r) => (
                  <div
                    key={r.id}
                    className="bg-white p-4 rounded-xl border border-[#E2E7DE] flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-bold text-[#25312A]">{r.renterName}</span>
                      <span className="text-[#7C8C83] ml-2">requested {r.equipmentName}</span>
                      <p className="text-[11px] text-[#7C8C83] mt-0.5">{formatDate(r.startDate)} &bull; {r.durationHours} hrs</p>
                    </div>
                    <StatusBadge status={r.status} showIcon={false} className="text-[10px]" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reject Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!rejectId}
        onClose={() => setRejectId(null)}
        onConfirm={handleConfirmReject}
        title="Decline Booking Request?"
        description="Are you sure you want to decline this request? The renting farmer will be notified to pick alternate dates."
        confirmText="Decline Request"
        variant="danger"
        withReasonInput
        reasonPlaceholder="e.g. Tractor undergoing routine oil service / in field with owner"
        isLoading={isRejecting}
      />
    </div>
  );
};
