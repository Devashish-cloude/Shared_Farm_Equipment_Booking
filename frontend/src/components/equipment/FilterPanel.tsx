import React from 'react';
import { EquipmentCategory } from '../../types';
import { Button } from '../ui/Button';
import { Filter, RotateCcw, Check, Star } from 'lucide-react';

export interface FilterState {
  search: string;
  category: EquipmentCategory | 'All';
  minPrice: number;
  maxPrice: number;
  location: string;
  operatorAvailable: boolean;
  minRating: number;
  sortBy: 'relevance' | 'price_low' | 'price_high' | 'rating';
}

interface FilterPanelProps {
  filters: FilterState;
  onChange: (updated: FilterState) => void;
  onReset: () => void;
  isMobileDrawer?: boolean;
  onCloseMobile?: () => void;
}

const CATEGORIES: (EquipmentCategory | 'All')[] = [
  'All',
  'Tractors',
  'Harvesters',
  'Rotavators',
  'Seed Drills',
  'Sprayers',
  'Cultivators',
  'Threshers',
  'Ploughs',
];

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onChange,
  onReset,
  isMobileDrawer = false,
  onCloseMobile,
}) => {
  return (
    <div className={`space-y-6 ${isMobileDrawer ? 'p-4' : 'bg-white p-5 rounded-2xl border border-[#E2E7DE] shadow-sm'}`}>
      <div className="flex items-center justify-between pb-3 border-b border-[#E2E7DE]">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#164B35]" />
          <h3 className="font-heading font-bold text-sm text-[#25312A]">Filters</h3>
        </div>
        <button
          onClick={onReset}
          className="text-xs font-semibold text-[#526058] hover:text-[#164B35] flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Reset All
        </button>
      </div>

      {/* Category Filter */}
      <div>
        <label className="block text-xs font-bold text-[#25312A] uppercase tracking-wider mb-2.5">
          Equipment Category
        </label>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => {
            const isSelected = filters.category === cat;
            return (
              <button
                key={cat}
                onClick={() => onChange({ ...filters, category: cat })}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-[#164B35] text-white shadow-xs'
                    : 'bg-[#F7F8F2] text-[#25312A] hover:bg-[#EFF2EB] border border-[#E2E7DE]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <label className="block text-xs font-bold text-[#25312A] uppercase tracking-wider mb-2.5">
          Max Hourly Rate: ₹{filters.maxPrice === 0 ? 'Any' : filters.maxPrice}/hr
        </label>
        <input
          type="range"
          min="200"
          max="3000"
          step="100"
          value={filters.maxPrice || 3000}
          onChange={(e) => onChange({ ...filters, maxPrice: Number(e.target.value) })}
          className="w-full accent-[#164B35] cursor-pointer"
        />
        <div className="flex justify-between text-[11px] text-[#7C8C83] mt-1">
          <span>₹200/hr</span>
          <span>₹1500/hr</span>
          <span>₹3000+/hr</span>
        </div>
      </div>

      {/* Operator Requirement */}
      <div>
        <label className="block text-xs font-bold text-[#25312A] uppercase tracking-wider mb-2.5">
          Driver &amp; Operator
        </label>
        <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-[#25312A] select-none">
          <input
            type="checkbox"
            checked={filters.operatorAvailable}
            onChange={(e) => onChange({ ...filters, operatorAvailable: e.target.checked })}
            className="w-4 h-4 rounded text-[#164B35] focus:ring-[#164B35] rounded-xs accent-[#164B35]"
          />
          <span>Trained Driver Available with Machine</span>
        </label>
      </div>

      {/* Minimum Rating */}
      <div>
        <label className="block text-xs font-bold text-[#25312A] uppercase tracking-wider mb-2.5">
          Minimum Rating
        </label>
        <div className="grid grid-cols-4 gap-2">
          {[0, 4.0, 4.5, 4.8].map((score) => {
            const isSelected = filters.minRating === score;
            return (
              <button
                key={score}
                onClick={() => onChange({ ...filters, minRating: score })}
                className={`flex items-center justify-center gap-1 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  isSelected
                    ? 'bg-[#F0F5F2] border-[#164B35] text-[#164B35]'
                    : 'bg-white border-[#E2E7DE] text-[#526058] hover:bg-[#F7F8F2]'
                }`}
              >
                {score === 0 ? (
                  <span>All</span>
                ) : (
                  <>
                    <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                    <span>{score}+</span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sorting */}
      <div>
        <label className="block text-xs font-bold text-[#25312A] uppercase tracking-wider mb-2">
          Sort Machinery By
        </label>
        <select
          value={filters.sortBy}
          onChange={(e) => onChange({ ...filters, sortBy: e.target.value as any })}
          className="w-full text-xs font-medium px-3 py-2.5 bg-[#F7F8F2] border border-[#CBD5C7] rounded-xl text-[#25312A] focus:outline-none focus:ring-2 focus:ring-[#164B35]"
        >
          <option value="relevance">Most Relevant / Featured</option>
          <option value="price_low">Price: Low to High</option>
          <option value="price_high">Price: High to Low</option>
          <option value="rating">Highest Farmer Rating</option>
        </select>
      </div>

      {isMobileDrawer && onCloseMobile && (
        <div className="pt-4 border-t border-[#E2E7DE]">
          <Button variant="primary" className="w-full" onClick={onCloseMobile}>
            Apply Filters
          </Button>
        </div>
      )}
    </div>
  );
};
