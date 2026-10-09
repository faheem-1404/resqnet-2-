'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Circle,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSimulationStore, MissionPath } from '@/store/simulationStore';

const CENTER: [number, number] = [13.3954, 77.7276];

// --- Custom Icons ---
const makeIcon = (html: string, size: [number, number] = [32, 32]) =>
  L.divIcon({ html, className: '', iconSize: size, iconAnchor: [size[0] / 2, size[1] / 2] });

const baseIcon = makeIcon(`
  <div class="relative flex items-center justify-center">
    <div class="absolute w-12 h-12 bg-cyan-500 rounded-full animate-ping opacity-20"></div>
    <div class="w-8 h-8 bg-black border-2 border-cyan-500 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.6)]">
      <span class="text-xs">🏥</span>
    </div>
  </div>
`);

const survivorIcon = (status: string, isTarget: boolean) => makeIcon(`
  <div class="relative flex items-center justify-center">
    ${status === 'pending' ? `
      <div class="absolute ${isTarget ? 'w-10 h-10 bg-orange-500' : 'w-6 h-6 bg-red-500'} rounded-full animate-ping opacity-20"></div>
    ` : ''}
    <div class="w-6 h-6 ${status === 'rescued' ? 'bg-green-500 border-green-300' : isTarget ? 'bg-orange-500 border-orange-300 shadow-[0_0_15px_#f97316]' : 'bg-red-600 border-red-400'} border-2 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500">
      <span class="text-[10px]">${status === 'rescued' ? '✔️' : '🆘'}</span>
    </div>
  </div>
`);

const ambulanceIcon = (angle: number) => makeIcon(`
  <div style="transform: rotate(${angle}deg); transition: transform 0.1s linear;" class="relative">
    <div class="w-10 h-5 bg-white border-2 border-red-600 rounded flex items-center shadow-2xl overflow-hidden">
      <div class="absolute inset-0 bg-red-600/10 animate-pulse"></div>
      <div class="w-1/3 h-full bg-red-600 flex items-center justify-center">
        <div class="w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_10px_white]"></div>
      </div>
      <div class="flex-grow flex items-center justify-center">
         <span class="text-[10px] rotate-[-90deg]">🚑</span>
      </div>
    </div>
  </div>
`, [40, 20]);

// --- Utils ---
function getAngle(p1: [number, number], p2: [number, number]) {
  return Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) * (180 / Math.PI) + 90;
}

function getDistance(p1: [number, number], p2: [number, number]) {
  return L.latLng(p1[0], p1[1]).distanceTo(L.latLng(p2[0], p2[1]));
}

function interpolatePathByDistance(path: [number, number][], progressDist: number): [number, number] {
  if (!path || path.length === 0) return [0, 0];
  if (path.length === 1) return path[0];

  // Guard against negative progress
  const targetDist = Math.max(0, progressDist);

  let accumulatedDist = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const d = getDistance(path[i], path[i + 1]);
    if (accumulatedDist + d >= targetDist) {
      const remaining = targetDist - accumulatedDist;
      // Guard against division by zero if two points are identical
      const frac = d > 0 ? remaining / d : 0;
      return [
        path[i][0] + (path[i + 1][0] - path[i][0]) * frac,
        path[i][1] + (path[i + 1][1] - path[i][1]) * frac
      ];
    }
    accumulatedDist += d;
  }
  return path[path.length - 1];
}

async function fetchRoute(start: [number, number], end: [number, number]) {
  const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.code === 'Ok' && data.routes[0]) {
      return {
        coords: data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]),
        duration: data.routes[0].duration,
        distance: data.routes[0].distance
      };
    }
  } catch (e) { console.error(e); }
  return null;
}

function MapInteraction() {
  const { selectionMode, setStartPoint, addSurvivor, addFloodZone, floodMode } = useSimulationStore();
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      if (selectionMode === 'base') setStartPoint(lat, lng);
      else if (selectionMode === 'survivor') addSurvivor(lat, lng);
      else if (selectionMode === 'flood' || floodMode) addFloodZone(lat, lng);
    }
  });
  return null;
}

