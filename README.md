# Biome Engine

A procedural generation engine for creating dynamic, interactive worlds with realistic weather, growth, and physics systems.

## Features

### Core Systems
- **Procedural Generation**: Terrain, biomes, and content generation using advanced noise algorithms
- **Weather System**: Dynamic weather patterns affecting the environment
- **Time Management**: Day/night cycle and aging mechanics
- **Physics Engine**: Real-time physics with collision detection and fluid dynamics
- **Growth System**: Vegetation growth and structural aging simulation

### Visualization
- **3D Terrain Viewer**: Real-time terrain visualization with biome coloring
- **Weather Effects**: Visual representation of weather conditions
- **Day/Night Cycle**: Dynamic lighting based on time of day
- **Debug Tools**: Performance monitoring and system state visualization

## Project Structure

```
biome/
├── src/                         # Engine source code
│   ├── core/                   # Core engine systems
│   ├── world/                  # World generation and management
│   ├── entities/               # Entity and physics systems
│   └── systems/                # Additional engine systems
│
└── client/                     # Visualization client
    ├── public/                # Static assets
    └── src/                   # Client source code
        ├── scene/            # Three.js scene management
        ├── visualizers/      # Visualization components
        ├── ui/              # User interface components
        └── network/         # Client-server communication
```

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation
1. Clone the repository:
\`\`\`bash
git clone https://github.com/yourusername/biome.git
cd biome
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

### Development
Start the development servers:
\`\`\`bash
npm run dev
\`\`\`

This will start:
- Engine server on port 8080
- Client development server on port 3000

### Building
Build for production:
\`\`\`bash
npm run build
\`\`\`

### Running
Start the production server:
\`\`\`bash
npm start
\`\`\`

## Controls

### Camera Controls
- **Orbit Mode** (Default):
  - Left Mouse: Rotate camera
  - Right Mouse: Pan camera
  - Mouse Wheel: Zoom in/out
  - R: Reset camera position

- **Fly Mode** (Toggle with Spacebar):
  - W/S: Move forward/backward
  - A/D: Move left/right
  - Q/E: Roll left/right
  - R: Reset camera position

### Debug Controls
- F1: Toggle debug panel
- F2: Toggle grid helper
- F3: Toggle axes helper

## Architecture

### Engine Core
- **Engine.ts**: Main orchestrator for all systems
- **TimeManager.ts**: Handles time-based mechanics
- **WeatherSystem.ts**: Manages weather patterns
- **ProceduralSystem.ts**: Handles procedural generation
- **ContentManager.ts**: Manages assets and resources

### World Systems
- **TerrainGenerator.ts**: Generates terrain using noise algorithms
- **BiomeManager.ts**: Manages biome distribution and transitions
- **EnvironmentManager.ts**: Coordinates environmental systems
- **GrowthManager.ts**: Handles vegetation and structure growth

### Physics Systems
- **PhysicsEngine.ts**: Core physics simulation
- **CollisionHandler.ts**: Collision detection and response
- **RopePhysics.ts**: Flexible object simulation
- **FluidDynamics.ts**: Water and air physics

### Visualization
- **SceneManager.ts**: Three.js scene management
- **TerrainVisualizer.ts**: 3D terrain rendering
- **WeatherEffects.ts**: Visual weather effects
- **DebugPanel.ts**: Performance and debug information

## Contributing

1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/AmazingFeature\`)
3. Commit your changes (\`git commit -m 'Add some AmazingFeature'\`)
4. Push to the branch (\`git push origin feature/AmazingFeature\`)
5. Open a Pull Request

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [three](https://www.npmjs.com/package/three) ^0.158.0 - For 3D rendering
- [socket.io](https://www.npmjs.com/package/socket.io) ^4.7.2 and [socket.io-client](https://www.npmjs.com/package/socket.io-client) ^4.7.2 - For real-time communication
- [simplex-noise](https://www.npmjs.com/package/simplex-noise) ^4.0.1 - For procedural generation
- [gl-matrix](https://www.npmjs.com/package/gl-matrix) ^3.4.3 - For vector mathematics
- [eventemitter3](https://www.npmjs.com/package/eventemitter3) ^5.0.1 - For event handling
- [express](https://www.npmjs.com/package/express) ^4.18.2 - For web server functionality