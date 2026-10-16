import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { equipmentService } from '../../services/equipment.service';
import { bookingsService } from '../../services/bookings.service';
import { mockStore } from '../../services/mockStore';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Equipment, Review } from '../../types';
import { RatingDisplay } from '../../components/ui/RatingDisplay';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { getAvatarUrl } from '../../lib/avatar';
import { PriceDisplay } from '../../components/ui/PriceDisplay';
import { Button } from '../../components/ui/Button';
import { formatCurrency, formatDate } from '../../lib/utils';
import { EquipmentCard } from '../../components/equipment/EquipmentCard';
import {
  MapPin,
  Calendar,
  Clock,
  ShieldCheck,
  Zap,
  Wrench,
  ChevronLeft,
  ArrowRight,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

export const EquipmentDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { t } = useLanguage();

  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [similarEquipment, setSimilarEquipment] = useState<Equipment[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Booking Form State
  const [rentalDate, setRentalDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [durationHours, setDurationHours] = useState(6);
  const [withOperator, setWithOperator] = useState(true);
  const [renterNotes, setRenterNotes] = useState('');
  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);

  useEffect(() => {
    const loadDetails = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const item = await equipmentService.getById(id);
        setEquipment(item);
        if (item) {
          const revs = mockStore.getReviewsForEquipment(item.id);
          setReviews(revs);

          const all = await equipmentService.getAll({ category: item.category });
          setSimilarEquipment(all.filter((e) => e.id !== item.id).slice(0, 3));
        }
      } catch (err: any) {
        toast.error(t('details.requestFailed', 'Failed to load equipment details'));
      } finally {
        setIsLoading(false);
      }
    };
    loadDetails();
  }, [id, t]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-[#526058]">
        <div className="w-8 h-8 border-3 border-[#164B35] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-semibold">{t('details.loading', 'Loading equipment details...')}</p>
      </div>
    );
  }

  if (!equipment) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-2xl font-bold font-heading text-[#164B35]">
          {t('details.notFound', 'Equipment Not Found')}
        </h2>
        <p className="text-sm text-[#526058]">
          {t('details.notFoundDesc', 'This listing may have been unlisted or removed.')}
        </p>
        <Link to="/equipment">
          <Button variant="primary">{t('details.browse', 'Browse Marketplace')}</Button>
        </Link>
      </div>
    );
  }

  // Transparent Dynamic Price Calculation
  const basePrice = equipment.pricePerHour * durationHours;
  const operatorPrice = withOperator ? (equipment.operatorCostPerHour || 100) * durationHours : 0;
  const platformFee = Math.round((basePrice + operatorPrice) * 0.04); // 4% fair platform escrow fee
  const securityDeposit = equipment.securityDeposit || 1500;
  const totalDue = basePrice + operatorPrice + platformFee + securityDeposit;

  const handleBookingRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.info(t('details.needLogin', 'Please sign in or create a farmer account to book equipment'));
      navigate('/login', { state: { from: { pathname: `/equipment/${equipment.id}` } } });
      return;
    }

    if (user?.id === equipment.ownerId) {
      toast.error(t('details.ownListing', 'You are the owner of this equipment listing!'));
      return;
    }

    setIsBookingSubmitting(true);
    try {
      const startDateTime = new Date(`${rentalDate}T08:00:00Z`);
      const endDateTime = new Date(startDateTime.getTime() + durationHours * 3600 * 1000);

      const newBooking = await bookingsService.createBooking({
        equipmentId: equipment.id,
        equipmentName: equipment.title,
        equipmentCategory: equipment.category,
        equipmentImage: equipment.images[0],
        renterId: user!.id,
        renterName: user!.name,
        renterPhone: user!.phone,
        renterVillage: `${user!.location.village}, ${user!.location.district}`,
        ownerId: equipment.ownerId,
        ownerName: equipment.ownerName,
        ownerPhone: equipment.ownerPhone || '+91 98000 00000',
        startDate: startDateTime.toISOString(),
        endDate: endDateTime.toISOString(),
        durationHours,
        withOperator,
        basePrice,
        operatorPrice,
        platformFee,
        securityDeposit,
        totalPrice: totalDue,
        renterNotes,
      });

      toast.success(t('details.requestSuccess', 'Booking requested! Proceeding to summary & test checkout.'));
      navigate(`/booking/${newBooking.id}`);
    } catch (err: any) {
      toast.error(err.message || t('details.requestFailed', 'Failed to submit booking request'));
    } finally {
      setIsBookingSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Back button & category crumbs */}
      <div className="flex items-center justify-between text-xs text-[#526058]">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 font-bold text-[#164B35] hover:underline"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{t('details.back', 'Back to Marketplace')}</span>
        </button>
        <span>
          {equipment.category} &bull; {equipment.make} &bull; {equipment.model}
        </span>
      </div>

      {/* Main Grid: Gallery & Info (Left 7) + Booking Card (Right 5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Column */}
        <div className="lg:col-span-7 space-y-8">
          {/* Photo Gallery */}
          <div className="space-y-3">
            <div className="w-full h-80 sm:h-96 rounded-3xl overflow-hidden bg-[#F0F5F2] border border-[#E2E7DE] shadow-sm relative">
              <img
                src={equipment.images[activeImageIndex] || equipment.images[0]}
                alt={equipment.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4">
                <StatusBadge status={equipment.status} />
              </div>
            </div>

            {/* Thumbnail selector */}
            {equipment.images.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-1">
                {equipment.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-20 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                      activeImageIndex === idx
                        ? 'border-[#164B35] ring-2 ring-[#B8D96B]'
                        : 'border-[#CBD5C7] opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="Thumbnail" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Title, Rating & Quick Badges */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold text-[#347653] uppercase tracking-wider">
                {equipment.category} &bull; {equipment.year}
              </span>
              <RatingDisplay rating={equipment.rating} reviewCount={equipment.reviewCount} size="md" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#164B35] font-heading">
              {equipment.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-[#526058] pt-1">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#347653]" />
                <span>
                  {equipment.location.village}, {equipment.location.district}, {equipment.location.state}{' '}
                  {t('details.approxArea', '(Approximate area)')}
                </span>
              </div>
              {equipment.powerHp && (
                <div className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-600" />
                  <span>{equipment.powerHp} {t('details.power', 'HP Power')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="bg-white p-6 rounded-2xl border border-[#E2E7DE] shadow-sm space-y-3">
            <h3 className="font-heading font-bold text-base text-[#25312A]">
              {t('details.about', 'About This Machinery')}
            </h3>
            <p className="text-xs sm:text-sm text-[#526058] leading-relaxed whitespace-pre-line">
              {equipment.description}
            </p>
          </div>

          {/* Specifications Table */}
          <div className="bg-white p-6 rounded-2xl border border-[#E2E7DE] shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#E2E7DE]">
              <Wrench className="w-4 h-4 text-[#347653]" />
              <h3 className="font-heading font-bold text-base text-[#25312A]">
                {t('details.specs', 'Technical Specifications')}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex justify-between py-2 border-b border-[#F0F5F2]">
                <span className="text-[#7C8C83]">Make / Brand:</span>
                <span className="font-semibold text-[#25312A]">{equipment.make}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#F0F5F2]">
                <span className="text-[#7C8C83]">Model:</span>
                <span className="font-semibold text-[#25312A]">{equipment.model}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#F0F5F2]">
                <span className="text-[#7C8C83]">Condition:</span>
                <span className="font-semibold text-[#164B35]">{equipment.condition}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#F0F5F2]">
                <span className="text-[#7C8C83]">{t('details.minDuration', 'Minimum Rental Duration')}:</span>
                <span className="font-semibold text-[#25312A]">{equipment.minRentalHours} {t('details.hours', 'Hours')}</span>
              </div>

              {Object.entries(equipment.specifications || {}).map(([key, val]) => (
                <div key={key} className="flex justify-between py-2 border-b border-[#F0F5F2]">
                  <span className="text-[#7C8C83]">{key}:</span>
                  <span className="font-semibold text-[#25312A]">{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Verified Provider Card */}
          <div className="bg-[#F0F5F2] p-6 rounded-2xl border border-[#BCD3C6] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={getAvatarUrl(equipment.ownerAvatar, equipment.ownerName)}
                  alt={equipment.ownerName}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-[#B8D96B]"
                />
                <div>
                  <h4 className="font-heading font-bold text-sm text-[#25312A] flex items-center gap-1.5">
                    <span>{equipment.ownerName}</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#B8D96B]/30 text-[#164B35] text-[10px] font-bold">
                      <ShieldCheck className="w-3 h-3 text-[#164B35]" />
                      {t('details.verified', 'Verified')}
                    </span>
                  </h4>
                  <p className="text-xs text-[#526058]">
                    {equipment.location.village}, {equipment.location.district} &bull; {t('details.memberSince', 'Member since 2024')}
                  </p>
                </div>
              </div>
              <RatingDisplay rating={equipment.ownerRating} size="sm" />
            </div>

            <div className="text-xs text-[#526058] flex items-center gap-4 pt-2 border-t border-[#CBD5C7]">
              <span>&bull; {equipment.completedRentalsCount} {t('details.successfulRentals', 'Successful Rentals')}</span>
              <span>&bull; {t('details.responseTime', 'Response time: under 1 hr')}</span>
            </div>
          </div>

          {/* Ratings & Reviews List */}
          <div className="bg-white p-6 rounded-2xl border border-[#E2E7DE] shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E7DE]">
              <h3 className="font-heading font-bold text-base text-[#25312A]">
                {t('details.farmerReviews', 'Farmer Reviews')} ({reviews.length})
              </h3>
              <RatingDisplay rating={equipment.rating} size="sm" />
            </div>

            {reviews.length === 0 ? (
              <p className="text-xs text-[#7C8C83] py-4 text-center">
                {t('details.noReviews', 'No reviews yet for this listing. Be the first farmer to rent and review!')}
              </p>
            ) : (
              <div className="space-y-4">
                {reviews.map((rev) => (
                  <div key={rev.id} className="pb-4 border-b border-[#F0F5F2] last:border-none space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src={getAvatarUrl(rev.reviewerAvatar, rev.reviewerName)}
                          alt={rev.reviewerName}
                          className="w-7 h-7 rounded-full object-cover"
                        />
                        <span className="text-xs font-bold text-[#25312A]">{rev.reviewerName}</span>
                        {rev.verifiedRental && (
                          <span className="text-[10px] text-[#347653] font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                            {t('details.verifiedRental', 'Verified Rental')}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#7C8C83]">{formatDate(rev.createdAt)}</span>
                    </div>
                    <RatingDisplay rating={rev.rating} size="sm" />
                    <p className="text-xs text-[#526058] leading-relaxed">{rev.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Interactive Booking Calculator Card (Sticky) */}
        <div className="lg:col-span-5 sticky top-28">
          <div className="bg-white p-6 sm:p-7 rounded-3xl border-2 border-[#164B35]/20 shadow-xl space-y-5">
            {/* Rates Header */}
            <div className="flex items-baseline justify-between pb-4 border-b border-[#E2E7DE]">
              <div>
                <PriceDisplay
                  pricePerHour={equipment.pricePerHour}
                  pricePerDay={equipment.pricePerDay}
                  size="xl"
                  showBoth
                />
              </div>
              <StatusBadge status={equipment.status} />
            </div>

            {/* Form */}
            <form onSubmit={handleBookingRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#25312A] mb-1.5">
                  {t('details.rentalDate', 'Rental Date *')}
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-[#347653] absolute left-3 top-3" />
                  <input
                    type="date"
                    required
                    value={rentalDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setRentalDate(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-[#CBD5C7] focus:outline-none focus:ring-2 focus:ring-[#164B35] bg-[#F7F8F2] font-semibold text-[#25312A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#25312A] mb-1.5">
                  {t('details.estDuration', 'Estimated Work Duration (Hours) *')}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[4, 6, 8, 12].map((hrs) => (
                    <button
                      type="button"
                      key={hrs}
                      onClick={() => setDurationHours(hrs)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        durationHours === hrs
                          ? 'bg-[#164B35] text-white border-[#164B35] shadow-xs'
                          : 'bg-[#F7F8F2] text-[#25312A] border-[#CBD5C7] hover:bg-[#EFF2EB]'
                      }`}
                    >
                      {hrs} {t('details.hours', 'hrs')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Driver Option */}
              {equipment.operatorAvailable && (
                <div className="p-3 bg-[#F0F5F2] rounded-xl border border-[#BCD3C6]">
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs font-bold text-[#25312A]">
                    <input
                      type="checkbox"
                      checked={withOperator}
                      onChange={(e) => setWithOperator(e.target.checked)}
                      className="w-4 h-4 rounded text-[#164B35] mt-0.5 accent-[#164B35]"
                    />
                    <div>
                      <span>
                        {t('details.driverOption', 'Include Trained Machine Driver')} (+₹{equipment.operatorCostPerHour || 100}/hr)
                      </span>
                      <p className="text-[11px] text-[#526058] font-normal mt-0.5">
                        {t('details.driverDesc', 'Recommended: Owner driver handles diesel efficiency and field maneuvers.')}
                      </p>
                    </div>
                  </label>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#25312A] mb-1.5">
                  {t('details.fieldNotes', 'Field Notes & Crop Requirements')}
                </label>
                <textarea
                  value={renterNotes}
                  onChange={(e) => setRenterNotes(e.target.value)}
                  placeholder={t('details.fieldNotesPlaceholder', 'Mention field parcel location, soil dryness, or any specific hookup needed...')}
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-xl border border-[#CBD5C7] bg-[#F7F8F2]/60 focus:outline-none focus:ring-2 focus:ring-[#164B35] text-[#25312A]"
                />
              </div>

              {/* Price Breakdown */}
              <div className="pt-3 border-t border-[#E2E7DE] space-y-2 text-xs">
                <div className="flex justify-between text-[#526058]">
                  <span>{t('details.machineRental', 'Machine Rental')} ({durationHours} hrs &times; ₹{equipment.pricePerHour}):</span>
                  <span>{formatCurrency(basePrice)}</span>
                </div>
                {withOperator && (
                  <div className="flex justify-between text-[#526058]">
                    <span>{t('details.driverFee', 'Driver Fee')} ({durationHours} hrs &times; ₹{equipment.operatorCostPerHour || 100}):</span>
                    <span>{formatCurrency(operatorPrice)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#526058]">
                  <span>{t('details.escrowFee', 'Escrow Platform Fee (4%)')}:</span>
                  <span>{formatCurrency(platformFee)}</span>
                </div>
                <div className="flex justify-between text-[#526058]">
                  <span className="flex items-center gap-1">
                    {t('details.securityDeposit', 'Refundable Security Deposit')}:
                    <span title={t('details.depositTooltip', 'Returned upon equipment inspection')}>
                      <Info className="w-3 h-3 text-[#7C8C83]" />
                    </span>
                  </span>
                  <span>{formatCurrency(securityDeposit)}</span>
                </div>

                <div className="pt-2 border-t border-[#E2E7DE] flex justify-between text-sm font-extrabold text-[#164B35]">
                  <span>{t('details.estTotal', 'Estimated Total:')}</span>
                  <span>{formatCurrency(totalDue)}</span>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-2"
                isLoading={isBookingSubmitting}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                {t('details.requestBtn', 'Request Rental Booking')}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Similar Equipment Section */}
      {similarEquipment.length > 0 && (
        <div className="pt-10 border-t border-[#E2E7DE] space-y-6">
          <h3 className="text-xl font-bold font-heading text-[#164B35]">
            Similar Machinery in {equipment.category}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {similarEquipment.map((item) => (
              <EquipmentCard key={item.id} equipment={item} layout="grid" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
