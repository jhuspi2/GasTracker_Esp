/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MarketInsight } from '../types';
import { getRealTimeBrentPrice } from './geminiService';

/**
 * Service to fetch real market commodities data like Brent Oil prices using AI search.
 */
export async function getMarketInsight(): Promise<MarketInsight | null> {
  const today = new Date().toISOString().split('T')[0];
  
  try {
    const liveData = await getRealTimeBrentPrice();
    
    if (liveData) {
      const isCritical = Math.abs(liveData.change) >= 7;
      
      // User requirement: Only notify if variation >= 7%
      if (!isCritical) return null;
      
      return {
        id: `brent-alert-${today}`,
        date: today,
        status: 'critical',
        trend: liveData.change >= 0 ? 'up' : 'down',
        title: `¡ALERTA MÁXIMA! Variación del ${liveData.change.toFixed(1)}% en Brent`,
        message: liveData.advice,
        brentPrice: liveData.current,
        brentChange: liveData.change
      };
    }
  } catch (error) {
    console.error('Error fetching market insight:', error);
  }

  return null;
}
