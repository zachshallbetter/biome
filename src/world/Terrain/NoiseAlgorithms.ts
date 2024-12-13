import { createNoise2D, createNoise3D, createNoise4D } from 'simplex-noise';

export class NoiseAlgorithms {
    private noise2D: (x: number, y: number) => number;
    private noise3D: (x: number, y: number, z: number) => number;
    private noise4D: (x: number, y: number, z: number, w: number) => number;

    constructor(seed?: string) {
        // Initialize noise functions
        this.noise2D = createNoise2D();
        this.noise3D = createNoise3D();
        this.noise4D = createNoise4D();
    }

    public fractalNoise2D(x: number, y: number, octaves: number, persistence: number, lacunarity: number, scale: number): number {
        let amplitude = 1;
        let frequency = 1;
        let noiseValue = 0;
        let amplitudeSum = 0;

        for (let i = 0; i < octaves; i++) {
            const sampleX = x * frequency / scale;
            const sampleY = y * frequency / scale;
            
            noiseValue += this.noise2D(sampleX, sampleY) * amplitude;
            amplitudeSum += amplitude;
            
            amplitude *= persistence;
            frequency *= lacunarity;
        }

        // Normalize to [-1, 1]
        return noiseValue / amplitudeSum;
    }

    public ridgedNoise2D(x: number, y: number, octaves: number, persistence: number, lacunarity: number, scale: number): number {
        let amplitude = 1;
        let frequency = 1;
        let noiseValue = 0;
        let amplitudeSum = 0;

        for (let i = 0; i < octaves; i++) {
            const sampleX = x * frequency / scale;
            const sampleY = y * frequency / scale;
            
            // Create ridge effect by inverting peaks
            let n = 1 - Math.abs(this.noise2D(sampleX, sampleY));
            // Square the value to create sharper ridges
            n *= n;
            
            noiseValue += n * amplitude;
            amplitudeSum += amplitude;
            
            amplitude *= persistence;
            frequency *= lacunarity;
        }

        return noiseValue / amplitudeSum;
    }

    public terraceNoise2D(x: number, y: number, octaves: number, persistence: number, lacunarity: number, scale: number, terraces: number): number {
        // Get base noise
        const noise = this.fractalNoise2D(x, y, octaves, persistence, lacunarity, scale);
        
        // Create terracing effect
        const terraceHeight = 1 / terraces;
        const currentTerrace = Math.floor(noise / terraceHeight);
        const nextTerrace = currentTerrace + 1;
        
        // Smooth interpolation between terraces
        const t = (noise - currentTerrace * terraceHeight) / terraceHeight;
        const smoothT = t * t * (3 - 2 * t);
        
        return (currentTerrace + smoothT) * terraceHeight;
    }

    public domainWarp2D(x: number, y: number, amplitude: number, frequency: number): [number, number] {
        const wx = this.noise2D(x * frequency, y * frequency) * amplitude;
        const wy = this.noise2D((x + 31.416) * frequency, (y + 31.416) * frequency) * amplitude;
        
        return [x + wx, y + wy];
    }

    public billowNoise2D(x: number, y: number, octaves: number, persistence: number, lacunarity: number, scale: number): number {
        let amplitude = 1;
        let frequency = 1;
        let noiseValue = 0;
        let amplitudeSum = 0;

        for (let i = 0; i < octaves; i++) {
            const sampleX = x * frequency / scale;
            const sampleY = y * frequency / scale;
            
            // Create billowy effect by taking absolute value
            const n = Math.abs(this.noise2D(sampleX, sampleY));
            
            noiseValue += n * amplitude;
            amplitudeSum += amplitude;
            
            amplitude *= persistence;
            frequency *= lacunarity;
        }

        return noiseValue / amplitudeSum;
    }

    public voronoiNoise2D(x: number, y: number, frequency: number, amplitude: number): number {
        const cellX = Math.floor(x * frequency);
        const cellY = Math.floor(y * frequency);
        let minDist = 1.0;

        // Check surrounding cells
        for (let xo = -1; xo <= 1; xo++) {
            for (let yo = -1; yo <= 1; yo++) {
                const cellPosX = cellX + xo;
                const cellPosY = cellY + yo;
                
                // Get random point position within cell
                const randX = cellPosX + this.noise2D(cellPosX, cellPosY);
                const randY = cellPosY + this.noise2D(cellPosX + 31.416, cellPosY + 31.416);
                
                // Calculate distance to point
                const dx = x * frequency - randX;
                const dy = y * frequency - randY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                minDist = Math.min(minDist, dist);
            }
        }

        return minDist * amplitude;
    }

    public hybridMultiFractal2D(x: number, y: number, octaves: number, persistence: number, lacunarity: number, scale: number, offset: number, gain: number): number {
        let result = (this.noise2D(x / scale, y / scale) + offset) * gain;
        let amplitude = 1;
        let frequency = 1;
        let weight = 1;

        for (let i = 1; i < octaves; i++) {
            frequency *= lacunarity;
            amplitude *= persistence;
            weight = result > 0 ? result : 1;
            
            const nx = x * frequency / scale;
            const ny = y * frequency / scale;
            
            result += (this.noise2D(nx, ny) + offset) * amplitude * weight;
        }

        return result;
    }
} 