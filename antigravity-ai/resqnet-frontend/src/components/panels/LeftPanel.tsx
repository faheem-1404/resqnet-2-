"use client";
import { motion } from 'framer-motion';
import { ShieldAlert, Activity, Droplets, MapPin } from 'lucide-react';

export default function LeftPanel({ floodMode, floodSpread }: { floodMode: boolean, floodSpread: number }) {
  const isCritical = floodSpread > 50;

  return (
    <motion.div 
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-80 h-[70vh] glass-panel p-6 flex flex-col space-y-6 pointer-events-auto"
    >
      <div className="flex items-center space-x-3 border-b border-cyan-500/30 pb-4">
        <Activity className={`w-6 h-6 ${floodMode ? 'text-red-500 animate-pulse' : 'text-cyan-400'}`} />
        <h2 className="text-xl font-bold tracking-wider">THREAT ANALYSIS</h2>
      </div>

      <div className="space-y-4 flex-grow">
        <div className="bg-black/50 p-4 rounded border border-cyan-500/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-cyan-300/70">FLOOD SEVERITY</span>
            <ShieldAlert className={`w-4 h-4 ${isCritical ? 'text-red-500' : 'text-yellow-500'}`} />
          </div>
          <div className={`text-2xl font-bold ${floodMode ? (isCritical ? 'text-red-500 neon-text-red' : 'text-orange-500') : 'text-cyan-400'}`}>
            {floodMode ? (isCritical ? 'CRITICAL LEVEL 4' : 'ELEVATED LEVEL 2') : 'NOMINAL LEVEL 0'}
          </div>
        </div>

        <div className="bg-black/50 p-4 rounded border border-cyan-500/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-cyan-300/70">FLOOD SPREAD</span>
            <Droplets className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="w-full bg-gray-900 h-2 rounded overflow-hidden mt-2">
            <div 
              className={`h-full ${isCritical ? 'bg-red-500' : 'bg-cyan-500'} transition-all duration-300`} 
              style={{ width: `${floodSpread}%` }}
            />
          </div>
          <div className="text-right text-xs mt-1">{floodSpread.toFixed(1)}%</div>
        </div>

        <div className="bg-black/50 p-4 rounded border border-cyan-500/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-cyan-300/70">ACTIVE HAZARD ZONES</span>
            <MapPin className="w-4 h-4 text-red-400" />
          </div>
          <ul className="text-sm space-y-2 mt-3">
            <li className="flex justify-between"><span className="text-gray-400">Sector 7G</span> <span className={floodMode && floodSpread > 10 ? 'text-red-500' : 'text-green-500'}>{floodMode && floodSpread > 10 ? 'FLOODED' : 'CLEAR'}</span></li>
            <li className="flex justify-between"><span className="text-gray-400">Downtown Ave</span> <span className={floodMode && floodSpread > 30 ? 'text-red-500' : 'text-green-500'}>{floodMode && floodSpread > 30 ? 'FLOODED' : 'CLEAR'}</span></li>
            <li className="flex justify-between"><span className="text-gray-400">Bridge 04</span> <span className={floodMode && floodSpread > 60 ? 'text-red-500' : 'text-green-500'}>{floodMode && floodSpread > 60 ? 'COMPROMISED' : 'CLEAR'}</span></li>
          </ul>
        </div>
      </div>
    </motion.div>
  );
}
