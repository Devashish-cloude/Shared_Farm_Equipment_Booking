import React, { useState } from 'react';
import { mockStore } from '../../services/mockStore';
import { Equipment } from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { formatCurrency } from '../../lib/utils';
import {
  ShieldAlert,
  Users,
  Tractor,
  KeyRound,
  CheckCircle,
  AlertTriangle,
  FileCheck2,
  Lock,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

export const AdminDashboardPage: React.FC = () => {
  const [equipmentList, setEquipmentList] = useState<Equipment[]>(mockStore.getEquipmentList());

  const handleVerifyEquipment = (id: string) => {
    toast.success(`Equipment listing #${id} marked as inspected and verified.`);
  };

  return (
    <div className="space-y-6">
      {/* Admin Authorization Notice */}
      <div className="bg-purple-50 border border-purple-200 p-4 rounded-2xl flex items-start gap-3 text-purple-900">
        <Lock className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold">ADMIN CONSOLE (BACKEND AUTHORIZED PREVIEW)</p>
          <p className="text-purple-800 leading-relaxed">
            This module provides the administrative operational dashboard for platform moderators and agricultural verification officers. In production, access is strictly guarded by backend role verification.
          </p>
        </div>
      </div>

      <div className="pb-4 border-b border-[#E2E7DE]">
        <h1 className="text-2xl font-extrabold text-[#164B35] font-heading">
          Platform Administration &amp; Moderation
        </h1>
        <p className="text-xs text-[#526058] mt-1">
          Oversee equipment listings, farmer verification queues, and dispute resolution
        </p>
      </div>

      {/* 4 Admin Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E2E7DE] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-[#7C8C83]">
            <span>Verified Farmers</span>
            <Users className="w-4 h-4 text-[#347653]" />
          </div>
          <p className="text-2xl font-extrabold font-heading text-[#25312A]">1,280</p>
          <span className="text-[11px] text-emerald-700 font-semibold">+42 this week</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E2E7DE] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-[#7C8C83]">
            <span>Active Machinery</span>
            <Tractor className="w-4 h-4 text-[#347653]" />
          </div>
          <p className="text-2xl font-extrabold font-heading text-[#25312A]">{equipmentList.length}</p>
          <span className="text-[11px] text-[#526058]">Across 8 categories</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E2E7DE] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-[#7C8C83]">
            <span>Completed Rentals</span>
            <KeyRound className="w-4 h-4 text-[#347653]" />
          </div>
          <p className="text-2xl font-extrabold font-heading text-[#25312A]">3,412</p>
          <span className="text-[11px] text-[#526058]">₹28.4 Lakhs Escrow Volume</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E2E7DE] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-[#7C8C83]">
            <span>Pending Complaints</span>
            <AlertTriangle className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold font-heading text-emerald-700">0</p>
          <span className="text-[11px] text-emerald-700 font-semibold">All disputes resolved</span>
        </div>
      </div>

      {/* Equipment Listings Moderation Table */}
      <div className="bg-white rounded-3xl border border-[#E2E7DE] shadow-sm overflow-hidden p-6 space-y-4">
        <h3 className="font-heading font-bold text-base text-[#25312A]">
          Machinery Listings Moderation Queue
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F8F2] border-b border-[#E2E7DE] text-[#7C8C83] uppercase font-bold text-[10px]">
              <tr>
                <th className="p-3.5">Listing Title</th>
                <th className="p-3.5">Owner / Farmer</th>
                <th className="p-3.5">Village &amp; District</th>
                <th className="p-3.5">Rate</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Moderation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E7DE]">
              {equipmentList.map((eq) => (
                <tr key={eq.id} className="hover:bg-[#F7F8F2]/60">
                  <td className="p-3.5 font-bold text-[#25312A]">{eq.title}</td>
                  <td className="p-3.5 text-[#526058]">{eq.ownerName}</td>
                  <td className="p-3.5 text-[#526058]">
                    {eq.location.village}, {eq.location.district}
                  </td>
                  <td className="p-3.5 font-bold text-[#164B35]">₹{eq.pricePerHour}/hr</td>
                  <td className="p-3.5">
                    <StatusBadge status={eq.status} showIcon={false} className="text-[10px]" />
                  </td>
                  <td className="p-3.5 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleVerifyEquipment(eq.id)}
                    >
                      Verify Listing
                    </Button>
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
