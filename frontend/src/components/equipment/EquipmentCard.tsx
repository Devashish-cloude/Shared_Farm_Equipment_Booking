import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Equipment } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { RatingDisplay } from '../ui/RatingDisplay';
import { PriceDisplay } from '../ui/PriceDisplay';
import { Button } from '../ui/Button';
import { useLanguage } from '../../context/LanguageContext';
import { MapPin, UserCheck, Zap, ArrowRight, ShieldCheck } from 'lucide-react';

interface EquipmentCardProps {
  equipment: Equipment;
  layout?: 'grid' | 'list';
}

export const EquipmentCard: React.FC<EquipmentCardProps> = ({ equipment, layout = 'grid' }) => {
  const { t } = useLanguage();
  const [imgError, setImgError] = useState(false);

  const fallbackImage = 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=600&auto=format&fit=crop&q=70';

  const getOptimizedImageUrl = (url?: string) => {
    if (!url) return fallbackImage;
    if (url.includes('images.unsplash.com') && url.includes('w=')) {
      return url.replace(/w=\d+/, 'w=600').replace(/q=\d+/, 'q=70');
    }
    return url;
  };

  if (layout === 'list') {
    return (
      <div className="bg-white rounded-2xl border border-[#E2E7DE] hover:border-[#347653] p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row gap-5 group">
        {/* Image */}
        <div className="w-full sm:w-56 h-48 sm:h-auto rounded-xl overflow-hidden shrink-0 relative bg-[#F0F5F2]">
          <img
            src={imgError || !equipment.images[0] ? fallbackImage : getOptimizedImageUrl(equipment.images[0])}
            alt={equipment.title}
            onError={() => setImgError(true)}
            loading="lazy"
            decoding="async"
            width={400}
            height={240}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-2.5 left-2.5">
            <StatusBadge status={equipment.status} />
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <span className="text-xs font-bold text-[#347653] uppercase tracking-wider">
                {equipment.category} &bull; {equipment.make} {equipment.model}
              </span>
              <RatingDisplay rating={equipment.rating} reviewCount={equipment.reviewCount} size="sm" />
            </div>

            <Link to={`/equipment/${equipment.id}`}>
              <h3 className="text-lg font-bold text-[#25312A] group-hover:text-[#164B35] transition-colors font-heading mb-2">
                {equipment.title}
              </h3>
            </Link>

            <p className="text-xs text-[#526058] line-clamp-2 mb-3">
              {equipment.description}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-[#526058]">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#347653]" />
                <span>
                  {equipment.location.village}, {equipment.location.district}
                </span>
              </div>
              {equipment.powerHp && (
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  <span>{equipment.powerHp} HP</span>
                </div>
              )}
              {equipment.operatorAvailable && (
                <div className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                  <UserCheck className="w-3 h-3" />
                  <span>{t('feat.withDriver')}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#E2E7DE] flex flex-wrap items-center justify-between gap-3">
            <PriceDisplay
              pricePerHour={equipment.pricePerHour}
              pricePerDay={equipment.pricePerDay}
              showBoth
              size="md"
            />

            <Link to={`/equipment/${equipment.id}`}>
              <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                {t('feat.details')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Grid layout
  return (
    <div className="bg-white rounded-2xl border border-[#E2E7DE] hover:border-[#347653] overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group">
      {/* Card Header Image */}
      <div className="w-full h-48 relative overflow-hidden bg-[#F0F5F2]">
        <img
          src={imgError || !equipment.images[0] ? fallbackImage : getOptimizedImageUrl(equipment.images[0])}
          alt={equipment.title}
          onError={() => setImgError(true)}
          loading="lazy"
          decoding="async"
          width={400}
          height={240}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-3 left-3">
          <StatusBadge status={equipment.status} />
        </div>
        {equipment.isFeatured && (
          <div className="absolute top-3 right-3 bg-[#164B35]/90 text-[#B8D96B] text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full backdrop-blur-xs flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            Featured
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-bold text-[#347653] uppercase tracking-wider text-[11px]">
              {equipment.category}
            </span>
            <RatingDisplay rating={equipment.rating} reviewCount={equipment.reviewCount} size="sm" />
          </div>

          <Link to={`/equipment/${equipment.id}`}>
            <h3 className="font-heading font-bold text-base text-[#25312A] group-hover:text-[#164B35] transition-colors line-clamp-1">
              {equipment.title}
            </h3>
          </Link>

          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-[#526058]">
            <MapPin className="w-3.5 h-3.5 text-[#347653] shrink-0" />
            <span className="truncate">
              {equipment.location.village}, {equipment.location.district}
            </span>
          </div>

          {/* Owner pill */}
          <div className="mt-3 pt-3 border-t border-[#E2E7DE]/70 flex items-center justify-between text-xs text-[#526058]">
            <div className="flex items-center gap-2">
              <img
                src={equipment.ownerAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80'}
                alt={equipment.ownerName}
                className="w-5 h-5 rounded-full object-cover ring-1 ring-[#CBD5C7]"
              />
              <span className="truncate font-medium">{equipment.ownerName}</span>
            </div>
            {equipment.operatorAvailable && (
              <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                +{t('feat.withDriver')}
              </span>
            )}
          </div>
        </div>

        {/* Card Footer */}
        <div className="pt-3 border-t border-[#E2E7DE] flex items-center justify-between">
          <PriceDisplay
            pricePerHour={equipment.pricePerHour}
            pricePerDay={equipment.pricePerDay}
            size="md"
          />

          <Link to={`/equipment/${equipment.id}`}>
            <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              {t('feat.details')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
