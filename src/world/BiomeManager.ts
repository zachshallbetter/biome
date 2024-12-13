import EventEmitter from 'eventemitter3';
import { TerrainData } from './Terrain/TerrainGenerator';
import { ContentManager } from '../core/ContentManager';

export enum BiomeType {
    DEEP_OCEAN = 'DEEP_OCEAN',
    OCEAN = 'OCEAN', 
    BEACH = 'BEACH',
    TUNDRA = 'TUNDRA',
    PLAINS = 'PLAINS',
    FOREST = 'FOREST',
    DESERT = 'DESERT',
    RAINFOREST = 'RAINFOREST',
    HILLS = 'HILLS',
    MOUNTAINS = 'MOUNTAINS',
    SNOW_PEAKS = 'SNOW_PEAKS'
}

export interface BiomeData {
    type: BiomeType;
    baseColor: [number, number, number];
    vegetationDensity: number;
    temperature: number;
    humidity: number;
    heightRange: [number, number];
    resourceTypes: string[];
    structureTypes: string[];
}

export interface BiomeRules {
    minHeight: number;
    maxHeight: number;
    minTemperature: number;
    maxTemperature: number;
    minHumidity: number;
    maxHumidity: number;
    transitionRange: number;
}

export class BiomeManager extends EventEmitter {
    private biomes: Map<BiomeType, BiomeData>;
    private biomeRules: Map<BiomeType, BiomeRules>;
    private contentManager: ContentManager;
    private transitionBuffer: number[][];
    private currentBiome: BiomeType;
    private terrainData: TerrainData | null = null;

    constructor(contentManager: ContentManager) {
        super();
        this.biomes = new Map();
        this.biomeRules = new Map();
        this.contentManager = contentManager;
        this.transitionBuffer = [[]];
        this.currentBiome = BiomeType.PLAINS; // Default biome
        this.initializeBiomes();
    }

    public getCurrentBiome(): BiomeType {
        return this.currentBiome;
    }

    public getBiomeAtPosition(x: number, y: number): BiomeType {
        if (!this.terrainData) {
            return BiomeType.PLAINS; // Default if no terrain data
        }

        // Ensure coordinates are within bounds
        const height = this.terrainData.heightMap.length;
        const width = this.terrainData.heightMap[0]?.length || 0;
        
        if (x < 0 || x >= width || y < 0 || y >= height) {
            return BiomeType.PLAINS;
        }

        return this.determineBiomeType(
            this.terrainData.heightMap[y][x],
            this.terrainData.temperatureMap[y][x],
            this.terrainData.humidityMap[y][x]
        );
    }

    private initializeBiomes(): void {
        // Initialize default biome data
        this.biomes.set(BiomeType.DEEP_OCEAN, {
            type: BiomeType.DEEP_OCEAN,
            baseColor: [0, 20, 80],
            vegetationDensity: 0.1,
            temperature: 10,
            humidity: 1.0,
            heightRange: [0, 0.2],
            resourceTypes: ['fish', 'coral'],
            structureTypes: ['shipwreck', 'ruins']
        });

        this.biomes.set(BiomeType.OCEAN, {
            type: BiomeType.OCEAN,
            baseColor: [0, 40, 120],
            vegetationDensity: 0.2,
            temperature: 15,
            humidity: 1.0,
            heightRange: [0.2, 0.4],
            resourceTypes: ['fish', 'seaweed'],
            structureTypes: ['coral_reef']
        });

        this.biomes.set(BiomeType.BEACH, {
            type: BiomeType.BEACH,
            baseColor: [240, 230, 140],
            vegetationDensity: 0.3,
            temperature: 25,
            humidity: 0.6,
            heightRange: [0.4, 0.45],
            resourceTypes: ['shells', 'palm_trees'],
            structureTypes: ['beach_hut']
        });

        this.biomes.set(BiomeType.TUNDRA, {
            type: BiomeType.TUNDRA,
            baseColor: [230, 230, 230],
            vegetationDensity: 0.2,
            temperature: -10,
            humidity: 0.3,
            heightRange: [0.45, 0.55],
            resourceTypes: ['ice', 'moss'],
            structureTypes: ['ice_cave']
        });

        this.biomes.set(BiomeType.PLAINS, {
            type: BiomeType.PLAINS,
            baseColor: [120, 170, 80],
            vegetationDensity: 0.6,
            temperature: 20,
            humidity: 0.5,
            heightRange: [0.45, 0.55],
            resourceTypes: ['grass', 'flowers'],
            structureTypes: ['village', 'farm']
        });

        // Initialize biome rules
        this.initializeBiomeRules();
    }

    private initializeBiomeRules(): void {
        this.biomeRules.set(BiomeType.DEEP_OCEAN, {
            minHeight: 0,
            maxHeight: 0.2,
            minTemperature: 0,
            maxTemperature: 20,
            minHumidity: 0.8,
            maxHumidity: 1.0,
            transitionRange: 0.05
        });

        // Add more biome rules...
    }

