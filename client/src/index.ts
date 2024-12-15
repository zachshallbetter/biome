import { SceneManager } from './ui/SceneManager';
import { TerrainVisualizer } from './visualizers/TerrainVisualizer';
import { SkyVisualizer } from './visualizers/SkyVisualizer';
import { WeatherVisualizer } from './visualizers/WeatherVisualizer';
import { ControlManager } from './ui/ControlManager';
import { PanelManager } from './ui/PanelManager';
import { TimeManager } from './ui/TimeManager';
import { EventManager } from './ui/EventManager';
import * as THREE from 'three';

export class BiomeClient {
    private sceneManager: SceneManager;
    private terrainVisualizer: TerrainVisualizer;
    private skyVisualizer: SkyVisualizer;
    private weatherVisualizer: WeatherVisualizer;
    private controlManager: ControlManager;
    private panelManager: PanelManager;
    private timeManager: TimeManager;
    private eventManager: EventManager;
    private container: HTMLElement;

    constructor() {
        // Initialize event system first
        this.eventManager = new EventManager();
        
        // Get or create container
        this.container = this.getOrCreateContainer();
        
        // Initialize core systems
        this.sceneManager = new SceneManager({
            container: this.container,
            backgroundColor: 0x000000,
            fogColor: 0xcccccc,
            fogDensity: 0.002
        });
        
        // Initialize visualizers
        this.terrainVisualizer = new TerrainVisualizer(this.sceneManager);
        this.skyVisualizer = new SkyVisualizer(this.sceneManager);
        this.weatherVisualizer = new WeatherVisualizer(this.sceneManager);
        
        // Initialize UI managers
        this.panelManager = new PanelManager(this.sceneManager, this.container);
        this.timeManager = new TimeManager(this.sceneManager);
        this.controlManager = new ControlManager(this.sceneManager);
    }

    private getOrCreateContainer(): HTMLElement {
        let container = document.getElementById('app');
        
        if (!container) {
            container = document.createElement('div');
            container.id = 'app';
            document.body.appendChild(container);
        }
        
        return container;
    }

    public async initialize(): Promise<void> {
        console.log('Initializing Biome Client...');
        
        try {
            // Initialize scene first
            await this.sceneManager.start();
            
            // Initialize visualizers in parallel
            await Promise.all([
                this.terrainVisualizer.initialize(),
                this.skyVisualizer.initialize(),
                this.weatherVisualizer.initialize()
            ]);
            
            // Initialize UI components
            await Promise.all([
                this.timeManager.start(),
                this.controlManager.start()
            ]);
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Start render loop
            this.render();
            
            console.log('Biome Client initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Biome Client:', error);
            throw error;
        }
    }

    private setupEventListeners(): void {
        // Time update events
        this.eventManager.on('timeUpdate', (data) => {
            this.skyVisualizer.updateSky({
                time: data.time,
                cloudCover: 0.3,
                sunPosition: new THREE.Vector3(0, Math.sin(data.dayNightCycle * Math.PI) * 100, 0)
            });
        });

        // Weather update events
        this.eventManager.on('weatherUpdate', (data) => {
            this.weatherVisualizer.updateWeather(data);
        });

        // Terrain update events
        this.eventManager.on('terrainUpdate', (data) => {
            this.terrainVisualizer.updateTerrain(data);
        });

        // Window resize event
        window.addEventListener('resize', this.handleResize.bind(this));

        // Forward events from SceneManager
        this.sceneManager.on('timeUpdate', (data) => this.eventManager.emit('timeUpdate', data));
        this.sceneManager.on('weatherUpdate', (data) => this.eventManager.emit('weatherUpdate', data));
        this.sceneManager.on('terrainUpdate', (data) => this.eventManager.emit('terrainUpdate', data));
    }

    private handleResize(): void {
        this.sceneManager.resize();
        this.terrainVisualizer.resize();
        this.skyVisualizer.resize();
        this.weatherVisualizer.resize();
    }

    private render = (): void => {
        requestAnimationFrame(this.render);
        
        this.sceneManager.render();
        this.terrainVisualizer.render();
        this.skyVisualizer.render();
        this.weatherVisualizer.render();
    }

    public dispose(): void {
        // Cleanup visualizers
        this.terrainVisualizer.dispose();
        this.skyVisualizer.dispose();
        this.weatherVisualizer.dispose();
        
        // Cleanup managers
        this.controlManager.dispose();
        this.timeManager.dispose();
        this.panelManager.dispose();
        
        // Cleanup scene
        this.sceneManager.dispose();
        
        // Remove event listeners
        this.eventManager.removeAllListeners();
        window.removeEventListener('resize', this.handleResize.bind(this));
    }
}

// Initialize the application
const client = new BiomeClient();
client.initialize().catch(console.error);