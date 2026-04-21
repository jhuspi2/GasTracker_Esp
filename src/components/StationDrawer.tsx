/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, Clock, Navigation, TrendingUp, Sparkles, AlertCircle, Heart, Share2, Info, Star, ChevronRight, ShoppingBag, Droplets, Wind, Coffee } from 'lucide-react';
import { GasStation, FuelType, PriceHistory, PricePrediction, FUEL_TYPES } from '../types';
import { PriceChart } from './PriceChart';
import { generateMockHistory, predictPrices } from '../services/geminiService';

interface StationDrawerProps {
  station: GasStation | null;
  selectedFuel: FuelType;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onClose: () => void;
  isDarkMode: boolean;
}

export const StationDrawer: React.FC<StationDrawerProps> = ({ 
  station, 
  selectedFuel, 
  isFavorite,
  onToggleFavorite,
  onClose,
  isDarkMode
}) => {
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [predictions, setPredictions] = useState<PricePrediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showClosedAlert, setShowClosedAlert] = useState(false);

  const is24h = station?.schedule?.toLowerCase().includes('24h') || station?.schedule?.toLowerCase().includes('24 h') || station?.schedule?.toLowerCase().includes('l-d 24h');

  useEffect(() => {
    if (station) {
      const currentPrice = station.prices[selectedFuel];
      if (currentPrice) {
        const mockHistory = generateMockHistory(currentPrice);
        setHistory(mockHistory);
        setPredictions([]); // Reset predictions
        setShowPredictions(false); // Reset visibility

        // Perform prediction in background
        setLoading(true);
        predictPrices(currentPrice, selectedFuel, mockHistory).then(preds => {
          setPredictions(preds);
          setLoading(false);
        });
      }
    }
  }, [station, selectedFuel]);

  const handleTogglePrediction = () => {
    setShowPredictions(!showPredictions);
  };

  useEffect(() => {
    if (station && !is24h) {
      const now = new Date();
      const hour = now.getHours();
      
      if (hour >= 23 || hour < 6) {
        setShowClosedAlert(true);
      }
    } else {
      setShowClosedAlert(false);
    }
  }, [station, is24h]);

  if (!station) return null;

  const currentPrice = station.prices[selectedFuel];
  const fuelInfo = FUEL_TYPES.find(f => f.id === selectedFuel);

  const handleShare = async () => {
    const text = `🎉 ¡Mira el precio de ${fuelInfo?.label}! en ${station.name}\n📍 ${station.address}, ${station.city}\n💰 Precio: ${currentPrice?.toFixed(3)}€/L\n🌍 Ver en: https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `GasTracker ES - ${station.name}`,
          text: text,
          url: window.location.href
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(text);
      alert('Información copiada al portapapeles');
    }
  };

  return (
    <>
      <AnimatePresence>
        {showClosedAlert && (
          <motion.div 
            key="closed-alert-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              key="closed-alert-content"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-[320px] p-8 shadow-[0_0_50px_rgba(239,68,68,0.3)] border-t-8 border-[#ef4444] relative text-center"
            >
              <div className="w-20 h-20 bg-[#ef4444]/10 rounded-full flex items-center justify-center mb-6 mx-auto">
                <AlertCircle className="w-10 h-10 text-[#ef4444]" />
              </div>
              <h3 className="text-2xl font-black text-[#1e293b] dark:text-white uppercase mb-2 tracking-tighter">¡Atención!</h3>
              <p className="text-[#64748b] dark:text-zinc-400 font-bold uppercase text-[12px] mb-8 tracking-widest leading-relaxed">Esta gasolinera se encuentra CERRADA en este momento</p>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowClosedAlert(false);
                }}
                className="w-full bg-[#1e293b] dark:bg-white dark:text-black text-white font-black py-4 uppercase tracking-[0.2em] text-xs hover:bg-black dark:hover:bg-zinc-200 transition-all shadow-xl active:scale-95"
              >
                Entendido
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {station && (
          <motion.div
            key="station-drawer"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t-4 border-[#2563eb] shadow-2xl z-50 max-h-[90vh] overflow-y-auto"
          >
        <div className="sticky top-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-6 py-4 border-b border-[#e2e8f0] dark:border-zinc-800 flex items-center justify-between z-10">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-[17px] font-black text-[#1e293b] dark:text-white uppercase tracking-tighter truncate">{station.name}</h2>
            <div className="flex items-center text-[#64748b] dark:text-zinc-500 font-bold uppercase text-[10px] mt-0.5 tracking-widest">
              <MapPin className="w-3 h-3 mr-1" />
              <span className="truncate">{station.address}, {station.city}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => onToggleFavorite(station.id)}
              className={`p-2.5 rounded-full transition-all duration-300 active:scale-75 ${
                isFavorite 
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30' 
                  : 'text-zinc-400 dark:text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10'
              }`}
              title={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
            <button 
              onClick={handleShare}
              className="p-2.5 rounded-full text-zinc-400 dark:text-zinc-500 hover:text-[#2563eb] hover:bg-[#2563eb]/10 transition-all active:scale-75"
              title="Compartir"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button 
              onClick={onClose}
              className="p-2.5 rounded-full text-zinc-400 dark:text-zinc-500 hover:text-black dark:hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-4 drawer-content">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-[#f1f5f9] dark:bg-zinc-800 p-3 border border-[#e2e8f0] dark:border-zinc-700">
              <span className="text-[#64748b] dark:text-zinc-400 text-[10px] font-bold uppercase tracking-wider block mb-0.5">
                {fuelInfo?.label || 'Combustible'}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-[#1e293b] dark:text-white">
                  {currentPrice ? currentPrice.toFixed(3) : '---'}
                </span>
                <span className="text-[#64748b] font-bold font-mono text-xs">€/L</span>
              </div>
            </div>
            
            <div className="bg-[#0f172a] dark:bg-black p-3 border border-white/10 flex flex-col justify-center">
              <div className="flex items-center text-white/60 text-[10px] font-bold uppercase tracking-wider mb-0.5">
                <Clock className="w-3 h-3 mr-1" />
                Tiempo Estimado de Llegada
              </div>
              <p className="text-[11px] font-semibold text-white leading-tight">
                {station.distance ? `~${Math.round(station.distance * 1.5 + 2)} MINUTOS` : 'N/A'}
              </p>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            {is24h && (
              <div className="flex-1 bg-[#10b981]/10 border border-[#10b981]/20 px-3 py-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#10b981]" />
                <span className="text-[10px] font-bold text-[#10b981] uppercase leading-none">24 Horas</span>
              </div>
            )}
          </div>

          {(station.hasShop || station.hasCarWash || station.hasAirWater || station.hasCafe) && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#94a3b8] dark:text-zinc-600 block">Servicios en estación</span>
                {station.isEnriched && (
                  <div className="flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-wider">OpenStreetMap (OSM)</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {station.hasShop && (
                  <div className="bg-[#f8fafc] dark:bg-zinc-900/50 border border-[#e2e8f0] dark:border-zinc-800 p-3 flex items-center gap-3">
                    <ShoppingBag className="w-4 h-4 text-[#2563eb]" />
                    <span className="text-[10px] font-black dark:text-white uppercase tracking-wider">Tienda</span>
                  </div>
                )}
                {station.hasCarWash && (
                  <div className="bg-[#f8fafc] dark:bg-zinc-900/50 border border-[#e2e8f0] dark:border-zinc-800 p-3 flex items-center gap-3">
                    <Droplets className="w-4 h-4 text-[#2563eb]" />
                    <span className="text-[10px] font-black dark:text-white uppercase tracking-wider">Lavado</span>
                  </div>
                )}
                {station.hasAirWater && (
                  <div className="bg-[#f8fafc] dark:bg-zinc-900/50 border border-[#e2e8f0] dark:border-zinc-800 p-3 flex items-center gap-3">
                    <Wind className="w-4 h-4 text-[#2563eb]" />
                    <span className="text-[10px] font-black dark:text-white uppercase tracking-wider">Aire/Agua</span>
                  </div>
                )}
                {station.hasCafe && (
                  <div className="bg-[#f8fafc] dark:bg-zinc-900/50 border border-[#e2e8f0] dark:border-zinc-800 p-3 flex items-center gap-3">
                    <Coffee className="w-4 h-4 text-[#2563eb]" />
                    <span className="text-[10px] font-black dark:text-white uppercase tracking-wider">Café</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[12px] font-bold text-[#1e293b] dark:text-white uppercase tracking-wider flex items-center">
                <TrendingUp className="w-4 h-4 mr-2 text-[#64748b]" />
                Historial (7 Días)
              </h3>
              
              {!loading && (
                <button 
                  onClick={handleTogglePrediction}
                  className="flex items-center text-[10px] text-[#2563eb] font-black uppercase tracking-widest hover:underline group"
                >
                  <Sparkles className={`w-3 h-3 mr-1 ${!showPredictions ? 'group-hover:animate-spin' : ''}`} />
                  {!showPredictions ? 'Ver predicción IA' : 'Cerrar predicción'}
                </button>
              )}

              {loading && (
                <div className="flex items-center text-[9px] text-[#2563eb] font-bold uppercase animate-pulse">
                  <Sparkles className="w-2.5 h-2.5 mr-1" />
                  Calculando...
                </div>
              )}
            </div>
            
            <PriceChart 
              history={history} 
              predictions={showPredictions ? predictions : []} 
              fuelType={selectedFuel} 
            />
            
            {showPredictions && predictions.length > 0 && (
              <div className="mt-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748b] mb-2 block">Estimación Próx. 3 Días</span>
                <div className="bg-[#f1f5f9] dark:bg-zinc-800 border border-[#e2e8f0] dark:border-zinc-700 rounded-[6px] p-3">
                  {predictions.map((p, i) => {
                    const diff = p.predictedPrice - (currentPrice || 0);
                    const isUp = diff > 0;
                    return (
                      <div key={p.date} className="flex justify-between items-center py-1.5 border-b border-dashed border-[#e2e8f0] dark:border-zinc-700 last:border-0">
                        <span className="text-[11px] font-semibold text-[#1e293b] dark:text-white">
                          {i === 0 ? 'Mañana' : i === 1 ? 'Pasado' : 'Próximos 3 días'}
                        </span>
                        <span className={`text-[11px] font-bold font-mono ${isUp ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
                          {isUp ? '+' : ''}{diff.toFixed(3)}€
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="mb-6 bg-zinc-100 dark:bg-zinc-800 border-2 border-dashed border-zinc-300 dark:border-zinc-700 h-24 rounded-xl flex items-center justify-center overflow-hidden">
            <div className="text-center">
              <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none mb-1">Publicidad / Ads Space</p>
              <p className="text-[9px] text-zinc-400">Espacio reservado para anunciantes</p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-[11px] font-bold text-[#1e293b] dark:text-white uppercase tracking-wider mb-3">Precios de hoy</h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(station.prices).map(([fuel, price]) => {
                const info = FUEL_TYPES.find(f => f.id === fuel);
                const priceValue = typeof price === 'number' ? price : 0;
                if (!priceValue) return null;
                const isSelected = fuel === selectedFuel;
                
                return (
                  <div 
                    key={fuel} 
                    className={`flex flex-col p-2.5 border rounded-none transition-all ${
                      isSelected 
                      ? 'bg-[#2563eb] border-[#2563eb] text-white shadow-lg' 
                      : 'bg-[#f8fafc] dark:bg-zinc-900 border-[#e2e8f0] dark:border-zinc-800'
                    }`}
                  >
                    <span className={`text-[9px] font-black uppercase tracking-tighter mb-1 ${
                      isSelected ? 'text-white/80' : 'text-[#64748b] dark:text-zinc-500'
                    }`}>
                      {info?.label || fuel}
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-sm font-black ${
                        isSelected ? 'text-white' : 'text-[#1e293b] dark:text-white'
                      }`}>
                        {priceValue.toFixed(3)}
                      </span>
                      <span className={`text-[8px] font-bold ${
                        isSelected ? 'text-white/60' : 'text-[#64748b] dark:text-zinc-500'
                      }`}>€/L</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-8 pb-8 flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-[#e2e8f0] dark:via-zinc-800 to-transparent" />
              <span className="text-[9px] font-black text-[#64748b] dark:text-zinc-500 uppercase tracking-[0.2em]">Seleccionar Navegador</span>
              <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-[#e2e8f0] dark:via-zinc-800 to-transparent" />
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-2">
              <a 
                href={`https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative bg-[#f8fafc] dark:bg-zinc-900 border border-[#e2e8f0] dark:border-zinc-800 py-3 rounded-none overflow-hidden hover:bg-white dark:hover:bg-zinc-800 transition-all active:scale-[0.98]"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-[#2563eb]" />
                <div className="flex items-center justify-center gap-2">
                  <Navigation className="w-3.5 h-3.5 text-[#2563eb]" />
                  <span className="text-[10px] font-black text-[#1e293b] dark:text-white uppercase tracking-widest">Google Maps</span>
                </div>
              </a>
              
              <a 
                href={`https://waze.com/ul?ll=${station.latitude},${station.longitude}&navigate=yes`}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative bg-[#f8fafc] dark:bg-zinc-900 border border-[#e2e8f0] dark:border-zinc-800 py-3 rounded-none overflow-hidden hover:bg-white dark:hover:bg-zinc-800 transition-all active:scale-[0.98]"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-[#33ccff]" />
                <div className="flex items-center justify-center gap-2">
                  <div className="w-3.5 h-3.5 text-[#33ccff]">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full"><path d="M18.503 7.03c-1.396-1.515-3.333-2.45-5.503-2.45-3.866 0-7 3.134-7 7 0 1.25.328 2.422.905 3.442l-1.071 3.535 3.568-1.012c1.018.66 2.22 1.05 3.508 1.05 3.866 0 7-3.134 7-7 0-.903-.171-1.766-.481-2.556l-.926.155zM13 13.5c-.828 0-1.5-.672-1.5-1.5s.672-1.5 1.5-1.5 1.5.672 1.5 1.5-.672 1.5-1.5 1.5zm4.5-1.5c0 .828-.672 1.5-1.5 1.5s-1.5-.672-1.5-1.5.672-1.5 1.5-1.5 1.5.672 1.5 1.5z"/></svg>
                  </div>
                  <span className="text-[10px] font-black text-[#1e293b] dark:text-white uppercase tracking-widest">Waze Nav</span>
                </div>
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    )}
    </AnimatePresence>
    </>
  );
};
