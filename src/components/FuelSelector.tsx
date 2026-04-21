/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { FUEL_TYPES, FuelType } from '../types';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface FuelSelectorProps {
  selectedFuel: FuelType;
  onSelect: (fuel: FuelType) => void;
  compact?: boolean;
}

export const FuelSelector: React.FC<FuelSelectorProps> = ({ selectedFuel, onSelect, compact }) => {
  return (
    <div className={cn(
      "flex w-full gap-0.5",
      compact ? "py-1" : "py-4 px-4 overflow-x-auto no-scrollbar"
    )}>
      {FUEL_TYPES.map((fuel) => {
        const isSelected = selectedFuel === fuel.id;
        return (
          <motion.button
            key={fuel.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(fuel.id)}
            className={cn(
              "flex-1 transition-all duration-200 font-extrabold whitespace-nowrap uppercase tracking-tighter sm:tracking-widest relative min-w-0 px-2 py-3 border-2 text-[11px] tracking-[0.2em] rounded-none",
              compact 
                ? "px-1 py-2 text-[9px] sm:text-[10px] border-r border-white/5 last:border-0 border-t-0 border-b-0 border-l-0" 
                : "",
              isSelected 
                ? "bg-white text-black border-white" 
                : "bg-transparent text-white/40 border-white/10 hover:text-white hover:border-white/30"
            )}
          >
            <div className="flex items-center justify-center gap-1">
              {fuel.label}
            </div>
            {isSelected && compact && (
              <motion.div 
                layoutId="active-line"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2563eb]"
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
};
