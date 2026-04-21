/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, TrendingUp, TrendingDown, Info, X, Droplets } from 'lucide-react';
import { MarketInsight } from '../types';

interface MarketAlertProps {
  insight: MarketInsight | null;
  onClose: () => void;
  onView: () => void;
}

export const MarketAlert: React.FC<MarketAlertProps> = ({ insight, onClose, onView }) => {
  if (!insight) return null;

  const isCritical = insight.status === 'critical';
  const accentColor = isCritical ? '#ef4444' : '#2563eb';
  const bgColorClass = isCritical ? 'bg-[#ef4444]/10' : 'bg-[#2563eb]/10';
  const borderClass = isCritical ? 'border-[#ef4444]' : 'border-[#2563eb]';
  const shadowStyle = { boxShadow: `0 0 50px ${isCritical ? 'rgba(239,68,68,0.3)' : 'rgba(37,99,235,0.3)'}` };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4"
      >
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          style={shadowStyle}
          className={`bg-white dark:bg-zinc-900 w-full max-w-[320px] p-6 border-t-8 ${borderClass} relative text-center shadow-2xl`}
        >
          <div className={`w-16 h-16 ${bgColorClass} rounded-full flex items-center justify-center mb-4 mx-auto`}>
            <AlertTriangle className={`w-8 h-8 ${isCritical ? 'text-[#ef4444]' : 'text-[#2563eb]'}`} />
          </div>
          <h3 className="text-xl font-black text-[#1e293b] dark:text-white uppercase mb-4 tracking-tighter leading-tight">
            {insight.title}
          </h3>

          <div className="flex items-center justify-center gap-3 mb-6 bg-[#f1f5f9] dark:bg-white/5 py-2 px-4 rounded-lg">
            {insight.trend === 'up' ? <TrendingUp className={`w-4 h-4 ${isCritical ? 'text-[#ef4444]' : 'text-[#2563eb]'}`} /> : <TrendingDown className="w-4 h-4 text-[#10b981]" />}
            <span className="text-[11px] font-black text-[#1e293b] dark:text-white font-mono uppercase">
              ${insight.brentPrice} ({insight.brentChange > 0 ? '+' : ''}{insight.brentChange}%)
            </span>
          </div>

          <p className="text-[10px] text-[#64748b] dark:text-zinc-400 font-bold mb-6 italic border-t border-zinc-100 dark:border-zinc-800 pt-4">
            <span className="text-[#2563eb] font-black mr-1 uppercase">[AD]</span> 
            Aprovecha para lavar tu coche en estaciones Repsol con un -10% de descuento directo.
          </p>
          
          <div className="flex gap-2">
            <button 
              onClick={onView}
              className="flex-1 bg-[#2563eb] text-white font-black py-4 uppercase tracking-[0.2em] text-[10px] hover:bg-black transition-all shadow-xl active:scale-95"
            >
              VER
            </button>
            <button 
              onClick={onClose}
              className="flex-1 bg-[#f1f5f9] dark:bg-zinc-800 text-[#64748b] dark:text-zinc-400 font-black py-4 uppercase tracking-[0.2em] text-[10px] hover:bg-[#e2e8f0] dark:hover:bg-zinc-700 transition-all active:scale-95"
            >
              CERRAR
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
