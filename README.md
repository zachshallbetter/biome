# Biome Simulator

A procedural biome generation and simulation engine with real-time visualization.

## Features

### Core Systems
- Procedural terrain generation using multiple noise algorithms
- Dynamic weather system with realistic transitions
- Day/night cycle with accurate sun positioning
- Biome-specific environmental effects
- Real-time erosion simulation
- Save state system for world persistence

### Visualization
- 3D terrain visualization with dynamic LOD
- Weather effects (rain, snow) using particle systems
- Dynamic sky system with day/night transitions
- Cloud coverage and atmospheric effects
- Real-time shadow casting

### User Interface
- Modular panel system with drag-and-drop support
- Time control panel with play/pause and speed controls
- Debug console for performance monitoring
- Status panel for world events
- Biome parameter controls
- Save/Load functionality for world states

## Controls

### Camera Controls
- **Left Mouse Button**: Rotate camera
- **Right Mouse Button**: Pan camera
- **Mouse Wheel**: Zoom in/out
- **Alt + Left Mouse**: Orbit around point
- **Alt + Right Mouse**: Dolly zoom

### Time Controls
- **Space**: Play/Pause simulation
- **Left Arrow**: Decrease time speed
- **Right Arrow**: Increase time speed
- **R**: Reset time to dawn

### Save State Controls
- **Ctrl + S**: Quick save current state
- **Ctrl + L**: Load last saved state
- **Shift + S**: Open save dialog
- **Shift + L**: Open load dialog
- **Alt + S**: Export save file
- **Alt + L**: Import save file

### Debug Controls
- **F1**: Toggle debug panel
- **F2**: Toggle wireframe mode
- **F3**: Toggle performance stats
- **F12**: Open browser developer tools

## Save States

### Save File Structure
```json
{
    "version": "1.0.0",
    "timestamp": "2023-11-15T12:00:00Z",
    "world": {
        "seed": "12345",
        "time": {
            "current": 720,
            "speed": 1
        },
        "weather": {
            "type": "CLEAR",
            "intensity": 0,
            "temperature": 20
        },
        "terrain": {
            "modifications": [],
            "biomes": {}
        }
    }
}
```

### Save Locations
- Quick saves: `localStorage` under key `biome_quicksave`
- Auto-saves: `localStorage` under key `biome_autosave_[timestamp]`
- File saves: Downloaded as `biome_save_[timestamp].json`

### Save Types
1. **Quick Save**
   - Instantly saves current state to localStorage
   - Only one quick save slot available
   - Overwrites previous quick save

2. **Auto Save**
   - Automatically saves every 5 minutes
   - Keeps last 3 auto-saves
   - Rotates saves automatically

3. **File Save**
   - Exports complete save file
   - Can be shared between users
   - Includes all world data

## Architecture

### Client-Side Components
```
client/
├── src/
│   ├── scene/
│   │   └── SceneManager.ts       # 3D scene management and rendering
│   ├── visualizers/
│   │   ├── TerrainVisualizer.ts  # Terrain mesh and materials
│   │   ├── SkyVisualizer.ts      # Sky dome and lighting
│   │   └── WeatherVisualizer.ts  # Particle systems for weather
│   ├── ui/
│   │   ├── components/
│   │   │   ├── Panel.ts          # Base panel component
│   │   │   ├── Controls.ts       # World control interface
│   │   │   └── Console.ts        # Debug console
│   │   ├── ControlManager.ts     # UI control coordination
│   │   ├── PanelManager.ts       # Panel management
│   │   ├── TimeManager.ts        # Time control system
│   │   └── EventManager.ts       # Event handling system
│   └── config/
│       └── ui.config.ts          # UI configuration
```

### Server-Side Components
```
src/
├── core/
│   ├── Engine.ts                 # Main simulation engine
│   ├── TimeManager.ts            # Time simulation
│   ├── WeatherSystem.ts          # Weather simulation
│   └── ProceduralSystem.ts       # Procedural generation
├── world/
│   ├── Terrain/
│   │   ├── TerrainGenerator.ts   # Terrain generation
│   │   ├── NoiseAlgorithms.ts    # Noise generation
│   │   └── ErosionSimulator.ts   # Erosion simulation
│   ├── BiomeManager.ts           # Biome management
│   └── EnvironmentManager.ts     # Environmental effects
└── entities/
    ├── Physics/
    │   ├── PhysicsEngine.ts      # Physics simulation
    │   └── CollisionHandler.ts   # Collision detection
    └── EntityManager.ts          # Entity management
```

## Development Environment

### Prerequisites
- Node.js (v16 or higher)
- npm (v8 or higher)
- Modern web browser with WebGL support

### Local Development
1. Clone the repository:
```bash
git clone https://github.com/yourusername/biome-simulator.git
cd biome-simulator
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```
The application will be available at `http://localhost:3000`

4. Build for production:
```bash
npm run build
```

### Development Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run linter
- `npm test` - Run tests
- `npm run clean` - Clean build artifacts

### Architecture Notes
- The client uses Three.js for 3D visualization
- Event-driven architecture using EventEmitter
- Modular UI system with draggable panels
- Asynchronous initialization sequence
- Proper resource cleanup and disposal

### Browser Support
- Chrome (recommended) - Latest version
- Firefox - Latest version
- Safari - Version 14+
- Edge - Latest version

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.