export default function MapCore() {
  const {
    startPoint, survivors, floodZones, missionPaths, vehicleProgress,
    currentRescueIndex, setMissionPaths, updateCurrentPath, triggerReroute, tick,
    isPaused, simulationSpeed, floodMode, missionState, rainfallIntensity
  } = useSimulationStore();

  const [ambulanceAngle, setAmbulanceAngle] = useState(0);
  const missionInitializedRef = useRef(false);

  // Tick Loop
  useEffect(() => {
    let raf: number;
    let lastTime = performance.now();
    const loop = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;
      tick(delta);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [tick]);

  // Mission Initialization
  useEffect(() => {
    if (!startPoint) { missionInitializedRef.current = false; return; }
    if (missionState === 'OPTIMIZING' && survivors.length > 0 && !missionInitializedRef.current) {
      missionInitializedRef.current = true;
      const initMission = async () => {
        let currentPos = startPoint;
        let pool = [...survivors];
        const paths: MissionPath[] = [];
        while (pool.length > 0) {
          let nearest = pool[0];
          let minDist = Infinity;
          pool.forEach(sv => {
            const d = Math.sqrt(Math.pow(sv.lat - currentPos[0], 2) + Math.pow(sv.lng - currentPos[1], 2));
            if (d < minDist) { minDist = d; nearest = sv; }
          });
          const res = await fetchRoute(currentPos, [nearest.lat, nearest.lng]);
          if (res) {
            paths.push({ id: Math.random().toString(36), coords: res.coords, targetSurvivorId: nearest.id, eta: res.duration, distance: res.distance });
            currentPos = [nearest.lat, nearest.lng];
          }
          pool = pool.filter(p => p.id !== nearest.id);
        }
        setMissionPaths(paths);
      };
      initMission();
    }
  }, [missionState, startPoint, survivors, setMissionPaths]);

  // LIVE Danger Detection & Rerouting
  useEffect(() => {
    if (missionState !== 'MOVING' || currentRescueIndex < 0 || !missionPaths[currentRescueIndex] || isPaused || !floodMode) return;

    const checkHazards = async () => {
      const activePath = missionPaths[currentRescueIndex].coords;
      for (const zone of floodZones) {
        let accumulated = 0;
        let startIndex = 0;
        for (let i = 0; i < activePath.length - 1; i++) {
          accumulated += getDistance(activePath[i], activePath[i + 1]);
          if (accumulated >= vehicleProgress) { startIndex = i; break; }
        }

        // Check 200m ahead on the path for hazards
        const checkRange = vehicleProgress + 200;
        for (let i = startIndex; i < activePath.length; i++) {
          const pt = activePath[i];
          const distToZone = L.latLng(pt[0], pt[1]).distanceTo(L.latLng(zone.lat, zone.lng));
          if (distToZone < zone.radius) {
            triggerReroute('Active corridor compromised.');
            const currentVehiclePos = interpolatePathByDistance(activePath, vehicleProgress);
            const targetSurvivor = survivors.find(s => s.id === missionPaths[currentRescueIndex].targetSurvivorId);
            if (targetSurvivor) {
              const res = await fetchRoute(currentVehiclePos, [targetSurvivor.lat, targetSurvivor.lng]);
              if (res) updateCurrentPath(res.coords, res.duration, res.distance);
            }
            return;
          }
        }
      }
    };
    const interval = setInterval(checkHazards, 400); // 400ms check for "immediate" feel
    return () => clearInterval(interval);
  }, [missionState, missionPaths, currentRescueIndex, floodZones, vehicleProgress, floodMode, isPaused, survivors, triggerReroute, updateCurrentPath]);

  // Vehicle Position and Angle
  const rawVehiclePos = (currentRescueIndex >= 0 && missionPaths[currentRescueIndex])
    ? interpolatePathByDistance(missionPaths[currentRescueIndex].coords, vehicleProgress)
    : null;

  // Validation: Ensure no NaN values reach Leaflet
  const vehiclePos: [number, number] | null = (rawVehiclePos && !isNaN(rawVehiclePos[0]) && !isNaN(rawVehiclePos[1]))
    ? rawVehiclePos
    : null;

  useEffect(() => {
    if (vehiclePos && missionPaths[currentRescueIndex]) {
      const path = missionPaths[currentRescueIndex].coords;
      const nextPos = interpolatePathByDistance(path, vehicleProgress + 1);
      setAmbulanceAngle(getAngle(vehiclePos, nextPos));
    }
  }, [vehiclePos, vehicleProgress, currentRescueIndex, missionPaths]);

  return (
    <div className="relative w-full h-full">
      <MapContainer center={CENTER} zoom={15} className="w-full h-full bg-[#050510]" zoomControl={false}>
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution='&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        />
        {/* Optional: Add a subtle overlay to keep the techy feel while being bright */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
          opacity={0.6}
        />
        <MapInteraction />
        {startPoint && <Marker position={startPoint} icon={baseIcon} />}
        {survivors.map(s => <Marker key={s.id} position={[s.lat, s.lng]} icon={survivorIcon(s.status, missionPaths[currentRescueIndex]?.targetSurvivorId === s.id)} />)}
        {floodZones.map(z => <Circle key={z.id} center={[z.lat, z.lng]} radius={z.radius} pathOptions={{ fillOpacity: 0.3, weight: 2, className: 'flood-ripple' }} />)}

        {missionPaths.map((path, idx) => {
          const isCompleted = idx < currentRescueIndex;
          const isActive = idx === currentRescueIndex;
          const isUpcoming = idx > currentRescueIndex;
          return (
            <Polyline
              key={path.id}
              positions={path.coords}
              pathOptions={{
                color: missionState === 'REROUTING' && isActive ? '#ef4444' : isCompleted ? '#1e293b' : isActive ? '#06b6d4' : '#f59e0b',
                weight: isActive ? 5 : 3,
                opacity: isCompleted ? 0.3 : isActive ? 1 : 0.4,
                dashArray: isActive ? '10, 10' : '5, 10',
                className: isActive ? 'active-route-line' : ''
              }}
            />
          );
        })}
        {vehiclePos && <Marker position={vehiclePos} icon={ambulanceIcon(ambulanceAngle)} />}
      </MapContainer>

      {floodMode && (
        <div className="absolute inset-0 pointer-events-none z-[9999] overflow-hidden bg-white/5">
          <div className="rain-container">
            {Array.from({ length: Math.floor((rainfallIntensity / 100) * 150) + 50 }).map((_, i) => (
              <div
                key={i}
                className="rain-drop"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `-${Math.random() * 20}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${0.2 + Math.random() * 0.3}s`
                }}
              />
            ))}
          </div>
        </div>
      )}

      <style jsx global>{`
        .active-route-line { animation: routeFlow 10s linear infinite; }
        @keyframes routeFlow { from { stroke-dashoffset: 200; } to { stroke-dashoffset: 0; } }
        
        .flood-ripple { 
          animation: floodPattern 4s ease-in-out infinite; 
        }
        
        @keyframes floodPattern { 
          0% { stroke: #ff9800; fill: #00bcd4; fill-opacity: 0.2; stroke-width: 2; }
          50% { stroke: #00bcd4; fill: #ff9800; fill-opacity: 0.4; stroke-width: 5; }
          100% { stroke: #ff9800; fill: #00bcd4; fill-opacity: 0.2; stroke-width: 2; }
        }

        .rain-container { position: absolute; width: 100%; height: 100%; }
        .rain-drop { 
          position: absolute; 
          width: 2px; 
          height: 150px; 
          background: linear-gradient(transparent, rgba(255, 255, 255, 0.8)); 
          box-shadow: 0 0 10px rgba(0, 242, 255, 0.5);
          animation: rainFall linear infinite; 
        }
        @keyframes rainFall { 0% { transform: translateY(-150px); } 100% { transform: translateY(100vh); } }
      `}</style>
    </div>
  );
}
