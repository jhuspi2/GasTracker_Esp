/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Polyline } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { GasStation, FuelType } from '../types';

// Fix for default marker icons in Leaflet with Vite/Webpack
import 'leaflet/dist/leaflet.css';
// @ts-ignore
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
// @ts-ignore
import markerIcon from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface MapProps {
  center: [number, number];
  zoom: number;
  stations: GasStation[];
  userLocation?: [number, number] | null;
  selectedFuel: FuelType;
  isDarkMode: boolean;
  routePath?: [number, number][] | null;
  onStationSelect: (station: GasStation) => void;
  onBoundsChange: (bounds: L.LatLngBounds) => void;
  lastCenterRequest?: number;
}

function MapUpdater({ center, zoom, lastCenterRequest }: { center: [number, number], zoom: number, lastCenterRequest?: number }) {
  const map = useMap();
  const lastAppliedCenter = React.useRef<[number, number] | null>(null);
  const lastAppliedZoom = React.useRef<number | null>(null);
  const lastAppliedRequest = React.useRef<number>(0);

  useEffect(() => {
    const forceRequest = lastCenterRequest && lastCenterRequest > lastAppliedRequest.current;
    
    // Only snap if center or zoom (the props) have actually changed from what we last applied
    const hasChanged = 
      forceRequest ||
      !lastAppliedCenter.current ||
      lastAppliedCenter.current[0] !== center[0] || 
      lastAppliedCenter.current[1] !== center[1] ||
      lastAppliedZoom.current !== zoom;

    if (hasChanged) {
      map.setView(center, zoom, { animate: true, duration: 0.5 });
      lastAppliedCenter.current = center;
      lastAppliedZoom.current = zoom;
      if (lastCenterRequest) lastAppliedRequest.current = lastCenterRequest;
    }
  }, [center, zoom, lastCenterRequest, map]);

  // Handle first render layout issues and trigger initial bounds
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    return () => clearTimeout(timer);
  }, [map]);

  return null;
}

function BoundsTracker({ onBoundsChange }: { onBoundsChange: (bounds: L.LatLngBounds) => void }) {
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const map = useMap();

  // Trigger initial bounds update so App knows what to filter immediately
  useEffect(() => {
    onBoundsChange(map.getBounds());
  }, []);

  useMapEvents({
    move: () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        onBoundsChange(map.getBounds());
      }, 150); // Balanced debounce
    },
    zoom: () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      onBoundsChange(map.getBounds());
    }
  });
  return null;
}

