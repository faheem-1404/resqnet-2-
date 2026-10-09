'use client';

import React, { useEffect, useState, useRef } from 'react';
import CityMap from '@/components/CityMap';
import { useSimulationStore } from '@/store/simulationStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Droplets, Activity, Radio, Users,
  Play, Pause, RotateCcw, Terminal, AlertTriangle,
  Mic, MicOff, Volume2, Settings, Navigation, Cpu, MessageSquare
} from 'lucide-react';

export default function Home() {
  const {
    floodMode, setFloodMode,
    isPaused, togglePause,
    simulationSpeed, setSimulationSpeed,
    resetSimulation,
    floodSpread, floodZones,
    eta, survivors, survivorCount, setSurvivorCount,
    logs, selectionMode, setSelectionMode,
    optimizeMission, startMission, rainfallIntensity, setRainfallIntensity,
    speak, missionPaths, missionState, vehicleProgress, currentRescueIndex,
    isListening, setIsListening, lastVoiceCommand, setLastVoiceCommand, assistantResponse
  } = useSimulationStore();

  const recognitionRef = useRef<any>(null);

  // --- Jarvis Voice Recognition Engine ---
  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
        setLastVoiceCommand(transcript);
        handleVoiceCommand(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        if (event.error === 'no-speech') return; // Ignore silent errors
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        // Automatically restart if still meant to be listening (Jarvis Mode)
        if (useSimulationStore.getState().isListening) {
          try { recognitionRef.current.start(); } catch (e) { }
        }
      };
    }
  }, []);

  const handleVoiceCommand = (command: string) => {
    const cmd = command.toLowerCase();

    // Flood Controls
    if (cmd.includes('activate flood') || cmd.includes('start flood') || cmd.includes('enable flood')) setFloodMode(true);
    if (cmd.includes('deactivate flood') || cmd.includes('stop flood') || cmd.includes('disable flood')) setFloodMode(false);

    // Mission Controls
    if (cmd.includes('dispatch') || cmd.includes('start mission') || cmd.includes('go')) startMission();
    if (cmd.includes('pause') || cmd.includes('stop')) togglePause();
    if (cmd.includes('resume') || cmd.includes('continue')) togglePause();
    if (cmd.includes('reset') || cmd.includes('restart')) resetSimulation();
    if (cmd.includes('optimize') || cmd.includes('plan mission') || cmd.includes('locate')) optimizeMission();

    // Environment
    if (cmd.includes('increase rain') || cmd.includes('more rain')) setRainfallIntensity(Math.min(100, rainfallIntensity + 25));
    if (cmd.includes('decrease rain') || cmd.includes('less rain')) setRainfallIntensity(Math.max(0, rainfallIntensity - 25));

    // HUD / Navigation
    if (cmd.includes('show path') || cmd.includes('route info')) {
      speak("Displaying active tactical corridors.", { eventId: 'hud_info' });
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
        speak("Tactical AI listening. Command sequence ready.");
      } catch (e) { console.error("Mic start failed", e); }
    }
  };

  const currentStep = !useSimulationStore.getState().startPoint ? 1
    : survivors.length < survivorCount ? 2
      : missionPaths.length === 0 ? 3
        : missionState === 'COMPLETED' ? 4 : 4;

  const isMissionActive = missionState === 'DISPATCHED' || missionState === 'MOVING' || missionState === 'RESCUING' || missionState === 'REROUTING';

  return (
    <main className="w-screen h-screen relative bg-[#020205] overflow-hidden font-sans text-cyan-50 select-none">
      {/* 3D/Map Scene */}
      <div className="absolute inset-0 z-0">
        <CityMap />
      </div>

      {/* Overlay Scanlines */}
      <div className="absolute inset-0 pointer-events-none z-10 opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]" />

      {/* TOP HEADER */}
      <div className="absolute top-0 left-0 right-0 z-20 px-8 py-6 flex justify-between items-start pointer-events-none">
        <div className="flex flex-col">
          <div className="flex items-center space-x-4 mb-2">
            <div className="p-2 bg-cyan-500/20 rounded border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Shield className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter uppercase italic leading-none">
                ResQnet <span className="text-cyan-400 font-light"> </span>
              </h1>
              <p className="text-[10px] text-cyan-500/60 font-bold tracking-[0.3em] uppercase">
                Autonomous Disaster Intelligence
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-6 mt-4 pointer-events-auto">
            <div className="flex flex-col bg-black/40 backdrop-blur-md px-3 py-1 rounded border border-white/10">
              <span className="text-[8px] text-cyan-500/50 uppercase font-bold tracking-widest">System Status</span>
              <span className={`text-[10px] font-mono ${isMissionActive ? 'text-green-400' : 'text-cyan-400'}`}>
                {missionState === 'REROUTING' ? 'REROUTING_ACTIVE' : isMissionActive ? 'MISSION_ACTIVE' : 'SYSTEM_READY'}
              </span>
            </div>

            {/* VOICE ASSISTANT INDICATOR */}
            <button
              onClick={toggleListening}
              className={`group flex items-center space-x-3 px-4 py-2 rounded-full border transition-all duration-500 ${isListening ? 'bg-cyan-500/20 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.4)]' : 'bg-black/40 border-white/10 hover:border-white/30'}`}
            >
              <div className="relative">
                {isListening && <span className="absolute inset-0 rounded-full bg-cyan-400 animate-ping opacity-50"></span>}
                <div className={`p-1.5 rounded-full ${isListening ? 'bg-cyan-400 text-black' : 'bg-white/10 text-white/50'}`}>
                  {isListening ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                </div>
              </div>
              <div className="flex flex-col items-start leading-tight">
                <span className={`text-[8px] uppercase font-bold tracking-widest ${isListening ? 'text-cyan-400' : 'text-white/30'}`}>AI Assistant</span>
                <span className="text-[10px] font-mono uppercase tracking-tighter">
                  {isListening ? 'Listening...' : 'Voice Standby'}
                </span>
              </div>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-6 pointer-events-auto">
          <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-2 rounded-xl flex items-center space-x-4 shadow-2xl">
            <button onClick={togglePause} className="p-2 hover:bg-white/10 rounded transition-colors text-cyan-400">
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
            <button onClick={resetSimulation} className="p-2 hover:bg-white/10 rounded transition-colors text-cyan-400">
              <RotateCcw className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-white/10" />
            <div className="flex items-center space-x-3 px-2">
              <span className="text-[10px] font-mono opacity-50 uppercase tracking-widest">Speed</span>
              <input
                type="range" min="0.5" max="4" step="0.5"
                value={simulationSpeed}
                onChange={(e) => setSimulationSpeed(parseFloat(e.target.value))}
                className="w-20 accent-cyan-500"
              />
            </div>
          </div>

          <button
            onClick={() => setFloodMode(!floodMode)}
            className={`px-8 py-3 rounded border font-black uppercase tracking-widest text-sm transition-all ${floodMode
                ? 'bg-red-600 border-red-400 text-white shadow-[0_0_30px_rgba(220,38,38,0.5)] animate-pulse'
                : 'bg-cyan-600 border-cyan-400 text-black hover:bg-cyan-400'
              }`}
          >
            {floodMode ? 'STOP DISASTER' : 'ACTIVATE FLOOD MODE'}
          </button>
        </div>
      </div>

      {/* FLOATING VOICE FEEDBACK (Jarvis Style) */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-60 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center pointer-events-none"
          >
            <div className="bg-black/60 backdrop-blur-xl border border-cyan-500/30 px-6 py-3 rounded-full flex items-center space-x-4 shadow-[0_0_40px_rgba(6,182,212,0.2)]">
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [8, 20, 8] }}
                    transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                    className="w-1 bg-cyan-400 rounded-full"
                  />
                ))}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-cyan-400/60 uppercase tracking-widest">Tactical Recognition</span>
                <span className="text-sm font-bold text-white tracking-tight">
                  {lastVoiceCommand || "Standing by for command..."}
                </span>
              </div>
            </div>
            {assistantResponse && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="mt-3 text-cyan-400 font-mono text-[10px] uppercase tracking-widest bg-cyan-500/10 px-3 py-1 rounded border border-cyan-500/20"
              >
                AI: {assistantResponse}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* LEFT PANEL: DISASTER INTEL */}
      <motion.div
        initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
        className="absolute top-36 left-8 w-80 z-20 space-y-4 pointer-events-none"
      >
        <div className="bg-black/70 backdrop-blur-2xl border border-white/10 p-5 rounded-2xl pointer-events-auto shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2 text-cyan-400">
              <Droplets className="w-4 h-4" />
              <h3 className="text-xs font-black uppercase tracking-widest">Disaster Intel</h3>
            </div>
            <span className="text-[10px] font-mono text-cyan-500/60">LVL_04</span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-[9px] uppercase font-bold mb-2 opacity-60 tracking-widest">
                <span>Flood Saturation</span>
                <span>{floodSpread.toFixed(1)}%</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full ${floodMode ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' : 'bg-cyan-500'}`}
                  animate={{ width: `${floodSpread}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-[8px] uppercase font-bold opacity-40 block mb-1 tracking-widest">Risk Index</span>
                <span className={`text-sm font-black ${floodMode ? 'text-red-500' : 'text-cyan-400'}`}>
                  {floodMode ? 'CRITICAL' : 'NOMINAL'}
                </span>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <span className="text-[8px] uppercase font-bold opacity-40 block mb-1 tracking-widest">Rainfall</span>
                <span className="text-sm font-black text-cyan-400">{rainfallIntensity}mm/h</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-black/70 backdrop-blur-2xl border border-white/10 p-5 rounded-2xl pointer-events-auto shadow-2xl">
          <div className="flex items-center space-x-2 text-cyan-400 mb-4">
            <Settings className="w-4 h-4" />
            <h3 className="text-xs font-black uppercase tracking-widest">Deployment Control</h3>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <span className="text-[9px] uppercase font-bold opacity-40 tracking-widest text-center">
                Step {currentStep}: {
                  currentStep === 1 ? 'Establish Base' :
                    currentStep === 2 ? 'Localize Survivors' :
                      currentStep === 3 ? 'Confirm Dispatch' : 'Mission Ongoing'
                }
              </span>
              <div className="flex justify-between space-x-1">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= currentStep ? 'bg-cyan-500 shadow-[0_0_8px_#06b6d4]' : 'bg-white/10'}`} />
                ))}
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <div className="flex justify-between items-center text-[9px] uppercase font-bold opacity-40 tracking-widest">
                <span>Survivor Target Count</span>
                <span className="text-cyan-400 font-black">{survivorCount}</span>
              </div>
              <input
                type="range" min="2" max="20" step="1"
                disabled={missionState !== 'IDLE'}
                value={survivorCount}
                onChange={(e) => setSurvivorCount(parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            {currentStep === 3 && (
              <div className="space-y-2">
                <button
                  onClick={optimizeMission}
                  className="w-full py-2 bg-white/5 border border-white/10 text-cyan-400 font-bold uppercase tracking-widest text-[10px] rounded-lg hover:bg-white/10"
                >
                  Optimize Rescue Sequence
                </button>
                {missionPaths.length > 0 && missionState === 'IDLE' && (
                  <button
                    onClick={startMission}
                    className="w-full py-3 bg-cyan-500 text-black font-black uppercase tracking-tighter text-sm rounded-lg hover:bg-cyan-400 transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                  >
                    DISPATCH RESCUE UNIT
                  </button>
                )}
              </div>
            )}

            {missionState === 'COMPLETED' && (
              <div className="bg-green-500/20 border border-green-500/50 p-3 rounded-xl text-center">
                <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">Mission Successfully Completed</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* RIGHT PANEL: RESCUE OPS */}
      <motion.div
        initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
        className="absolute top-36 right-8 w-80 z-20 space-y-4 pointer-events-none"
      >
        <div className="bg-black/70 backdrop-blur-2xl border border-white/10 p-5 rounded-2xl pointer-events-auto shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2 text-orange-400">
              <Users className="w-4 h-4" />
              <h3 className="text-xs font-black uppercase tracking-widest">Rescue Operations</h3>
            </div>
            <Volume2 className="w-3 h-3 text-white/30 animate-pulse" />
          </div>

          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[8px] uppercase font-bold opacity-40 tracking-widest mb-1">Target Sec</span>
                <span className="text-2xl font-black text-orange-400">
                  {survivors.filter(s => s.status !== 'rescued').length}
                </span>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="flex flex-col text-right">
                <span className="text-[8px] uppercase font-bold opacity-40 tracking-widest mb-1">Mission Progress</span>
                <span className="text-2xl font-black text-green-500">
                  {(() => {
                    if (missionState === 'COMPLETED') return '100%';
                    if (missionPaths.length === 0) return '0%';
                    const totalDist = missionPaths.reduce((acc, p) => acc + p.distance, 0);
                    const completedDist = missionPaths.slice(0, currentRescueIndex).reduce((acc, p) => acc + p.distance, 0);
                    const currentSegDist = vehicleProgress;
                    const percent = Math.min(99, Math.round(((completedDist + currentSegDist) / totalDist) * 100));
                    return `${percent}%`;
                  })()}
                </span>
              </div>
            </div>

            <div className="h-px bg-white/5" />

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[9px] uppercase font-bold opacity-40 tracking-widest">Unit ETA</span>
                <span className="text-sm font-black text-cyan-400">{eta ? `${Math.round(eta / 60)}m` : '--'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[9px] uppercase font-bold opacity-40 tracking-widest">Status</span>
                <span className={`text-[9px] font-black uppercase tracking-widest ${missionPaths.length > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {missionPaths.length > 0 ? 'OPTIMIZED_PATH' : 'NO_ACTIVE_MISSION'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-black/70 backdrop-blur-2xl border border-white/10 p-5 rounded-2xl pointer-events-auto shadow-2xl">
          <div className="flex items-center space-x-2 text-cyan-400 mb-4">
            <Navigation className="w-4 h-4" />
            <h3 className="text-xs font-black uppercase tracking-widest">Navigation Data</h3>
          </div>
          <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
            {survivors.map((s, i) => (
              <div key={s.id} className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/5">
                <div className="flex items-center space-x-3">
                  <div className={`w-1.5 h-1.5 rounded-full ${s.status === 'rescued' ? 'bg-green-500' : s.status === 'target' ? 'bg-orange-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className="text-[10px] font-bold opacity-70">{s.label}</span>
                </div>
                <span className="text-[8px] font-mono opacity-40">LAT: {s.lat.toFixed(3)}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* BOTTOM PANEL: AI LOGS */}
      <motion.div
        initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="absolute bottom-8 left-8 right-8 h-44 z-20 pointer-events-none"
      >
        <div className="w-full h-full bg-black/80 backdrop-blur-3xl border border-white/10 rounded-2xl overflow-hidden pointer-events-auto flex flex-col shadow-2xl">
          <div className="px-5 py-3 bg-white/5 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center space-x-3">
              <Terminal className="w-4 h-4 text-cyan-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-cyan-500/80">Autonomous Command Center</span>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-[9px] font-mono opacity-40">UAV_LINK: ACTIVE</span>
              <span className="text-[9px] font-mono opacity-40">LATENCY: 1.4ms</span>
            </div>
          </div>
          <div className="flex-grow p-4 font-mono text-[11px] overflow-y-auto space-y-1.5 custom-scrollbar bg-[#020205]/40">
            <AnimatePresence initial={false}>
              {logs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  className={`flex items-start space-x-3 ${log.type === 'error' ? 'text-red-400' :
                      log.type === 'warning' ? 'text-orange-400' :
                        log.type === 'success' ? 'text-green-400' : 'text-cyan-200/70'
                    }`}
                >
                  <span className="opacity-30 whitespace-nowrap">[{log.timestamp}]</span>
                  <span className="opacity-40">{'>'}</span>
                  <span className="tracking-tight">{log.message}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.02); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 255, 255, 0.2); border-radius: 10px; }
      `}</style>
    </main>
  );
}
