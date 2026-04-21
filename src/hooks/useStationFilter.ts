/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from 'react';
import { GasStation, FuelType } from '../types';

/**
 * Helper to calculate distance between two coordinates in km.
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const p = 0.017453292519943295; // Math.PI / 180
  const c = Math.cos;
  const a = 0.5 - c((lat2 - lat1) * p) / 2 + 
            c(lat1 * p) * c(lat2 * p) * 
            (1 - c((lon2 - lon1) * p)) / 2;

  return 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
}

export function useStationFilter(
  stations: GasStation[],
  fuel: FuelType,
  query: string,
  viewMode: string,
  mapBounds: L.LatLngBounds | null,
  activeServices: string[],
  userLocation: [number, number] | null,
  favorites: string[],
  zoom: number,
  routePath?: [number, number][] | null
) {
  return useMemo(() => {
    let filtered = [...stations];
    
    // Performance Guard
    const isVeryZoomedOut = zoom < 9;

    // Filter by services
    if (activeServices.length > 0) {
      filtered = filtered.filter(s => {
        return activeServices.every(serviceId => {
          if (serviceId === 'hasShop') return s.hasShop;
          if (serviceId === 'hasCarWash') return s.hasCarWash;
          if (serviceId === 'hasAirWater') return s.hasAirWater;
          if (serviceId === 'hasCafe') return s.hasCafe;
          return true;
        });
      });
    }

    // Filter by Route proximity if a route is active
    if (routePath && routePath.length > 0) {
      // Create a bounding box for the route to fast-filter
      const lats = routePath.map(c => c[0]);
      const lngs = routePath.map(c => c[1]);
      const minLat = Math.min(...lats) - 0.05; // ~5km buffer
      const maxLat = Math.max(...lats) + 0.05;
      const minLng = Math.min(...lngs) - 0.05;
      const maxLng = Math.max(...lngs) + 0.05;

      filtered = filtered.filter(s => 
        s.latitude >= minLat && s.latitude <= maxLat && 
        s.longitude >= minLng && s.longitude <= maxLng
      );

      // Higher precision filter: within 3km of any sample point on the route
      // Sample every 5th point for performance
      const samplePoints = routePath.filter((_, i) => i % 5 === 0);
      filtered = filtered.filter(s => 
        samplePoints.some(p => calculateDistance(s.latitude, s.longitude, p[0], p[1]) < 3)
      );
    } else if (viewMode === 'map' && mapBounds) {
      // Filter by map bounds if in map mode and NO route is active
      filtered = filtered.filter(s => mapBounds.contains([s.latitude, s.longitude]));
    }

    // Filter by favorites if in favorites mode
    if (viewMode === 'favorites') {
      filtered = filtered.filter(s => favorites.includes(s.id));
    }

    if (userLocation) {
      filtered = filtered.map(s => ({
        ...s,
        distance: calculateDistance(userLocation[0], userLocation[1], s.latitude, s.longitude)
      }));
    }

    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(q) || 
        s.city.toLowerCase().includes(q) || 
        s.address.toLowerCase().includes(q)
      );
    }

    // Initial price calculation (Optimized: only for color tiers)
    if (filtered.length > 0) {
      // We still need cheap/expensive limits for the semaphoro colors
      // but we do NOT sort the whole list if we don't need a limit
      const samplePrices = filtered.slice(0, 500).map(s => s.prices[fuel]).filter((p): p is number => p !== undefined);
      samplePrices.sort((a, b) => a - b);
      
      const count = samplePrices.length;
      const cheapLimit = samplePrices[Math.floor(count / 3)] ?? 0;
      const expensiveLimit = samplePrices[Math.floor((2 * count) / 3)] ?? 0;

      filtered = filtered.map(s => {
        const price = s.prices[fuel] || 0;
        let priceTier: 'cheap' | 'average' | 'expensive' = 'average';
        if (price <= cheapLimit) priceTier = 'cheap';
        else if (price > expensiveLimit) priceTier = 'expensive';
        return { ...s, priceTier };
      });
    }

    // Default sort by distance if location available
    if (userLocation) {
      filtered.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }

    // Return all for map since we have clustering, slice only for lists
    return viewMode === 'map' ? filtered : filtered.slice(0, 50);
  }, [stations, fuel, query, viewMode, mapBounds, activeServices, userLocation, favorites, zoom, routePath]);
}
