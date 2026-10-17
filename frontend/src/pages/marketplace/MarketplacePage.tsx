import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { equipmentService, EquipmentFilterParams } from '../../services/equipment.service';
import { Equipment, EquipmentCategory } from '../../types';
import { EquipmentCard } from '../../components/equipment/EquipmentCard';
import { FilterPanel, FilterState } from '../../components/equipment/FilterPanel';
import { EquipmentMap } from '../../components/equipment/EquipmentMap';
import { LocationAutocompleteInput } from '../../components/ui/LocationAutocompleteInput';
import { EquipmentCardSkeleton } from '../../components/ui/LoadingSkeleton';

import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Button } from '../../components/ui/Button';
import { useLanguage } from '../../context/LanguageContext';
import {
  Search,
  MapPin,
  LayoutGrid,
  List,
  Map as MapIcon,
  SlidersHorizontal,
  X,
  Tractor
} from 'lucide-react';

export const MarketplacePage: React.FC = () => {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read initial query params from hero search
  const initialCategory = (searchParams.get('category') as EquipmentCategory) || 'All';
  const initialLocation = searchParams.get('location') || '';

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category: initialCategory,
    minPrice: 0,
    maxPrice: 3000,
    location: initialLocation,
    operatorAvailable: false,
    minRating: 0,
    sortBy: 'relevance',
  });

  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');
  const [viewMode, setViewMode] = useState<'listings' | 'map'>('listings');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const fetchEquipment = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await equipmentService.getAll({
        search: filters.search,
        category: filters.category,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        location: filters.location,
        operatorAvailable: filters.operatorAvailable,
        minRating: filters.minRating,
        sortBy: filters.sortBy,
      });
      setEquipmentList(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load equipment catalog');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipment();
  }, [filters]);

  const handleResetFilters = () => {
    setFilters({
      search: '',
      category: 'All',
      minPrice: 0,
      maxPrice: 3000,
      location: '',
      operatorAvailable: false,
      minRating: 0,
      sortBy: 'relevance',
    });
    setSearchParams({});
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header bar with search input */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#E2E7DE] shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#164B35] font-heading">
              {t('nav.explore')}
            </h1>
            <p className="text-xs text-[#526058] mt-1">
              {t('feat.subtitle')}
            </p>
          </div>

          {/* View switches */}
          <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
            {/* Map vs List View toggle */}
            <div className="flex items-center bg-[#F7F8F2] p-1 rounded-xl border border-[#E2E7DE]">
              <button
                onClick={() => setViewMode('listings')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'listings'
                    ? 'bg-white text-[#164B35] shadow-xs'
                    : 'text-[#526058] hover:text-[#164B35]'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Listings</span>
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'map'
                    ? 'bg-white text-[#164B35] shadow-xs'
                    : 'text-[#526058] hover:text-[#164B35]'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span>Map View</span>
              </button>
            </div>

            {/* Grid vs List layout toggle (when in listings view) */}
            {viewMode === 'listings' && (
              <div className="hidden sm:flex items-center bg-[#F7F8F2] p-1 rounded-xl border border-[#E2E7DE]">
                <button
                  onClick={() => setLayoutMode('grid')}
                  className={`p-1.5 rounded-lg text-xs transition-all ${
                    layoutMode === 'grid'
                      ? 'bg-white text-[#164B35] shadow-xs'
                      : 'text-[#526058] hover:text-[#164B35]'
                  }`}
                  title="Grid layout"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setLayoutMode('list')}
                  className={`p-1.5 rounded-lg text-xs transition-all ${
                    layoutMode === 'list'
                      ? 'bg-white text-[#164B35] shadow-xs'
                      : 'text-[#526058] hover:text-[#164B35]'
                  }`}
                  title="Row layout"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Mobile Filter Trigger Button */}
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden flex items-center gap-1.5"
              onClick={() => setMobileFilterOpen(true)}
            >
              <SlidersHorizontal className="w-4 h-4 text-[#347653]" />
              <span>{t('common.filters')}</span>
            </Button>
          </div>
        </div>

        {/* Search row */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-[#E2E7DE]">
          <div className="sm:col-span-8 relative">
            <Search className="w-4 h-4 text-[#7C8C83] absolute left-3 top-3.5" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search by equipment model (Mahindra 575, John Deere, Shaktiman rotavator)..."
              className="w-full text-xs pl-9 pr-3 py-3 rounded-xl border border-[#CBD5C7] bg-[#F7F8F2]/60 text-[#25312A] focus:outline-none focus:ring-2 focus:ring-[#164B35]"
            />
          </div>

          <div className="sm:col-span-4">
            <LocationAutocompleteInput
              value={filters.location}
              onChange={(val) => setFilters({ ...filters, location: val })}
              placeholder="Filter by Village or District..."
              className="py-3"
            />
          </div>
        </div>
      </div>


      {/* Main Content: Left Filter Panel (Desktop) + Right Results */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Desktop Filter Panel */}
        <div className="hidden lg:block lg:col-span-1 sticky top-28">
          <FilterPanel
            filters={filters}
            onChange={(updated) => setFilters(updated)}
            onReset={handleResetFilters}
          />
        </div>

        {/* Results Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Active status bar */}
          <div className="flex items-center justify-between text-xs text-[#526058] px-1">
            <span>
              Showing <strong>{equipmentList.length}</strong> available machinery listings
            </span>
            {filters.category !== 'All' && (
              <span className="bg-[#F0F5F2] text-[#164B35] px-2.5 py-1 rounded-full font-bold">
                Category: {filters.category}
              </span>
            )}
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <EquipmentCardSkeleton key={n} />
              ))}
            </div>
          )}

          {/* Error state */}
          {!isLoading && error && (
            <ErrorState
              title="Catalog Unavailable"
              message={error}
              onRetry={fetchEquipment}
            />
          )}

          {/* Empty state */}
          {!isLoading && !error && equipmentList.length === 0 && (
            <EmptyState
              icon={Tractor}
              title="No Machinery Found"
              description="No equipment matched your active search and filter criteria. Try expanding the price range or resetting filters."
              actionText="Reset All Filters"
              onAction={handleResetFilters}
            />
          )}

          {/* MAP VIEW */}
          {!isLoading && !error && viewMode === 'map' && equipmentList.length > 0 && (
            <div className="h-[600px] w-full">
              <EquipmentMap equipmentList={equipmentList} />
            </div>
          )}

          {/* LISTINGS VIEW */}
          {!isLoading && !error && viewMode === 'listings' && equipmentList.length > 0 && (
            <div
              className={
                layoutMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
                  : 'space-y-4'
              }
            >
              {equipmentList.map((eq) => (
                <EquipmentCard key={eq.id} equipment={eq} layout={layoutMode} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filter Drawer Overlay */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setMobileFilterOpen(false)}
          />
          <div className="relative z-10 w-80 max-w-[85vw] h-full bg-white ml-auto overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-[#E2E7DE] flex items-center justify-between">
              <h3 className="font-heading font-bold text-base text-[#25312A]">Filters</h3>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="p-1 rounded-lg text-[#526058] hover:bg-[#EFF2EB]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <FilterPanel
              filters={filters}
              onChange={(updated) => setFilters(updated)}
              onReset={handleResetFilters}
              isMobileDrawer
              onCloseMobile={() => setMobileFilterOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
