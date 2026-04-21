/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type FuelType = 
  | 'G95E5' 
  | 'G98E5' 
  | 'GPR' 
  | 'GOA' 
  | 'GOB' 
  | 'GOC' 
  | 'GLP' 
  | 'GNL';

export interface FuelInfo {
  id: FuelType;
  label: string;
  color: string;
}

export const FUEL_TYPES: FuelInfo[] = [
  { id: 'G95E5', label: 'Gas (95)', color: '#22c55e' },
  { id: 'G98E5', label: 'Gas (98)', color: '#16a34a' },
  { id: 'GOA', label: 'Diésel A', color: '#3b82f6' },
  { id: 'GPR', label: 'D. Plus', color: '#2563eb' },
  { id: 'GLP', label: 'GLP', color: '#f59e0b' },
];

export interface GasStation {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  latitude: number;
  longitude: number;
  prices: Partial<Record<FuelType, number>>;
  schedule: string;
  brand: string;
  distance?: number;
  isSelfService?: boolean;
  hasShop?: boolean;
  hasCarWash?: boolean;
  hasAirWater?: boolean;
  hasCafe?: boolean;
  isEnriched?: boolean;
  priceTier?: 'cheap' | 'average' | 'expensive';
}

export interface PriceHistory {
  date: string;
  price: number;
}

export interface PricePrediction {
  date: string;
  predictedPrice: number;
  confidence: number;
}

export interface MarketInsight {
  id: string;
  date: string;
  status: 'warning' | 'stable' | 'favorable' | 'critical';
  trend: 'up' | 'down' | 'neutral';
  title: string;
  message: string;
  brentPrice: number;
  brentChange: number;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  date: string;
  isRead: boolean;
  type: 'market' | 'system' | 'price';
  data?: any;
}
