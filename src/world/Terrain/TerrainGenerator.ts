import { NoiseAlgorithms } from './NoiseAlgorithms';
import { TerrainSettings, DEFAULT_TERRAIN_SETTINGS } from './TerrainSettings';
import EventEmitter from 'eventemitter3';

export interface TerrainData {
    heightMap: number[][];
    temperatureMap: number[][];
    humidityMap: number[][];
    biomeMap: number[][];
}

export class TerrainGenerator extends EventEmitter {
    private noiseGen: NoiseAlgorithms;
    private settings: TerrainSettings;
    private heightMap: number[][];
    private temperatureMap: number[][];
    private humidityMap: number[][];
    private biomeMap: number[][];

    constructor(settings: Partial<TerrainSettings> = {}) {
        super();
        this.settings = { ...DEFAULT_TERRAIN_SETTINGS, ...settings };
        this.noiseGen = new NoiseAlgorithms(this.settings.seed);
        
        // Initialize maps
        this.heightMap = Array(this.settings.height).fill(0).map(() => Array(this.settings.width).fill(0));
        this.temperatureMap = Array(this.settings.height).fill(0).map(() => Array(this.settings.width).fill(0));
        this.humidityMap = Array(this.settings.height).fill(0).map(() => Array(this.settings.width).fill(0));
        this.biomeMap = Array(this.settings.height).fill(0).map(() => Array(this.settings.width).fill(0));
    }

    public generate(): TerrainData {
        this.emit('generationStart');

        // Generate base terrain
        this.generateBaseHeightMap();
        this.emit('baseHeightMapGenerated');

        // Add mountains
        this.addMountains();
        this.emit('mountainsGenerated');

        // Add oceans
        this.addOceans();
        this.emit('oceansGenerated');

        // Generate climate data
        this.generateClimateData();
        this.emit('climateGenerated');

        // Determine biomes
        this.determineBiomes();
        this.emit('biomesGenerated');

        // Return the complete terrain data
        const terrainData: TerrainData = {
            heightMap: this.heightMap,
            temperatureMap: this.temperatureMap,
            humidityMap: this.humidityMap,
            biomeMap: this.biomeMap
        };

        this.emit('generationComplete', terrainData);
        return terrainData;
    }

    private generateBaseHeightMap(): void {
        for (let y = 0; y < this.settings.height; y++) {
            for (let x = 0; x < this.settings.width; x++) {
                // Generate base terrain using fractal noise
                const baseHeight = this.noiseGen.fractalNoise2D(
                    x, y,
                    this.settings.baseOctaves,
                    this.settings.basePersistence,
                    this.settings.baseLacunarity,
                    this.settings.baseScale
                );

                this.heightMap[y][x] = (baseHeight + 1) * 0.5; // Normalize to [0,1]
            }
        }
    }

    private addMountains(): void {
        for (let y = 0; y < this.settings.height; y++) {
            for (let x = 0; x < this.settings.width; x++) {
                // Generate mountain ridges using ridged noise
                const mountainHeight = this.noiseGen.ridgedNoise2D(
                    x, y,
                    this.settings.mountainOctaves,
                    this.settings.mountainPersistence,
                    this.settings.mountainLacunarity,
                    this.settings.mountainScale
                );

                // Blend mountains with base terrain
                this.heightMap[y][x] = this.heightMap[y][x] * (1 - this.settings.mountainWeight) +
                                     mountainHeight * this.settings.mountainWeight;
            }
        }
    }

    private addOceans(): void {
        for (let y = 0; y < this.settings.height; y++) {
            for (let x = 0; x < this.settings.width; x++) {
                // Generate ocean depth using billowy noise
                const oceanDepth = this.noiseGen.billowNoise2D(
                    x, y,
                    this.settings.oceanOctaves,
                    this.settings.oceanPersistence,
                    this.settings.oceanLacunarity,
                    this.settings.oceanScale
                );

                // Apply ocean level
                if (this.heightMap[y][x] < this.settings.oceanLevel) {
                    const depthFactor = (this.settings.oceanLevel - this.heightMap[y][x]) / this.settings.oceanLevel;
                    this.heightMap[y][x] -= oceanDepth * depthFactor * 0.3;
                }
            }
        }
    }

    private generateClimateData(): void {
        for (let y = 0; y < this.settings.height; y++) {
            for (let x = 0; x < this.settings.width; x++) {
                // Generate temperature based on height and latitude
                const latitudeFactor = Math.cos((y / this.settings.height - 0.5) * Math.PI);
                const heightFactor = 1 - this.heightMap[y][x];
                const temperatureNoise = this.noiseGen.fractalNoise2D(
                    x, y,
                    3, 0.5, 2.0,
                    this.settings.temperatureScale
                );

                this.temperatureMap[y][x] = (latitudeFactor * 0.6 + heightFactor * 0.3 + temperatureNoise * 0.1 + 1) * 0.5;
                this.temperatureMap[y][x] += this.settings.temperatureOffset;

                // Generate humidity based on height and temperature
                const humidityNoise = this.noiseGen.fractalNoise2D(
                    x + 1000, y + 1000,
                    3, 0.5, 2.0,
                    this.settings.humidityScale
                );

                this.humidityMap[y][x] = (humidityNoise + 1) * 0.5;
                this.humidityMap[y][x] *= 1 - Math.abs(this.temperatureMap[y][x] - 0.5); // Less humidity in extreme temperatures
                this.humidityMap[y][x] += this.settings.humidityOffset;
            }
        }
    }

    private determineBiomes(): void {
        const { heightThresholds } = this.settings;

        for (let y = 0; y < this.settings.height; y++) {
            for (let x = 0; x < this.settings.width; x++) {
                const height = this.heightMap[y][x];
                const temperature = this.temperatureMap[y][x];
                const humidity = this.humidityMap[y][x];

                // Determine biome based on height, temperature, and humidity
                if (height < heightThresholds.deepOcean) {
                    this.biomeMap[y][x] = 0; // Deep Ocean
                } else if (height < heightThresholds.ocean) {
                    this.biomeMap[y][x] = 1; // Ocean
                } else if (height < heightThresholds.beach) {
                    this.biomeMap[y][x] = 2; // Beach
                } else if (height < heightThresholds.lowland) {
                    if (temperature < 0.2) {
                        this.biomeMap[y][x] = 3; // Tundra
                    } else if (temperature < 0.4) {
                        this.biomeMap[y][x] = humidity < 0.5 ? 4 : 5; // Plains or Forest
                    } else {
                        this.biomeMap[y][x] = humidity < 0.3 ? 6 : 7; // Desert or Rainforest
                    }
                } else if (height < heightThresholds.hills) {
                    this.biomeMap[y][x] = 8; // Hills
                } else if (height < heightThresholds.mountains) {
                    this.biomeMap[y][x] = 9; // Mountains
                } else {
                    this.biomeMap[y][x] = 10; // Snow Peaks
                }
            }
        }
    }

    public getHeightAt(x: number, y: number): number {
        if (x < 0 || x >= this.settings.width || y < 0 || y >= this.settings.height) {
            return 0;
        }
        return this.heightMap[y][x];
    }

    public getBiomeAt(x: number, y: number): number {
        if (x < 0 || x >= this.settings.width || y < 0 || y >= this.settings.height) {
            return 0;
        }
        return this.biomeMap[y][x];
    }

    public updateSettings(newSettings: Partial<TerrainSettings>): void {
        this.settings = { ...this.settings, ...newSettings };
        this.emit('settingsUpdated', this.settings);
    }
} 