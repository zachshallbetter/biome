import EventEmitter from 'eventemitter3';
import { createNoise2D, createNoise3D, createNoise4D } from 'simplex-noise';

export interface ProceduralSettings {
    seed: string;
    octaves: number;
    persistence: number;
    lacunarity: number;
    scale: number;
}

export class ProceduralSystem extends EventEmitter {
    private settings: ProceduralSettings;
    private noise2D: (x: number, y: number) => number;
    private noise3D: (x: number, y: number, z: number) => number;
    private noise4D: (x: number, y: number, z: number, w: number) => number;
    private isInitialized: boolean = false;

    constructor(settings: Partial<ProceduralSettings> = {}) {
        super();
        this.settings = {
            seed: 'biome-default-seed',
            octaves: 4,
            persistence: 0.5,
            lacunarity: 2.0,
            scale: 100.0,
            ...settings
        };

        // Initialize noise functions
        this.noise2D = createNoise2D();
        this.noise3D = createNoise3D();
        this.noise4D = createNoise4D();
    }

    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            // Initialize noise generators with seed
            this.resetNoise();
            this.isInitialized = true;
            this.emit('initialized');
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    public start(): void {
        if (!this.isInitialized) {
            throw new Error('ProceduralSystem must be initialized before starting');
        }
        this.emit('started');
    }

    public stop(): void {
        this.emit('stopped');
    }

    public update(deltaTime: number): void {
        // Update any time-based procedural generation here
        this.emit('update', deltaTime);
    }

    public generateNoise2D(x: number, y: number): number {
        let amplitude = 1;
        let frequency = 1;
        let noiseHeight = 0;
        let maxValue = 0;

        for (let i = 0; i < this.settings.octaves; i++) {
            const sampleX = x * frequency / this.settings.scale;
            const sampleY = y * frequency / this.settings.scale;
            
            const noiseValue = this.noise2D(sampleX, sampleY);
            noiseHeight += noiseValue * amplitude;
            
            maxValue += amplitude;
            amplitude *= this.settings.persistence;
            frequency *= this.settings.lacunarity;
        }

        // Normalize the value
        return noiseHeight / maxValue;
    }

    public generateNoise3D(x: number, y: number, z: number): number {
        let amplitude = 1;
        let frequency = 1;
        let noiseHeight = 0;
        let maxValue = 0;

        for (let i = 0; i < this.settings.octaves; i++) {
            const sampleX = x * frequency / this.settings.scale;
            const sampleY = y * frequency / this.settings.scale;
            const sampleZ = z * frequency / this.settings.scale;
            
            const noiseValue = this.noise3D(sampleX, sampleY, sampleZ);
            noiseHeight += noiseValue * amplitude;
            
            maxValue += amplitude;
            amplitude *= this.settings.persistence;
            frequency *= this.settings.lacunarity;
        }

        return noiseHeight / maxValue;
    }

    public setSettings(newSettings: Partial<ProceduralSettings>): void {
        this.settings = { ...this.settings, ...newSettings };
        this.resetNoise();
        this.emit('settingsChanged', this.settings);
    }

    public getSettings(): ProceduralSettings {
        return { ...this.settings };
    }

    private resetNoise(): void {
        // Re-initialize noise functions with current settings
        this.noise2D = createNoise2D();
        this.noise3D = createNoise3D();
        this.noise4D = createNoise4D();
    }

    public generateTerrainHeight(x: number, y: number): number {
        return this.generateNoise2D(x, y);
    }

    public generateBiomeValue(x: number, y: number, elevation: number): number {
        return this.generateNoise3D(x, y, elevation);
    }
} 