/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  ReferenceArea
} from 'recharts';
import { PriceHistory, PricePrediction, FuelType, FUEL_TYPES } from '../types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface PriceChartProps {
  history: PriceHistory[];
  predictions: PricePrediction[];
  fuelType: FuelType;
  tickEvery?: number;
}

export const PriceChart: React.FC<PriceChartProps> = ({ history, predictions, fuelType, tickEvery }) => {
  const fuelInfo = FUEL_TYPES.find(f => f.id === fuelType);
  const chartColor = fuelInfo ? fuelInfo.color : '#3b82f6';

  // Merge history and predictions
  const data = [
    ...history.map(h => ({ 
      date: h.date, 
      price: h.price, 
      type: 'history' 
    })),
    ...predictions.map(p => ({ 
      date: p.date, 
      price: p.predictedPrice, 
      type: 'prediction' 
    }))
  ];

  // Adaptive tick interval: show ~5-6 labels regardless of range
  const totalPoints = data.length;
  const resolvedTickEvery = tickEvery ?? Math.max(1, Math.round(totalPoints / 5));

  // Find min/max for better Y axis scaling
  const prices = data.map(d => d.price);
  const minPrice = prices.length > 0 ? Math.min(...prices) * 0.99 : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) * 1.01 : 2;

  if (data.length === 0) {
    return (
      <div className="w-full h-40 mt-2 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 border border-dashed border-zinc-200 dark:border-zinc-800">
        <p className="text-[10px] font-bold text-zinc-400 uppercase">Sin datos históricos</p>
      </div>
    );
  }

  return (
    <div className="w-full h-40 mt-2 relative">
      <ResponsiveContainer width="100%" height={160} minWidth={0}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartColor} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorPred" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#888888" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#888888" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
          <XAxis 
            dataKey="date" 
            tick={(props) => {
              const { x, y, payload, index } = props;
              if (index % resolvedTickEvery !== 0) return <g />;
              return (
                <text x={x} y={y + 10} fontSize={8} fill="#71717a" textAnchor="middle">
                  {format(parseISO(payload.value), 'd/MM')}
                </text>
              );
            }}
            axisLine={false}
            tickLine={false}
            height={20}
          />
          <YAxis 
            domain={[minPrice, maxPrice]} 
            tick={{ fontSize: 9, fill: '#71717a', fontWeight: 600 }}
            tickFormatter={(val) => val.toFixed(3)}
            axisLine={false}
            tickLine={false}
            width={45}
          />
          <Tooltip 
            contentStyle={{ 
              borderRadius: '12px', 
              border: 'none', 
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              fontSize: '12px'
            }}
            labelFormatter={(label) => format(parseISO(label), 'd MMMM yyyy', { locale: es })}
            formatter={(value: number, name: string, props: any) => {
              const isPred = props.payload.type === 'prediction';
              return [
                `${value.toFixed(3)}€`, 
                isPred ? 'Predicción' : 'Histórico'
              ];
            }}
          />
          <Area 
            type="monotone" 
            dataKey="price" 
            stroke={chartColor} 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorPrice)" 
            connectNulls
            strokeDasharray="0"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