    public getBiomeData(type: BiomeType): BiomeData | undefined {
        return this.biomes.get(type);
    }

    public getBiomeRules(type: BiomeType): BiomeRules | undefined {
        return this.biomeRules.get(type);
    }

    public determineBiomeType(height: number, temperature: number, humidity: number): BiomeType {
        let bestBiome = BiomeType.PLAINS; // Default biome
        let bestMatch = 0;

        for (const [biomeType, rules] of this.biomeRules) {
            const heightMatch = this.calculateRangeMatch(height, rules.minHeight, rules.maxHeight);
            const tempMatch = this.calculateRangeMatch(temperature, rules.minTemperature, rules.maxTemperature);
            const humidityMatch = this.calculateRangeMatch(humidity, rules.minHumidity, rules.maxHumidity);

            const totalMatch = (heightMatch + tempMatch + humidityMatch) / 3;

            if (totalMatch > bestMatch) {
                bestMatch = totalMatch;
                bestBiome = biomeType;
            }
        }

        if (this.currentBiome !== bestBiome) {
            this.currentBiome = bestBiome;
            this.emit('biomeChanged', bestBiome);
        }
        
        return bestBiome;
    }

    private calculateRangeMatch(value: number, min: number, max: number): number {
        if (value < min || value > max) return 0;
        const center = (min + max) / 2;
        const range = max - min;
        return 1 - Math.abs(value - center) / (range / 2);
    }

    public generateBiomeTransitions(terrainData: TerrainData): number[][] {
        this.terrainData = terrainData;
        const height = terrainData.heightMap.length;
        const width = terrainData.heightMap[0]?.length || 0;
        
        this.transitionBuffer = Array(height).fill(0).map(() => Array(width).fill(0));

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const biomeType = this.determineBiomeType(
                    terrainData.heightMap[y][x],
                    terrainData.temperatureMap[y][x],
                    terrainData.humidityMap[y][x]
                );
                const biomeRules = this.biomeRules.get(biomeType);

                if (biomeRules) {
                    let transitionFactor = 0;
                    const neighbors = this.getNeighborBiomes(terrainData, x, y);

                    for (const neighborType of neighbors) {
                        if (neighborType !== biomeType) {
                            const neighborRules = this.biomeRules.get(neighborType);
                            if (neighborRules) {
                                transitionFactor = Math.max(
                                    transitionFactor,
                                    this.calculateTransitionFactor(
                                        terrainData.heightMap[y][x],
                                        terrainData.temperatureMap[y][x],
                                        terrainData.humidityMap[y][x],
                                        biomeRules,
                                        neighborRules
                                    )
                                );
                            }
                        }
                    }

                    this.transitionBuffer[y][x] = transitionFactor;
                }
            }
        }

        return this.transitionBuffer;
    }

    private getNeighborBiomes(terrainData: TerrainData, x: number, y: number): BiomeType[] {
        const neighbors: BiomeType[] = [];
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < terrainData.heightMap[0].length && ny >= 0 && ny < terrainData.heightMap.length) {
                const neighborType = this.determineBiomeType(
                    terrainData.heightMap[ny][nx],
                    terrainData.temperatureMap[ny][nx],
                    terrainData.humidityMap[ny][nx]
                );
                neighbors.push(neighborType);
            }
        }

        return neighbors;
    }

    private calculateTransitionFactor(
        height: number,
        temperature: number,
        humidity: number,
        biomeRules: BiomeRules,
        neighborRules: BiomeRules
    ): number {
        const heightFactor = this.calculateTransitionValue(
            height,
            biomeRules.minHeight,
            biomeRules.maxHeight,
            neighborRules.minHeight,
            neighborRules.maxHeight,
            biomeRules.transitionRange
        );

        const tempFactor = this.calculateTransitionValue(
            temperature,
            biomeRules.minTemperature,
            biomeRules.maxTemperature,
            neighborRules.minTemperature,
            neighborRules.maxTemperature,
            biomeRules.transitionRange
        );

        const humidityFactor = this.calculateTransitionValue(
            humidity,
            biomeRules.minHumidity,
            biomeRules.maxHumidity,
            neighborRules.minHumidity,
            neighborRules.maxHumidity,
            biomeRules.transitionRange
        );

        return Math.max(heightFactor, tempFactor, humidityFactor);
    }

    private calculateTransitionValue(
        value: number,
        min1: number,
        max1: number,
        min2: number,
        max2: number,
        transitionRange: number
    ): number {
        const range1 = max1 - min1;
        const range2 = max2 - min2;
        const center1 = (min1 + max1) / 2;
        const center2 = (min2 + max2) / 2;
        
        const distance = Math.abs(center1 - center2);
        const maxRange = Math.max(range1, range2) / 2;
        
        return Math.max(0, Math.min(1, (distance - maxRange) / transitionRange));
    }

    public getTransitionValue(x: number, y: number): number {
        if (!this.transitionBuffer || !this.transitionBuffer[y] || this.transitionBuffer[y][x] === undefined) {
            return 0;
        }
        return this.transitionBuffer[y][x];
    }
}