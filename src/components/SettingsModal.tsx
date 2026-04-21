import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Moon, Sun, Bell, Navigation, TrendingUp, ShieldCheck, Lock } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  settings: {
    travelMode: boolean;
    priceAlerts: boolean;
  };
  updateSettings: (newSettings: any) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  toggleDarkMode,
  settings,
  updateSettings
}) => {
  const [geoStatus, setGeoStatus] = useState<PermissionState | 'loading'>('loading');

  useEffect(() => {
    if (isOpen && navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((status) => {
        setGeoStatus(status.state);
        status.onchange = () => setGeoStatus(status.state);
      });
    }
  }, [isOpen]);

  const requestRealPermission = () => {
    navigator.geolocation.getCurrentPosition(
      () => setGeoStatus('granted'),
      () => setGeoStatus('denied'),
      { enableHighAccuracy: true }
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-white dark:bg-black border-2 border-[#2563eb] shadow-2xl z-[70] overflow-hidden"
          >
            <div className="bg-[#0f172a] dark:bg-black p-4 flex items-center justify-between border-b dark:border-zinc-800">
              <h2 className="text-white font-black uppercase tracking-tight">Configuración</h2>
              <button onClick={onClose} className="text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-8">
              {/* Appearance */}
              <section>
                <h3 className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-4">Interfaz</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isDarkMode ? <Moon className="w-5 h-5 text-[#2563eb]" /> : <Sun className="w-5 h-5 text-[#2563eb]" />}
                    <span className="text-sm font-bold text-[#1e293b] dark:text-white">Modo Nocturno</span>
                  </div>
                  <button 
                    onClick={toggleDarkMode}
                    className={`w-12 h-6 rounded-full transition-colors relative ${isDarkMode ? 'bg-[#2563eb]' : 'bg-zinc-200'}`}
                  >
                    <motion.div 
                      animate={{ x: isDarkMode ? 24 : 4 }}
                      className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm"
                    />
                  </button>
                </div>
              </section>

              {/* Notifications */}
              <section>
                <h3 className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-4">Notificaciones</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Navigation className="w-5 h-5 text-[#2563eb]" />
                      <div>
                        <p className="text-sm font-bold text-[#1e293b] dark:text-white leading-none mb-1">Modo Viaje</p>
                        <p className="text-[10px] text-zinc-400">Avisos de gasolineras baratas en ruta</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => updateSettings({ travelMode: !settings.travelMode })}
                      className={`w-12 h-6 rounded-full transition-colors relative ${settings.travelMode ? 'bg-[#2563eb]' : 'bg-zinc-200'}`}
                    >
                      <motion.div 
                        animate={{ x: settings.travelMode ? 24 : 4 }}
                        className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm"
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-5 h-5 text-[#2563eb]" />
                      <div>
                        <p className="text-sm font-bold text-[#1e293b] dark:text-white leading-none mb-1">Variación Precios</p>
                        <p className="text-[10px] text-zinc-400">Estimaciones de cambios bruscos</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => updateSettings({ priceAlerts: !settings.priceAlerts })}
                      className={`w-12 h-6 rounded-full transition-colors relative ${settings.priceAlerts ? 'bg-[#2563eb]' : 'bg-zinc-200'}`}
                    >
                      <motion.div 
                        animate={{ x: settings.priceAlerts ? 24 : 4 }}
                        className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm"
                      />
                    </button>
                  </div>
                </div>
              </section>

              <div className="pt-4 text-center">
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                  FUELTRACK ES v1.2.5 • AGENT BUILT
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
