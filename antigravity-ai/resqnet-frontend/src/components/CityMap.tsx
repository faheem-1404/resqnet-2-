'use client';

import dynamic from 'next/dynamic';

// Must be dynamically imported with SSR disabled — Leaflet requires `window`
const MapCore = dynamic(() => import('./MapCore'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#050510]">
      <div className="text-cyan-400 font-mono text-sm animate-pulse">
        Initializing Rescue Map...
      </div>
    </div>
  ),
});

export default function CityMap() {
  return <MapCore />;
}
