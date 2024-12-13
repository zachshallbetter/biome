import EventEmitter from 'eventemitter3';
import { TimeManager } from './TimeManager';
import { WeatherSystem } from './WeatherSystem';
import { ContentManager } from './ContentManager';
import { ProceduralSystem } from './ProceduralSystem';
import { PhysicsEngine } from '../entities/Physics/PhysicsEngine';
import { BiomeManager } from '../world/BiomeManager';
import { EnvironmentManager } from '../world/EnvironmentManager';
import { vec2 } from 'gl-matrix';

export class Engine extends EventEmitter {
    private static instance: Engine;
    private timeManager: TimeManager;
    private weatherSystem: WeatherSystem;
    private contentManager: ContentManager;
    private proceduralSystem: ProceduralSystem;
    private physicsEngine: PhysicsEngine;
    private biomeManager: BiomeManager;
    private environmentManager: EnvironmentManager;
    private isRunning: boolean = false;
    private updateInterval: NodeJS.Timeout | null = null;
    private lastFrameTime: number = 0;
    private _targetFPS: number = 60;
    private _frameInterval: number = 1000 / 60;

    private constructor() {
        super();
        this.timeManager = new TimeManager();
        this.contentManager = new ContentManager();
        this.proceduralSystem = new ProceduralSystem();
        this.physicsEngine = new PhysicsEngine();
        this.biomeManager = new BiomeManager(this.contentManager);
        this.weatherSystem = new WeatherSystem();
        this.environmentManager = new EnvironmentManager(
            this.biomeManager,
            this.weatherSystem,
            this.timeManager
        );

        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // Listen for physics events
        this.physicsEngine.on('collision', (data) => {
            this.emit('physicsCollision', data);
        });

        // Listen for weather changes
        this.weatherSystem.on('weatherChanged', (data) => {
            this.emit('weatherChanged', data);
            this.environmentManager.update(this.timeManager.getDeltaTime());
        });

        // Listen for biome transitions
        this.biomeManager.on('biomeTransition', (data) => {
            this.emit('biomeTransition', data);
        });
    }

    public static getInstance(): Engine {
        if (!Engine.instance) {
            Engine.instance = new Engine();
        }
        return Engine.instance;
    }

    public async initialize(): Promise<void> {
        try {
            await this.contentManager.initialize();
            await this.proceduralSystem.initialize();
            await this.weatherSystem.initialize();
            
            // Initialize physics with default configuration
            const gravity = vec2.fromValues(0, -9.81);
            this.physicsEngine.setConfig({
                gravity,
                maxVelocity: 100,
                substeps: 8
            });

            this.emit('initialized');
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    public start(): void {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lastFrameTime = Date.now();
        
        // Start all systems
        this.timeManager.start();
        this.weatherSystem.start();
        this.proceduralSystem.start();
        
        // Start the update loop
        this.startUpdateLoop();
        
        this.emit('started');
    }

    public stop(): void {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        
        // Stop all systems
        this.timeManager.stop();
        this.weatherSystem.stop();
        this.proceduralSystem.stop();
        
        // Clear the update interval
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        this.emit('stopped');
    }

    private startUpdateLoop(): void {
        this.updateInterval = setInterval(() => {
            const currentTime = Date.now();
            const deltaTime = (currentTime - this.lastFrameTime) / 1000; // Convert to seconds
            this.lastFrameTime = currentTime;

            this.update(deltaTime);
        }, this._frameInterval);
    }

    private update(deltaTime: number): void {
        if (!this.isRunning) return;

        // Update time manager
        this.timeManager.update();

        // Update physics
        this.physicsEngine.update(deltaTime);

        // Update weather and environment
        this.weatherSystem.update(deltaTime);
        this.environmentManager.update(deltaTime);

        // Update procedural systems
        this.proceduralSystem.update(deltaTime);
        
        // Emit update event for external systems
        this.emit('update', deltaTime);
    }

    public getTimeManager(): TimeManager {
        return this.timeManager;
    }

    public getWeatherSystem(): WeatherSystem {
        return this.weatherSystem;
    }

    public getContentManager(): ContentManager {
        return this.contentManager;
    }

    public getProceduralSystem(): ProceduralSystem {
        return this.proceduralSystem;
    }

    public getPhysicsEngine(): PhysicsEngine {
        return this.physicsEngine;
    }

    public getBiomeManager(): BiomeManager {
        return this.biomeManager;
    }

    public getEnvironmentManager(): EnvironmentManager {
        return this.environmentManager;
    }

    public setTargetFPS(fps: number): void {
        if (fps > 0) {
            this._targetFPS = fps;
            this._frameInterval = 1000 / fps;
            
            // Restart update loop if running
            if (this.isRunning && this.updateInterval) {
                clearInterval(this.updateInterval);
                this.startUpdateLoop();
            }
        }
    }

    public get targetFPS(): number {
        return this._targetFPS;
    }

    public get frameInterval(): number {
        return this._frameInterval;
    }

    public cleanup(): void {
        this.stop();
        this.physicsEngine.removeAllListeners();
        this.weatherSystem.removeAllListeners();
        this.biomeManager.removeAllListeners();
        this.environmentManager.removeAllListeners();
        this.removeAllListeners();
    }
}