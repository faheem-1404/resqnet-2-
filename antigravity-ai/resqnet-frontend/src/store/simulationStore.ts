import { create } from 'zustand';

export type LogType = 'info' | 'warning' | 'error' | 'success';
export type MissionState = 'IDLE' | 'OPTIMIZING' | 'DISPATCHED' | 'MOVING' | 'RESCUING' | 'REROUTING' | 'COMPLETED';

export interface LogEntry {
  id: string;
  message: string;
  type: LogType;
  timestamp: string;
}

export interface FloodZone {
  id: string;
  lat: number;
  lng: number;
  radius: number;
  maxRadius: number;
}

export interface Survivor {
  id: string;
  lat: number;
  lng: number;
  status: 'pending' | 'target' | 'rescued';
  label: string;
}

export interface MissionPath {
  id: string;
  coords: [number, number][];
  targetSurvivorId: string;
  eta: number;
  distance: number;
}

export type SelectionMode = 'base' | 'survivor' | 'flood' | 'idle';

const makeid = () => Math.random().toString(36).slice(2);
const ts = () => new Date().toLocaleTimeString('en-US', { hour12: false });
const mklog = (message: string, type: LogType): LogEntry => ({ id: makeid(), message, type, timestamp: ts() });

interface SimulationState {
  // Config
  floodMode: boolean;
  isPaused: boolean;
  simulationSpeed: number;
  selectionMode: SelectionMode;
  survivorCount: number;
  missionState: MissionState;
  
  // Entities
  startPoint: [number, number] | null;
  survivors: Survivor[];
  floodZones: FloodZone[];
  
  // Routing
  missionPaths: MissionPath[];
  currentRescueIndex: number;
  vehicleProgress: number; 
  isRerouting: boolean;
  
  // Stats
  floodSpread: number;
  rainfallIntensity: number;
  
  // UI/Voice
  logs: LogEntry[];
  lastVoiceCommand: string;
  assistantResponse: string;
  isListening: boolean;
  lastSpoken: Record<string, number>; // Event ID -> timestamp

  // Actions
  setSelectionMode: (mode: SelectionMode) => void;
  setSurvivorCount: (count: number) => void;
  setStartPoint: (lat: number, lng: number) => void;
  addSurvivor: (lat: number, lng: number) => void;
  addFloodZone: (lat: number, lng: number) => void;
  setFloodMode: (active: boolean) => void;
  togglePause: () => void;
  setSimulationSpeed: (speed: number) => void;
  setRainfallIntensity: (val: number) => void;
  setIsListening: (val: boolean) => void;
  setLastVoiceCommand: (cmd: string) => void;
  
  // Logic
  optimizeMission: () => void;
  setMissionPaths: (paths: MissionPath[]) => void;
  updateCurrentPath: (coords: [number, number][], eta: number, distance: number) => void;
  startMission: () => void;
  triggerReroute: (reason: string, eventId?: string) => void;
  addLog: (message: string, type?: LogType) => void;
  resetSimulation: () => void;
  tick: (delta: number) => void;
  speak: (text: string, options?: { priority?: boolean; eventId?: string; cooldown?: number }) => void;
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  floodMode: false,
  isPaused: false,
  simulationSpeed: 1.5,
  selectionMode: 'base',
  survivorCount: 3,
  missionState: 'IDLE',

  startPoint: null,
  survivors: [],
  floodZones: [],

  missionPaths: [],
  currentRescueIndex: -1,
  vehicleProgress: 0,
  isRerouting: false,

  floodSpread: 0,
  rainfallIntensity: 20,

  logs: [mklog('Tactical Intelligence Online. Standby for initialization.', 'info')],
  lastVoiceCommand: '',
  assistantResponse: '',
  isListening: false,
  lastSpoken: {},

  setSelectionMode: (mode) => set({ selectionMode: mode }),
  setSurvivorCount: (count) => set({ survivorCount: count }),
  setIsListening: (val) => set({ isListening: val }),
  setLastVoiceCommand: (cmd) => set({ lastVoiceCommand: cmd }),

