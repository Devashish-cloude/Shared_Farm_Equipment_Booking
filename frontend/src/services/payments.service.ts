import { apiClient } from './api';
import { mockStore } from './mockStore';
import { isDemoModeActive } from './auth.service';
import { Transaction } from '../types';

export interface EarningsSummary {
  grossEarnings: number;
  platformFees: number;
  netEarnings: number;
  pendingPayouts: number;
  completedBookingsCount: number;
}

export const paymentsService = {
  async getTransactions(): Promise<Transaction[]> {
    if (isDemoModeActive()) {
      return mockStore.getTransactions();
    }
    const res = await apiClient.get<Transaction[]>('/payments/transactions');
    return res.data;
  },

  async getEarningsSummary(): Promise<EarningsSummary> {
    if (isDemoModeActive()) {
      const txs = mockStore.getTransactions();
      const gross = txs.filter(t => t.type === 'earning').reduce((acc, t) => acc + t.grossAmount, 0);
      const fees = txs.filter(t => t.type === 'earning').reduce((acc, t) => acc + t.platformFee, 0);
      const net = txs.filter(t => t.type === 'earning').reduce((acc, t) => acc + t.netAmount, 0);

      return {
        grossEarnings: gross,
        platformFees: fees,
        netEarnings: net,
        pendingPayouts: 0,
        completedBookingsCount: txs.filter(t => t.type === 'earning').length,
      };
    }
    const res = await apiClient.get<EarningsSummary>('/payments/summary');
    return res.data;
  },

  async simulatePayment(bookingId: string, method: string): Promise<{ success: boolean; transactionId: string }> {
    if (isDemoModeActive()) {
      mockStore.updateBookingStatus(bookingId, 'accepted', { paymentStatus: 'paid' });
      return {
        success: true,
        transactionId: `SF-PAY-DEMO-${Date.now()}`,
      };
    }
    const res = await apiClient.post<{ success: boolean; transactionId: string }>(`/payments/${bookingId}/charge`, {
      method,
    });
    return res.data;
  },
};
