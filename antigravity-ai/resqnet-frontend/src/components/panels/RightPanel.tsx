"use client";
import { motion } from 'framer-motion';
import { Users, Clock, Crosshair, Route } from 'lucide-react';

export default function RightPanel({ survivors, floodMode }: { survivors: number, floodMode: boolean }) {
  return (
    <motion.div 
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-80 h-[70vh] glass-panel p-6 flex flex-col space-y-6 pointer-events-auto"
    >
      <div className="flex items-center space-x-3 border-b border-cyan-500/30 pb-4">
        <Users className="w-6 h-6 text-cyan-400" />
        <h2 className="text-xl font-bold tracking-wider">RESCUE OPS</h2>
      </div>

      <div className="space-y-4 flex-grow">
        <div className="bg-black/50 p-4 rounded border border-cyan-500/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-cyan-300/70">SURVIVORS DETECTED</span>
            <Crosshair className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="text-4xl font-bold text-cyan-400 neon-text">
            {floodMode ? survivors : 0}
          </div>
        </div>

        <div className="bg-black/50 p-4 rounded border border-cyan-500/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-cyan-300/70">DRONE STATUS</span>
            <div className="flex space-x-1">
              <div className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
              <div className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" style={{ animationDelay: '200ms' }} />
              <div className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" style={{ animationDelay: '400ms' }} />
            </div>
          </div>
          <div className="text-sm mt-2 text-cyan-300">
            3 UAVs ACTIVE • SCANNING SECTORS
          </div>
        </div>

        <div className="bg-black/50 p-4 rounded border border-cyan-500/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-cyan-300/70">ROUTE STATUS</span>
            <Route className={`w-4 h-4 ${floodMode ? 'text-yellow-500' : 'text-cyan-500'}`} />
          </div>
          <div className={`text-lg font-bold mt-1 ${floodMode ? 'text-yellow-500' : 'text-green-500'}`}>
            {floodMode ? 'REROUTING REQUIRED' : 'OPTIMAL'}
          </div>
          <div className="text-xs text-gray-400 mt-2 flex items-center justify-between">
            <span>Rescue ETA:</span>
            <span className="text-cyan-400 flex items-center"><Clock className="w-3 h-3 mr-1"/> {floodMode ? '14m 30s' : '05m 12s'}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
