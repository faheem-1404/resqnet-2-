export type RiskLevel = 'safe' | 'caution' | 'dangerous' | 'inaccessible';

export interface CellRisk {
  x: number;
  z: number;
  flood: number;
  traffic: number;
  crowd: number;
  rainfall: number;
  totalRisk: number;
  level: RiskLevel;
  color: string;
}

export interface FloodNode {
  x: number;
  z: number;
  intensity: number;
}

export class RiskEngine {
  /**
   * Generates a real-time danger score for every road and grid cell.
   */
  static generateGridRisk(citySize: number, globalFloodSpread: number, customFloods: FloodNode[], time: number): CellRisk[] {
    const grid: CellRisk[] = [];
    
    // Simulate global rainfall escalation
    const baseRainfall = Math.min(globalFloodSpread * 0.4, 40);
    
    // Step size for grid cells (matching road/building spacing)
    const step = 4;

    for (let x = -citySize; x <= citySize; x += step) {
      for (let z = -citySize; z <= citySize; z += step) {
        
        // Distance from city center
        const distFromCenter = Math.sqrt(x * x + z * z);
        
        // Dynamic environmental factors
        // Combine global flood spread and custom interactive floods
        let localFloodRisk = Math.max(0, (globalFloodSpread * 1.5) - distFromCenter);
        customFloods.forEach(f => {
          const distToFlood = Math.sqrt(Math.pow(x - f.x, 2) + Math.pow(z - f.z, 2));
          const fRisk = Math.max(0, f.intensity - (distToFlood * 2));
          localFloodRisk = Math.max(localFloodRisk, fRisk);
        });
        const floodRisk = localFloodRisk;
        
        // Traffic congestion (worse near center, oscillates dynamically)
        const trafficRisk = Math.max(0, (25 - distFromCenter) + Math.sin(time * 2 + x) * 15);
        
        // Crowd density (clusters in specific areas)
        const crowdRisk = Math.max(0, 15 + Math.cos(x * 0.5 + time) * 15 + Math.sin(z * 0.5) * 10);
        
        // Master Risk Formula
        const totalRisk = floodRisk + trafficRisk + crowdRisk + baseRainfall;
        
        let level: RiskLevel = 'safe';
        let color = '#00ff00'; // Green = Safe
        
        // Visual Requirements
        if (totalRisk >= 90) {
          level = 'inaccessible';
          color = '#000000'; // Black = Inaccessible
        } else if (totalRisk >= 65) {
          level = 'dangerous';
          color = '#ff0000'; // Red = Dangerous
        } else if (totalRisk >= 40) {
          level = 'caution';
          color = '#ffff00'; // Yellow = Caution
        }
        
        grid.push({
          x, z,
          flood: floodRisk,
          traffic: trafficRisk,
          crowd: crowdRisk,
          rainfall: baseRainfall,
          totalRisk,
          level,
          color
        });
      }
    }
    
    return grid;
  }
}