export const GasMap: React.FC<MapProps> = ({ 
  center, 
  zoom, 
  stations, 
  userLocation,
  selectedFuel, 
  isDarkMode,
  routePath,
  onStationSelect,
  onBoundsChange,
  lastCenterRequest
}) => {
  const cheapestId = React.useMemo(() => {
    if (stations.length === 0) return null;
    const available = stations.filter(s => s.prices[selectedFuel] !== undefined);
    if (available.length === 0) return null;
    return available.reduce((min, s) => 
      (s.prices[selectedFuel]! < min.prices[selectedFuel]!) ? s : min, 
    available[0]).id;
  }, [stations, selectedFuel]);

  const stationMarkers = React.useMemo(() => {
    // Optimization: When zoomed out, use a minimal point for performance.
    // Price only matters when we are close enough to see individual tags.
    // We synchronize this with the clustering threshold (Zoom 10 ~= 40km radius).
    // Achievement unlocked: Zoom 8 is enough to see labels without too much clutter
    const isDetailedView = zoom >= 8;

    return stations.map((station) => {
      const price = station.prices[selectedFuel];
      if (price === undefined) return null;

      // Price hierarchy colors (Semaphore)
      let markerColor = '#2563eb'; // Default Blue
      if (station.priceTier === 'cheap') markerColor = '#22c55e';
      else if (station.priceTier === 'average') markerColor = '#f59e0b';
      else if (station.priceTier === 'expensive') markerColor = '#ef4444';

      const isCheapest = station.id === cheapestId;

      // Conditional Marker Rendering
      const icon = L.divIcon({
        className: 'custom-div-icon',
        html: isDetailedView ? `
          <div class="relative transform -translate-x-1/2 -translate-y-[85%] hover:scale-110 active:scale-95 transition-all duration-200">
            ${isCheapest ? `
              <div class="absolute inset-0 bg-green-500 rounded-none blur-md opacity-40 animate-pulse scale-125"></div>
            ` : ''}
            <div class="relative flex flex-col items-center">
              <div class="text-white px-2 py-1 shadow-2xl flex items-center justify-center relative z-10 border border-white/20" style="background-color: ${markerColor}">
                <span class="text-[10px] font-mono font-black tracking-tight">${price.toFixed(3)}</span>
                <span class="text-[7px] font-bold ml-0.5 opacity-60">€</span>
              </div>
              <!-- Industrial stem -->
              <div class="w-[2px] h-3 -mt-[1px]" style="background-color: ${markerColor}"></div>
              <div class="w-1.5 h-1.5 rounded-full -mt-0.5 border border-white/40" style="background-color: ${markerColor}"></div>
            </div>
            
            ${isCheapest ? `
              <div class="absolute -top-4 -right-2 bg-green-500 text-white text-[7px] font-black px-1 py-0.5 rounded-none z-20 flex items-center gap-0.5 shadow-lg">
                <span class="w-1 h-1 bg-white rounded-full animate-pulse"></span>
                <span>Min</span>
              </div>
            ` : ''}
          </div>
        ` : `
          <div class="w-2 h-2 rounded-full border border-white/50 -translate-x-1/2 -translate-y-1/2 shadow-sm" style="background-color: ${markerColor}"></div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      return (
        <Marker 
          key={station.id} 
          position={[station.latitude, station.longitude]} 
          icon={icon}
          eventHandlers={{
            click: () => onStationSelect(station)
          }}
        />
      );
    });
  }, [stations, selectedFuel, onStationSelect, zoom, cheapestId]);

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer 
        center={center} 
        zoom={zoom} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        zoomControl={false}
        preferCanvas={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://stadiamaps.com/">Stadia Maps</a>'
          url={isDarkMode 
            ? "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
            : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          }
        />
        <MapUpdater center={center} zoom={zoom} lastCenterRequest={lastCenterRequest} />
        <BoundsTracker onBoundsChange={onBoundsChange} />

        {routePath && routePath.length > 0 && (
          <>
            <Polyline 
              positions={routePath} 
              pathOptions={{ 
                color: '#2563eb', 
                weight: 6, 
                opacity: 0.8,
                lineJoin: 'round',
                lineCap: 'round'
              }} 
            />
            <Polyline 
              positions={routePath} 
              pathOptions={{ 
                color: '#ffffff', 
                weight: 2, 
                opacity: 0.5,
                lineJoin: 'round',
                lineCap: 'round'
              }} 
            />
          </>
        )}

        {userLocation && (
          <Marker 
            position={userLocation}
            zIndexOffset={1000}
            icon={L.divIcon({
              className: 'user-location-marker',
              html: `
                <div class="relative flex items-center justify-center">
                  <div class="absolute w-8 h-8 bg-[#2563eb]/20 rounded-full animate-ping"></div>
                  <div class="w-4 h-4 bg-[#2563eb] rounded-full border-2 border-white shadow-lg overflow-hidden flex items-center justify-center">
                    <div class="w-2.5 h-2.5 bg-white rounded-full opacity-40 animate-pulse"></div>
                  </div>
                </div>
              `,
              iconSize: [0, 0],
              iconAnchor: [0, 0],
            })}
          />
        )}
        
        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={80}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
          disableClusteringAtZoom={10}
        >
          {stationMarkers}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
};
