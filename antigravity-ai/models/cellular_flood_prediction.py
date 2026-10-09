import numpy as np
import matplotlib
matplotlib.use('TkAgg')
import matplotlib.pyplot as plt
import matplotlib.animation as animation
import argparse
import sys

class CellularFloodAutomata:
    """
    AI Flood Spread Prediction Engine using Cellular Automata.
    Simulates water physics, terrain influence, and dynamic road accessibility.
    """
    def __init__(self, size=50, spread_speed=0.15, rainfall=0.01):
        self.size = size
        self.spread_speed = spread_speed
        self.rainfall = rainfall
        
        # --- 1. Generate Terrain ---
        # Base terrain (0 to 1 height)
        self.terrain = np.random.uniform(0.1, 0.4, (size, size))
        
        # Add a procedural "river basin" or valley in the center
        X, Y = np.meshgrid(np.linspace(-1, 1, size), np.linspace(-1, 1, size))
        self.terrain -= 0.6 * np.exp(-(X**2 + Y**2)/0.4)
        self.terrain = np.clip(self.terrain, 0, 1)
        
        # --- 2. Build City Infrastructure ---
        # Accessibility score: 2=Highway, 1=Local Road, 0=Blocked/Building
        self.accessibility = np.ones((size, size)) * 0.5
        
        # Create a road network (grid style)
        self.accessibility[::10, :] = 2.0  # Horizontal roads
        self.accessibility[:, ::10] = 2.0  # Vertical roads
        
        # Place obstacles (buildings)
        buildings = np.random.rand(size, size) > 0.8
        # Clear roads from buildings
        buildings[::10, :] = False
        buildings[:, ::10] = False
        
        self.terrain[buildings] = 1.5  # High terrain so water avoids buildings
        self.accessibility[buildings] = 0.0 # Buildings are not accessible
        
        # Keep track of original roads to render them clearly
        self.original_roads = self.accessibility.copy()
        
        # --- 3. Initialize State ---
        self.water_level = np.zeros((size, size))
        self.danger_score = np.zeros((size, size))
        
        # Seed initial flooding at the lowest point
        lowest_y, lowest_x = np.unravel_index(np.argmin(self.terrain), self.terrain.shape)
        self.water_level[lowest_y, lowest_x] = 5.0
        
    def step(self):
        """Execute one simulation step of the cellular automata."""
        # 1. Intensity increases over time (Rainfall)
        self.water_level += self.rainfall
        
        # 2. Water spreads to neighboring cells based on elevation difference
        new_water = self.water_level.copy()
        
        # Create padded arrays for neighbor calculations
        padded_water = np.pad(self.water_level, 1, mode='edge')
        padded_terrain = np.pad(self.terrain, 1, mode='edge')
        
        # Total elevation = terrain height + water level
        total_elev = self.terrain + self.water_level
        padded_total = padded_terrain + padded_water
        
        # Calculate elevation difference to 4 neighbors (Up, Down, Left, Right)
        diff_up = total_elev - padded_total[:-2, 1:-1]
        diff_down = total_elev - padded_total[2:, 1:-1]
        diff_left = total_elev - padded_total[1:-1, :-2]
        diff_right = total_elev - padded_total[1:-1, 2:]
        
        # Water only flows to lower elevations
        flow_up = np.maximum(diff_up, 0) * self.spread_speed * (self.water_level > 0)
        flow_down = np.maximum(diff_down, 0) * self.spread_speed * (self.water_level > 0)
        flow_left = np.maximum(diff_left, 0) * self.spread_speed * (self.water_level > 0)
        flow_right = np.maximum(diff_right, 0) * self.spread_speed * (self.water_level > 0)
        
        # Normalize flow so we don't transfer more water than the cell holds
        total_flow = flow_up + flow_down + flow_left + flow_right
        safe_factor = np.where(total_flow > self.water_level, self.water_level / (total_flow + 1e-5), 1.0)
        
        flow_up *= safe_factor
        flow_down *= safe_factor
        flow_left *= safe_factor
        flow_right *= safe_factor
        
        # Deduct outgoing water
        new_water -= (flow_up + flow_down + flow_left + flow_right)
        
        # Add incoming water from neighbors
        new_water[:-1, :] += flow_down[1:, :]   # Up neighbor flowing down
        new_water[1:, :] += flow_up[:-1, :]     # Down neighbor flowing up
        new_water[:, :-1] += flow_right[:, 1:]  # Left neighbor flowing right
        new_water[:, 1:] += flow_left[:, :-1]   # Right neighbor flowing left
        
        self.water_level = new_water
        
        # 3. Dynamic Danger Zones & Road Blocking
        # Danger score scales with water depth (0 to 1 scale)
        self.danger_score = np.clip(self.water_level / 1.5, 0, 1)
        
        # Roads become blocked dynamically when danger score exceeds threshold
        blocked = self.danger_score > 0.4
        self.accessibility = self.original_roads.copy()
        self.accessibility[blocked] = 0.0

def run_visualization():
    print("[INFO] Initializing Flood Prediction Cellular Automata...")
    sim = CellularFloodAutomata(size=50, spread_speed=0.15, rainfall=0.015)
    
    # Setup visualization figure
    fig, axes = plt.subplots(1, 3, figsize=(16, 5))
    fig.patch.set_facecolor('#1e1e2e')  # Futuristic dark background
    fig.suptitle("AI Cellular Automata: Predictive Flood & Infrastructure Analysis", fontsize=16, color='white', y=0.95)
    
    for ax in axes:
        ax.set_facecolor('#1e1e2e')
        ax.tick_params(colors='white')
        for spine in ax.spines.values():
            spine.set_edgecolor('#555555')
            
    ax_water, ax_danger, ax_roads = axes
    
    # 1. Water Spread Heatmap
    im_water = ax_water.imshow(sim.water_level, cmap='Blues', vmin=0, vmax=2)
    ax_water.set_title("Live Water Spread Level", color='#89b4fa', pad=10)
    
    # 2. Danger Evolution Visualization (Red/Yellow gradient)
    im_danger = ax_danger.imshow(sim.danger_score, cmap='YlOrRd', vmin=0, vmax=1)
    ax_danger.set_title("Danger Heatmap Evolution", color='#f38ba8', pad=10)
    
    # 3. Road Accessibility
    im_roads = ax_roads.imshow(sim.accessibility, cmap='bone', vmin=0, vmax=2)
    ax_roads.set_title("Infrastructure (Black = Blocked Road)", color='#a6e3a1', pad=10)
    
    def update(frame):
        # Run multiple simulation steps per visual frame to speed up animation
        for _ in range(2):
            sim.step()
            
        im_water.set_array(sim.water_level)
        im_danger.set_array(sim.danger_score)
        im_roads.set_array(sim.accessibility)
        return im_water, im_danger, im_roads

    print("[INFO] Starting predictive simulation... Close the window to stop.")
    ani = animation.FuncAnimation(fig, update, frames=200, interval=40, blit=True)
    
    # To save as MP4 if ffmpeg is available
    # ani.save("flood_prediction_output.mp4", writer="ffmpeg", fps=24)
    
    plt.tight_layout(rect=[0, 0, 1, 0.9])
    plt.show()

if __name__ == "__main__":
    run_visualization()
