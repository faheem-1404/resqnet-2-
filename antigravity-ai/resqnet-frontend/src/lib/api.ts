export async function fetchRescueRoute(
  startNode: [number, number],
  endNode: [number, number],
  dangerGrid: { x: number, z: number, totalRisk: number }[]
) {
  // Format the danger grid for the backend
  const formattedGrid: Record<string, number> = {};
  dangerGrid.forEach(cell => {
    formattedGrid[`${cell.x},${cell.z}`] = cell.totalRisk;
  });

  try {
    const res = await fetch('http://localhost:8000/api/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city_size: 20,
        step: 4,
        start_node: startNode,
        end_node: endNode,
        danger_grid: formattedGrid
      })
    });
    
    if (!res.ok) throw new Error("No safe path found");
    const data = await res.json();
    return data.path; // returns array of [x, z]
  } catch (error) {
    console.error("Routing error:", error);
    return null;
  }
}
