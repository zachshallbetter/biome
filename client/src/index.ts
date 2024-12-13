import { TerrainVisualizer } from './visualizers/TerrainVisualizer';
import { DebugPanel } from './ui/DebugPanel';
import { EngineConnection } from './network/EngineConnection';
import { Controls } from './ui/Controls';

class BiomeClient {
    private terrainVisualizer: TerrainVisualizer;
    private debugPanel: DebugPanel;
    private engineConnection: EngineConnection;
    private controls: Controls;
    private lastFrameTime: number = 0;
    private frameCount: number = 0;

    constructor() {
        console.log('BiomeClient constructor started');
        
        // Create canvas container if it doesn't exist
        let container = document.getElementById('canvas-container');
        if (!container) {
            console.log('Creating canvas container');
            container = document.createElement('div');
            container.id = 'canvas-container';
            document.body.appendChild(container);
        }

        // Initialize components
        this.terrainVisualizer = new TerrainVisualizer('canvas-container');
        this.debugPanel = new DebugPanel();
        this.engineConnection = new EngineConnection();
        this.controls = new Controls(this.terrainVisualizer.getSceneManager());

        this.setupEventListeners();
        console.log('BiomeClient constructor completed');
    }

    private setupEventListeners(): void {
        console.log('Setting up event listeners');
        
        // Listen for engine updates
        this.engineConnection.on('terrainUpdate', (data) => {
            console.log('Handling terrain update');
            this.terrainVisualizer.updateTerrain(data);
        });

        this.engineConnection.on('weatherUpdate', (data) => {
            console.log('Handling weather update');
            this.debugPanel.updateWeather(data);
            this.terrainVisualizer.updateWeatherEffects(data);
        });

        this.engineConnection.on('timeUpdate', (data) => {
            console.log('Handling time update');
            this.debugPanel.updateTime(data);
            this.terrainVisualizer.updateLighting(data);
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            console.log('Handling window resize');
            this.terrainVisualizer.resize();
        });
    }

    public async initialize(): Promise<void> {
        try {
            console.log('Initializing BiomeClient');
            
            // Initialize visualizer first
            await this.terrainVisualizer.initialize();
            console.log('TerrainVisualizer initialized');
            
            // Initialize debug panel
            this.debugPanel.initialize();
            console.log('DebugPanel initialized');
            
            // Connect to engine
            await this.engineConnection.connect();
            console.log('Connected to engine');
            
            // Start the render loop
            this.animate();
            console.log('Animation loop started');
        } catch (error) {
            console.error('Failed to initialize BiomeClient:', error);
            throw error;
        }
    }

    private animate(): void {
        const currentTime = performance.now();
        this.frameCount++;

        // Calculate FPS every second
        if (currentTime - this.lastFrameTime >= 1000) {
            const fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFrameTime));
            this.debugPanel.updateFPS(fps);
            this.frameCount = 0;
            this.lastFrameTime = currentTime;
        }

        // Update debug panel
        this.debugPanel.update();

        // Update terrain visualization
        this.terrainVisualizer.render();

        // Request next frame
        requestAnimationFrame(this.animate.bind(this));
    }
}

// Start the client
console.log('Starting BiomeClient');
const client = new BiomeClient();
client.initialize().catch(error => {
    console.error('Failed to start BiomeClient:', error);
}); 