  setStartPoint: (lat, lng) => set((s) => ({
    startPoint: [lat, lng],
    selectionMode: 'survivor',
    logs: [mklog(`Base established. Initiating local scanning.`, 'success'), ...s.logs]
  })),

  addSurvivor: (lat, lng) => set((s) => {
    if (s.survivors.length >= s.survivorCount) return s;
    const newSurvivor: Survivor = {
      id: makeid(),
      lat,
      lng,
      status: 'pending',
      label: `Sector ${s.survivors.length + 1}`
    };
    const nextMode = s.survivors.length + 1 >= s.survivorCount ? 'idle' : 'survivor';
    return {
      survivors: [...s.survivors, newSurvivor],
      selectionMode: nextMode,
      logs: [mklog(`Signal localized: ${newSurvivor.label}.`, 'warning'), ...s.logs]
    };
  }),

  addFloodZone: (lat, lng) => set((s) => {
    const newZone: FloodZone = { id: makeid(), lat, lng, radius: 40, maxRadius: 500 };
    return {
      floodZones: [...s.floodZones, newZone],
      logs: [mklog(`Hazard expansion detected. Updating risk grid.`, 'error'), ...s.logs]
    };
  }),

  setFloodMode: (active) => set((s) => {
    get().speak(active ? "Disaster Protocol Alpha active. Rainfall intensity normalized." : "Disaster Protocol Standby.", { eventId: 'flood_mode_toggle' });
    return {
      floodMode: active,
      selectionMode: active ? 'flood' : s.selectionMode,
      assistantResponse: active ? "Flood mode activated." : "Flood mode deactivated.",
      logs: [mklog(active ? "FLOOD_MODE: ACTIVE" : "FLOOD_MODE: STANDBY", active ? 'error' : 'info'), ...s.logs]
    };
  }),

  togglePause: () => set((s) => {
    const next = !s.isPaused;
    get().speak(next ? "Mission paused." : "Mission resumed.", { eventId: 'pause_toggle', cooldown: 2000 });
    return { isPaused: next, assistantResponse: next ? "Paused." : "Resumed." };
  }),

  setSimulationSpeed: (speed) => set({ simulationSpeed: speed }),
  setRainfallIntensity: (val) => set({ rainfallIntensity: val }),

  optimizeMission: () => {
    const s = get();
    if (!s.startPoint || s.survivors.length === 0) return;
    set({ missionState: 'OPTIMIZING', currentRescueIndex: 0, vehicleProgress: 0 });
    get().speak("Optimizing rescue sequence. Analyzing road accessibility.", { eventId: 'optimizing' });
  },

  setMissionPaths: (paths) => {
    set({ missionPaths: paths });
    if (paths.length > 0) get().startMission();
  },
  
  updateCurrentPath: (coords, eta, distance) => set((s) => {
    if (s.currentRescueIndex < 0 || !s.missionPaths[s.currentRescueIndex]) return s;
    const newPaths = [...s.missionPaths];
    newPaths[s.currentRescueIndex] = { ...newPaths[s.currentRescueIndex], coords, eta, distance };
    return { 
      missionPaths: newPaths, 
      isRerouting: false, 
      missionState: 'MOVING' 
    };
  }),

  startMission: () => {
    set({ missionState: 'DISPATCHED', assistantResponse: "Unit dispatched." });
    get().speak("Alternative routes cleared. Dispatching rescue unit.", { eventId: 'dispatch' });
    setTimeout(() => set({ missionState: 'MOVING' }), 500);
  },

