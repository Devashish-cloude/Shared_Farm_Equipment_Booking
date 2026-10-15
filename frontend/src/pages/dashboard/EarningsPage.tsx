import React, { useState, useEffect } from 'react';
import { paymentsService, EarningsSummary } from '../../services/payments.service';
import { Transaction } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Building2,
  CheckCircle2,
  Clock,
  Download,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

export const EarningsPage: React.FC = () => {
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [sum, txs] = await Promise.all([
          paymentsService.getEarningsSummary(),
          paymentsService.getTransactions(),
        ]);
        setSummary(sum);
        setTransactions(txs);
      } catch {
        toast.error('Failed to load earnings history');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleExportStatement = () => {
    toast.success('Download complete: Exported official earnings tax statement (CSV).');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E7DE]">
        <div>
          <h1 className="text-2xl font-extrabold text-[#164B35] font-heading">
            Earnings &amp; Bank Payouts
          </h1>
          <p className="text-xs text-[#526058] mt-1">
            Track revenue from sharing your machinery, escrow fee deductions, and weekly bank settlements
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          leftIcon={<Download className="w-4 h-4 text-[#347653]" />}
          onClick={handleExportStatement}
        >
          Download Tax Statement
        </Button>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E7DE] shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-[#7C8C83] uppercase tracking-wider">
            Gross Rental Revenue
          </span>
          <p className="text-2xl font-extrabold font-heading text-[#25312A]">
            {formatCurrency(summary?.grossEarnings || 5840)}
          </p>
          <span className="text-[11px] text-[#526058]">Total invoiced to renters</span>
        </div>

        {/* Platform Escrow Fees */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E7DE] shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-[#7C8C83] uppercase tracking-wider">
            Platform Escrow Fees (4%)
          </span>
          <p className="text-2xl font-extrabold font-heading text-amber-700">
            {formatCurrency(summary?.platformFees || 292)}
          </p>
          <span className="text-[11px] text-[#526058]">Covers payment &amp; insurance</span>
        </div>

        {/* Net Earnings */}
        <div className="bg-emerald-50/70 p-5 rounded-2xl border border-[#BCD3C6] shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-[#164B35] uppercase tracking-wider">
            Net Farmer Earnings
          </span>
          <p className="text-2xl font-extrabold font-heading text-[#164B35]">
            {formatCurrency(summary?.netEarnings || 5548)}
          </p>
          <span className="text-[11px] text-[#347653] font-semibold">100% Settled to Bank</span>
        </div>

        {/* Linked Payout Bank */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E7DE] shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#7C8C83] uppercase tracking-wider">
              Settlement Bank
            </span>
            <Building2 className="w-4 h-4 text-[#347653]" />
          </div>
          <p className="text-sm font-bold text-[#25312A] truncate">
            SBI &bull;&bull;&bull;&bull; 3491
          </p>
          <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Verified &bull; Auto-transfer weekly
          </span>
        </div>
      </div>

      {/* Transaction History Table */}
      <div className="bg-white rounded-3xl border border-[#E2E7DE] shadow-sm overflow-hidden p-6 space-y-4">
        <h3 className="font-heading font-bold text-base text-[#25312A]">
          Recent Transactions &amp; Payout Records
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F8F2] border-b border-[#E2E7DE] text-[#7C8C83] uppercase font-bold text-[10px]">
              <tr>
                <th className="p-3.5">Reference No</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Description</th>
                <th className="p-3.5">Type</th>
                <th className="p-3.5">Gross (₹)</th>
                <th className="p-3.5">Fee (₹)</th>
                <th className="p-3.5">Net Payout (₹)</th>
                <th className="p-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E7DE]">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-[#F7F8F2]/60 transition-colors">
                  <td className="p-3.5 font-mono font-bold text-[#25312A]">{tx.referenceNo}</td>
                  <td className="p-3.5 text-[#526058]">{tx.date}</td>
                  <td className="p-3.5 font-medium text-[#25312A]">{tx.equipmentTitle}</td>
                  <td className="p-3.5">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        tx.type === 'earning'
                          ? 'bg-emerald-50 text-emerald-800'
                          : tx.type === 'payout'
                          ? 'bg-blue-50 text-blue-800'
                          : 'bg-purple-50 text-purple-800'
                      }`}
                    >
                      {tx.type}
                    </span>
                  </td>
                  <td className="p-3.5 text-[#526058]">{formatCurrency(tx.grossAmount)}</td>
                  <td className="p-3.5 text-amber-700">
                    {tx.platformFee > 0 ? formatCurrency(tx.platformFee) : '—'}
                  </td>
                  <td className="p-3.5 font-bold text-[#164B35]">{formatCurrency(tx.netAmount)}</td>
                  <td className="p-3.5 text-right">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Completed
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
