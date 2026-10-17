import React from 'react';
import { Equipment } from '../../types';
import { GoogleEquipmentMap } from '../maps/GoogleEquipmentMap';

export interface EquipmentMapProps {
  equipmentList: Equipment[];
  center?: [number, number];
  zoom?: number;
  highlightedId?: string;
}

/**
 * EquipmentMap: Unified intelligent map component for agricultural machinery.
 * Automatically leverages Google Maps (Satellite, Terrain, InfoWindows, Markers)
 * with a zero-downtime, instantaneous fallback to Leaflet / OpenStreetMap.
 */
export const EquipmentMap: React.FC<EquipmentMapProps> = (props) => {
  return <GoogleEquipmentMap {...props} />;
};