  triggerReroute: (reason, eventId = 'hazard_detected') => {
    const s = get();
    if (s.missionState === 'REROUTING') return;
    
    set({
      isRerouting: true,
      missionState: 'REROUTING',
      assistantResponse: "Rerouting.",
      logs: [mklog(`Danger detected on corridor. Adjusting route.`, 'warning'), ...s.logs]
    });
    
    // Context-aware speech
    const lastRerouteTime = s.lastSpoken['reroute_event'] || 0;
    const now = Date.now();
    if (now - lastRerouteTime < 15000) {
      get().speak("Optimizing alternative path.", { eventId: 'reroute_event', cooldown: 15000 });
    } else {
      get().speak("Danger detected ahead. Generating alternative route.", { eventId: 'reroute_event', cooldown: 15000 });
    }
  },

  addLog: (message, type = 'info') => set((s) => ({
    logs: [mklog(message, type), ...s.logs].slice(0, 50)
  })),

  resetSimulation: () => {
    get().speak("System reset complete. Standby for new mission.", { eventId: 'reset' });
    set({
      floodMode: false,
      isPaused: false,
      selectionMode: 'base',
      startPoint: null,
      survivors: [],
      floodZones: [],
      missionPaths: [],
      currentRescueIndex: -1,
      vehicleProgress: 0,
      missionState: 'IDLE',
      floodSpread: 0,
      assistantResponse: "System reset.",
      logs: [mklog('System reboot complete.', 'info')]
    });
  },

  tick: (delta) => set((s) => {
    if (s.isPaused) return {};
    const dt = delta * s.simulationSpeed;

    const floodZones = s.floodZones.map(z => ({
      ...z,
      radius: Math.min(z.radius + dt * (s.rainfallIntensity / 10), z.maxRadius)
    }));

    let vehicleProgress = s.vehicleProgress;
    let currentRescueIndex = s.currentRescueIndex;
    let survivors = [...s.survivors];
    let missionState = s.missionState;

    if (missionState === 'MOVING' && currentRescueIndex >= 0 && s.missionPaths[currentRescueIndex]) {
      const currentPath = s.missionPaths[currentRescueIndex];
      const moveSpeed = 40 * s.simulationSpeed; 
      vehicleProgress += dt * moveSpeed;

      if (vehicleProgress >= currentPath.distance) {
        missionState = 'RESCUING';
        const targetId = currentPath.targetSurvivorId;
        const targetName = survivors.find(sv => sv.id === targetId)?.label || "Target";
        survivors = survivors.map(sv => sv.id === targetId ? { ...sv, status: 'rescued' as const } : sv);
        
        get().speak(`${targetName} secured. Moving to next target.`, { eventId: `rescue_${targetId}`, priority: true });
        get().addLog(`${targetName} successfully extracted.`, 'success');

        if (currentRescueIndex + 1 < s.missionPaths.length) {
          currentRescueIndex += 1;
          vehicleProgress = 0;
          missionState = 'MOVING';
        } else {
          currentRescueIndex = -1;
          missionState = 'COMPLETED';
          get().speak("Mission complete. All targets successfully secured.", { eventId: 'mission_complete' });
          get().addLog("MISSION COMPLETE.", "success");
        }
      }
    }

    return { 
      floodZones, 
      vehicleProgress, 
      currentRescueIndex, 
      survivors,
      missionState,
      floodSpread: Math.min(100, s.floodSpread + (s.floodMode ? dt * 0.2 : 0))
    };
  }),

  speak: (text, options = {}) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    
    const { priority = false, eventId, cooldown = 15000 } = options;
    const s = get();
    const now = Date.now();
    
    // Check Event-based Cooldown
    const key = eventId || text;
    if (!priority && s.lastSpoken[key] && (now - s.lastSpoken[key] < cooldown)) {
      return; 
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = 0.9;
    utterance.rate = 1.05;
    utterance.volume = 1.0;
    
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Daniel') || v.name.includes('Google UK English Male') || v.name.includes('Male'));
    if (preferredVoice) utterance.voice = preferredVoice;

    if (priority) window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    
    set((state) => ({
      lastSpoken: { ...state.lastSpoken, [key]: now }
    }));
  }
}));
