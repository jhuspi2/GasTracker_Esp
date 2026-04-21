/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Calendar, AlertTriangle, Droplets, ArrowRight } from 'lucide-react';
import { AppNotification } from '../types';

interface NotificationsListProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
}

export const NotificationsList: React.FC<NotificationsListProps> = ({ 
  isOpen, 
  onClose, 
  notifications, 
  onMarkAsRead,
  onClearAll
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-[400px] bg-white dark:bg-black border-l border-white/10 shadow-2xl z-[160] flex flex-col"
          >
            <div className="px-6 py-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#2563eb]/10 rounded-lg">
                  <Bell className="w-5 h-5 text-[#2563eb]" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-[#1e293b] dark:text-white uppercase tracking-tight">Notificaciones</h2>
                  <p className="text-[10px] font-bold text-[#64748b] dark:text-zinc-500 uppercase tracking-widest">Avisos de mercado y precios</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full transition-colors">
                <X className="w-6 h-6 text-[#1e293b] dark:text-white" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Central Advertisement Banner */}
              <div className="relative group overflow-hidden bg-gradient-to-r from-[#2563eb] to-[#7c3aed] p-[1px] rounded-xl mb-6 shadow-lg shadow-blue-500/20">
                <div className="bg-white dark:bg-zinc-950 p-4 rounded-[11px] h-full flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <span className="bg-[#2563eb] py-0.5 px-1.5 rounded text-[8px] font-black text-white uppercase tracking-tighter">Patrocinado</span>
                    <button className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <h4 className="text-[11px] font-black text-[#1e293b] dark:text-white uppercase mb-1">Tu coche se merece lo mejor</h4>
                  <p className="text-[10px] text-[#64748b] dark:text-zinc-400 font-bold mb-3 leading-tight">
                    Limpieza profesional en EcoWash. Usa el código <span className="text-[#2563eb]">GASMEM</span> para -20% adicional.
                  </p>
                  <button className="mt-auto w-full py-2 bg-[#2563eb] text-white text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 group-hover:bg-[#1d4ed8] transition-all">
                    Reservar Cita
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>

              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-4">
                    <Bell className="w-8 h-8 text-zinc-200 dark:text-zinc-800" />
                  </div>
                  <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">No tienes avisos nuevos</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 border border-zinc-100 dark:border-zinc-800 relative group transition-all ${!n.isRead ? 'bg-[#2563eb]/5 border-l-4 border-l-[#2563eb]' : 'bg-white dark:bg-zinc-950'}`}
                    onClick={() => onMarkAsRead(n.id)}
                  >
                    {!n.isRead && (
                      <div className="absolute top-4 right-4 w-2 h-2 bg-[#ef4444] rounded-full" />
                    )}
                    
                    <div className="flex items-center gap-2 mb-2">
                       {n.type === 'market' ? (
                         <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded text-[9px] font-black uppercase tracking-tighter">
                           <AlertTriangle className="w-3 h-3" />
                           Aviso Crudo
                         </div>
                       ) : (
                         <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#2563eb]/10 text-[#2563eb] rounded text-[9px] font-black uppercase tracking-tighter">
                           <Calendar className="w-3 h-3" />
                           Sistema
                         </div>
                       )}
                       <span className="text-[9px] font-bold text-zinc-400 uppercase">{n.date}</span>
                    </div>

                    <h3 className="text-sm font-black text-[#1e293b] dark:text-white uppercase mb-1 leading-tight">{n.title}</h3>
                    <p className="text-xs text-[#64748b] dark:text-zinc-400 font-medium leading-relaxed">{n.message}</p>
                    
                    {n.type === 'market' && (
                      <div className="mt-3 pt-3 border-t border-dashed border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                         <div className="flex items-center gap-2 text-[10px] font-black font-mono text-[#2563eb]">
                             <Droplets className="w-3.5 h-3.5" />
                             RENTABILIDAD REPOSTAJE: ALTA
                         </div>
                         <ArrowRight className="w-4 h-4 text-zinc-300 group-hover:translate-x-1 transition-transform" />
                      </div>
                    )}

                    {n.type === 'market' && (
                      <div className="mt-2 text-[8px] font-black text-[#2563eb] uppercase tracking-tighter opacity-70">
                        Publicidad: Patrocinado por EcoWash Lubricantes
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <div className="p-4 border-t border-zinc-100 dark:border-zinc-800">
                <button 
                  onClick={onClearAll}
                  className="w-full py-3 text-[10px] font-black text-[#64748b] dark:text-zinc-500 uppercase tracking-[0.2em] hover:text-[#ef4444] transition-colors"
                >
                  Limpiar todas las notificaciones
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
