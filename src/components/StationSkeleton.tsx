/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';

export const StationSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-zinc-950 p-4 border-b border-zinc-100 dark:border-zinc-900 flex items-center gap-4">
      <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-900 animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/4 bg-zinc-100 dark:bg-zinc-900 rounded animate-pulse" />
        <div className="h-3 w-1/2 bg-zinc-50 dark:bg-zinc-900 rounded animate-pulse" />
      </div>
      <div className="space-y-2 text-right">
        <div className="h-4 w-12 bg-zinc-100 dark:bg-zinc-900 rounded animate-pulse ml-auto" />
        <div className="h-3 w-8 bg-zinc-50 dark:bg-zinc-900 rounded animate-pulse ml-auto" />
      </div>
    </div>
  );
};

export const ListSkeleton: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto">
      {[...Array(6)].map((_, i) => (
        <StationSkeleton key={i} />
      ))}
    </div>
  );
};
