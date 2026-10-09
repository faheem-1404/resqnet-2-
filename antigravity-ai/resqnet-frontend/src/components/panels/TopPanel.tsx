"use client";
import { motion } from 'framer-motion';
import { RadioReceiver } from 'lucide-react';

export default function TopPanel({ floodMode, setFloodMode }: { floodMode: boolean, setFloodMode: (val: boolean) => void }) {
  return (
    <motion.div 
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="w-full flex justify-between items-center pointer-events-auto"
    >
      <div className="glass-panel px-6 py-3 flex items-center space-x-4">
        <RadioReceiver className="w-8 h-8 text-cyan-400" />
        <div>
          <h1 className="text-2xl font-black tracking-widest neon-text">RESQNET // ANTIGRAVITY</h1>
          <p className="text-[10px] text-cyan-500/80 tracking-widest uppercase">AI Disaster Intelligence Command</p>
        </div>
      </div>

      <div className="glass-panel px-6 py-3 flex items-center space-x-4">
        <div className="text-sm font-bold text-gray-300 mr-2">SIMULATION MODE:</div>
        <button 
          onClick={() => setFloodMode(!floodMode)}
          className={`px-6 py-2 rounded font-bold tracking-wider transition-all duration-300 border ${
            floodMode 
              ? 'bg-red-500/20 text-red-500 border-red-500 shadow-[0_0_15px_rgba(255,0,0,0.5)] animate-pulse' 
              : 'bg-cyan-500/10 text-cyan-400 border-cyan-500 hover:bg-cyan-500/30'
          }`}
        >
          {floodMode ? 'DISABLE FLOOD MODE' : 'ACTIVATE FLOOD MODE'}
        </button>
      </div>
    </motion.div>
  );
}
