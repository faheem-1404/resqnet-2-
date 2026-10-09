"use client";
import { motion } from 'framer-motion';
import { Terminal } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function BottomPanel({ floodMode }: { floodMode: boolean }) {
  const [logs, setLogs] = useState<string[]>([
    "SYS_INIT: ResQnet Antigravity System Online.",
    "SCAN: Monitoring sector stable.",
  ]);

  useEffect(() => {
    if (floodMode) {
      setLogs(prev => [...prev, "ALERT: Water levels rising. Simulation triggered.", "AI_ROUTING: Analyzing alternative paths."].slice(-4));
      
      const interval = setInterval(() => {
        const events = [
          "DRONE_01: Detecting thermal signatures.",
          "SYS_UPDATE: Road infrastructure integrity decreasing.",
          "AI_ROUTING: Path re-calculated to avoid zone B.",
          "ALERT: Flash flood warning activated."
        ];
        const randomEvent = events[Math.floor(Math.random() * events.length)];
        setLogs(prev => [...prev, randomEvent].slice(-4));
      }, 3000);
      return () => clearInterval(interval);
    } else {
      setLogs(["SYS_INIT: ResQnet Antigravity System Online.", "SCAN: Monitoring sector stable."]);
    }
  }, [floodMode]);

  return (
    <motion.div 
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="w-full h-40 glass-panel p-4 flex flex-col pointer-events-auto"
    >
      <div className="flex items-center space-x-2 mb-2 text-cyan-500">
        <Terminal className="w-4 h-4" />
        <h3 className="text-sm font-bold tracking-widest">LIVE SYSTEM LOGS</h3>
      </div>
      
      <div className="flex-grow bg-black/60 border border-cyan-900/50 rounded p-3 font-mono text-xs overflow-hidden flex flex-col justify-end space-y-1">
        {logs.map((log, i) => (
          <div key={i} className={`flex items-start ${log.includes('ALERT') ? 'text-red-400' : 'text-cyan-300'}`}>
            <span className="mr-2 opacity-50">{`>`}</span>
            <span className={log.includes('ALERT') ? 'animate-pulse' : ''}>{log}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
