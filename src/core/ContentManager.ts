import EventEmitter from 'eventemitter3';
import { ProceduralSystem } from './ProceduralSystem';

// Define ImageData interface for Node.js environment
interface ImageData {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    colorSpace: string;
}

export interface Asset {
    id: string;
    type: 'texture' | 'model' | 'sound' | 'shader';
    path: string;
    data?: any;
    metadata?: Record<string, any>;
}

export interface ProceduralStyle {
    id: string;
    parameters: Record<string, number>;
    rules: Record<string, any>;
}

export class ContentManager extends EventEmitter {
    private assets: Map<string, Asset>;
    private styles: Map<string, ProceduralStyle>;
    private proceduralSystem: ProceduralSystem;
    private loadingPromises: Map<string, Promise<void>>;
    private isInitialized: boolean = false;

    constructor() {
        super();
        this.assets = new Map();
        this.styles = new Map();
        this.loadingPromises = new Map();
        this.proceduralSystem = new ProceduralSystem();
    }

    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            await this.proceduralSystem.initialize();
            await this.loadDefaultStyles();
            this.isInitialized = true;
            this.emit('initialized');
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    public async loadAsset(asset: Asset): Promise<void> {
        if (this.loadingPromises.has(asset.id)) {
            return this.loadingPromises.get(asset.id);
        }

        const loadingPromise = new Promise<void>((resolve, reject) => {
            // Simulate asset loading
            setTimeout(() => {
                try {
                    this.assets.set(asset.id, {
                        ...asset,
                        data: null // In a real implementation, this would be the loaded asset data
                    });
                    this.emit('assetLoaded', asset.id);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            }, 100);
        });

        this.loadingPromises.set(asset.id, loadingPromise);
        return loadingPromise;
    }

    public async loadAssets(assets: Asset[]): Promise<void> {
        await Promise.all(assets.map(asset => this.loadAsset(asset)));
    }

    public getAsset(id: string): Asset | undefined {
        return this.assets.get(id);
    }

    public unloadAsset(id: string): void {
        this.assets.delete(id);
        this.loadingPromises.delete(id);
        this.emit('assetUnloaded', id);
    }

    public registerStyle(style: ProceduralStyle): void {
        this.styles.set(style.id, style);
        this.emit('styleRegistered', style.id);
    }

    public getStyle(id: string): ProceduralStyle | undefined {
        return this.styles.get(id);
    }

    public getAllStyles(): ProceduralStyle[] {
        return Array.from(this.styles.values());
    }

    public generateProceduralTexture(width: number, height: number, style: ProceduralStyle): ImageData {
        // Create a new Uint8ClampedArray for the image data
        const data = new Uint8ClampedArray(width * height * 4);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const noise = this.proceduralSystem.generateNoise2D(x * style.parameters.scale, y * style.parameters.scale);
                const index = (y * width + x) * 4;
                
                // Convert noise to RGB
                const value = Math.floor((noise + 1) * 127.5);
                data[index] = value;     // R
                data[index + 1] = value; // G
                data[index + 2] = value; // B
                data[index + 3] = 255;   // A
            }
        }

        return {
            data,
            width,
            height,
            colorSpace: 'srgb'
        };
    }

    private async loadDefaultStyles(): Promise<void> {
        // Register some default procedural styles
        this.registerStyle({
            id: 'default-terrain',
            parameters: {
                scale: 0.01,
                roughness: 0.5,
                detail: 0.3
            },
            rules: {
                heightRange: [0, 1],
                blendingMode: 'normal'
            }
        });

        this.registerStyle({
            id: 'weathered-stone',
            parameters: {
                scale: 0.02,
                weathering: 0.7,
                cracking: 0.4
            },
            rules: {
                erosionPattern: 'natural',
                textureBlending: true
            }
        });
    }

    public modifyStyle(id: string, parameters: Partial<Record<string, number>>): void {
        const style = this.styles.get(id);
        if (style) {
            // Filter out any undefined values and ensure all values are numbers
            const validParameters = Object.entries(parameters)
                .filter(([_, value]) => typeof value === 'number')
                .reduce<Record<string, number>>((acc, [key, value]) => {
                    acc[key] = value as number;
                    return acc;
                }, {});
            
            style.parameters = { ...style.parameters, ...validParameters };
            this.emit('styleModified', id);
        }
    }

    public generateVariation(baseStyle: ProceduralStyle, variationAmount: number): ProceduralStyle {
        const variation: ProceduralStyle = {
            id: `${baseStyle.id}-variation-${Date.now()}`,
            parameters: { ...baseStyle.parameters },
            rules: { ...baseStyle.rules }
        };

        // Add random variations to parameters
        Object.keys(variation.parameters).forEach(key => {
            const baseValue = variation.parameters[key];
            variation.parameters[key] = baseValue + (Math.random() - 0.5) * 2 * variationAmount * baseValue;
        });

        return variation;
    }
} 