import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Equipment } from '../../types';
import { PriceDisplay } from '../ui/PriceDisplay';
import { StatusBadge } from '../ui/StatusBadge';
import { Link } from 'react-router-dom';
import { ArrowRight, MapPin } from 'lucide-react';
import { resolveEquipmentImage } from '../../lib/equipmentImages';

interface EquipmentMapProps {
  equipmentList: Equipment[];
  center?: [number, number];
  zoom?: number;
  highlightedId?: string;
}

// Custom Leaflet DivIcon for agronomic pins
const createCustomPin = (price: number, isHighlighted: boolean) => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        background: ${isHighlighted ? '#164B35' : '#347653'};
        color: white;
        padding: 4px 8px;
        border-radius: 9999px;
        font-size: 11px;
        font-weight: 700;
        box-shadow: 0 4px 12px rgba(22, 75, 53, 0.35);
        border: 2px solid ${isHighlighted ? '#B8D96B' : 'white'};
        display: flex;
        align-items: center;
        gap: 3px;
        white-space: nowrap;
        transform: translate(-50%, -100%);
      ">
        <span>₹${price}/hr</span>
      </div>
    `,
    iconSize: [60, 30],
    iconAnchor: [30, 30],
  });
};

export const EquipmentMap: React.FC<EquipmentMapProps> = ({
  equipmentList,
  center = [22.5645, 72.9289], // Default near Anand, Gujarat agricultural hub
  zoom = 12,
  highlightedId,
}) => {
  return (
    <div className="w-full h-full min-h-[450px] rounded-2xl overflow-hidden border border-[#E2E7DE] shadow-sm relative bg-[#F0F5F2]">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {equipmentList.map((eq) => {
          const coords = eq.location.approximateCoordinates;
          if (!coords || coords.length !== 2) return null;

          const isHighlighted = eq.id === highlightedId;
          const icon = createCustomPin(eq.pricePerHour, isHighlighted);

          return (
            <Marker key={eq.id} position={coords} icon={icon}>
              <Popup className="custom-equipment-popup">
                <div className="p-1 max-w-[220px]">
                  <img
                    src={resolveEquipmentImage(eq.images, null, eq.category)}
                    alt={eq.title}
                    className="w-full h-24 object-cover rounded-lg mb-2"
                  />
                  <div className="mb-1">
                    <StatusBadge status={eq.status} showIcon={false} className="text-[10px] py-0.5 px-2" />
                  </div>
                  <h4 className="font-heading font-bold text-xs text-[#25312A] line-clamp-1 mb-1">
                    {eq.title}
                  </h4>
                  <div className="flex items-center gap-1 text-[11px] text-[#526058] mb-2">
                    <MapPin className="w-3 h-3 text-[#347653]" />
                    <span>{eq.location.village} (Approx.)</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-[#E2E7DE] pt-2">
                    <PriceDisplay pricePerHour={eq.pricePerHour} size="sm" />
                    <Link
                      to={`/equipment/${eq.id}`}
                      className="text-xs font-bold text-[#164B35] hover:text-[#347653] flex items-center gap-1"
                    >
                      View
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Approximate location notice */}
      <div className="absolute bottom-3 left-3 z-[400] bg-white/90 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-[#E2E7DE] text-[10px] text-[#526058] shadow-xs">
        &bull; Exact coordinates are masked for privacy until booking is confirmed.
      </div>
    </div>
  );
};
