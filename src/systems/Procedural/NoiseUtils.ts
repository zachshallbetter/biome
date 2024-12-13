import { createNoise2D, createNoise3D, createNoise4D } from 'simplex-noise';

export class NoiseUtils {
    private static noise2D = createNoise2D();
    private static noise3D = createNoise3D();
    private static noise4D = createNoise4D();

    public static fractalNoise2D(x: number, y: number, octaves: number, persistence: number, lacunarity: number, scale: number): number {
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

        return noiseValue / amplitudeSum;
    }

    public static ridgedNoise2D(x: number, y: number, octaves: number, persistence: number, lacunarity: number, scale: number): number {
        let amplitude = 1;
        let frequency = 1;
        let noiseValue = 0;
        let amplitudeSum = 0;

        for (let i = 0; i < octaves; i++) {
            const sampleX = x * frequency / scale;
            const sampleY = y * frequency / scale;
            
            // Create ridge effect by inverting absolute noise value
            const ridge = 1 - Math.abs(this.noise2D(sampleX, sampleY));
            noiseValue += ridge * ridge * amplitude;
            
            amplitudeSum += amplitude;
            amplitude *= persistence;
            frequency *= lacunarity;
        }

        return noiseValue / amplitudeSum;
    }

    public static warpedNoise2D(x: number, y: number, warpStrength: number, scale: number): number {
        // Create warping offsets using different noise frequencies
        const warpX = this.noise2D(x / scale, y / scale) * warpStrength;
        const warpY = this.noise2D((x + 31.416) / scale, y / scale) * warpStrength;
        
        // Sample noise at warped coordinates
        return this.noise2D((x + warpX) / scale, (y + warpY) / scale);
    }

    public static bilerpNoise2D(x: number, y: number, scale: number): number {
        const x0 = Math.floor(x / scale);
        const x1 = x0 + 1;
        const y0 = Math.floor(y / scale);
        const y1 = y0 + 1;

        const sx = (x / scale) - x0;
        const sy = (y / scale) - y0;

        // Sample noise at grid points
        const n00 = this.noise2D(x0, y0);
        const n10 = this.noise2D(x1, y0);
        const n01 = this.noise2D(x0, y1);
        const n11 = this.noise2D(x1, y1);

        // Bilinear interpolation
        const nx0 = this.lerp(n00, n10, sx);
        const nx1 = this.lerp(n01, n11, sx);
        return this.lerp(nx0, nx1, sy);
    }

    public static domainWarpNoise2D(x: number, y: number, frequency: number, amplitude: number): [number, number] {
        const wx = this.noise2D(x * frequency, y * frequency);
        const wy = this.noise2D(x * frequency + 31.416, y * frequency + 31.416);
        
        return [x + wx * amplitude, y + wy * amplitude];
    }

    private static lerp(a: number, b: number, t: number): number {
        return a + (b - a) * t;
    }

    public static remap(value: number, min1: number, max1: number, min2: number, max2: number): number {
        return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
    }

    public static fbm2D(x: number, y: number, octaves: number, persistence: number, lacunarity: number, scale: number): number {
        let value = 0;
        let amplitude = 1;
        let frequency = 1;
        let maxValue = 0;

        for (let i = 0; i < octaves; i++) {
            value += this.noise2D(x * frequency / scale, y * frequency / scale) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= lacunarity;
        }

        return value / maxValue;
    }
} 