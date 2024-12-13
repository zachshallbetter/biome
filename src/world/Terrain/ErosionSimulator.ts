import EventEmitter from 'eventemitter3';

interface Droplet {
    x: number;
    y: number;
    volume: number;
    speed: number;
    sediment: number;
    directionX: number;
    directionY: number;
}

export interface TerrainSettings {
    width: number;
    height: number;
    dropletLifetime?: number;
    erosionRate?: number;
    depositionRate?: number;
    minSlope?: number;
    erosionIterations?: number;
    erosionStrength?: number;
    erosionDeposition?: number;
    erosionSmoothness?: number;
}

export class ErosionSimulator extends EventEmitter {
    private heightMap: number[][];
    private width: number;
    private height: number;
    private dropletLifetime: number;
    private erosionRate: number;
    private depositionRate: number;
    private minSlope: number;
    private erosionIterations: number;
    private erosionStrength: number;
    private erosionDeposition: number;
    private erosionSmoothness: number;

    constructor(settings: TerrainSettings) {
        super();
        this.width = settings.width;
        this.height = settings.height;
        this.heightMap = Array(settings.height).fill(0).map(() => Array(settings.width).fill(0));
        this.dropletLifetime = settings.dropletLifetime ?? 30;
        this.erosionRate = settings.erosionRate ?? 0.3;
        this.depositionRate = settings.depositionRate ?? 0.3;
        this.minSlope = settings.minSlope ?? 0.01;
        this.erosionIterations = settings.erosionIterations ?? 50000;
        this.erosionStrength = settings.erosionStrength ?? 0.3;
        this.erosionDeposition = settings.erosionDeposition ?? 0.3;
        this.erosionSmoothness = settings.erosionSmoothness ?? 0.15;
    }

    public simulate(heightMap: number[][]): number[][] {
        this.heightMap = heightMap.map(row => [...row]);
        
        // Perform hydraulic erosion
        this.hydraulicErosion();
        
        // Perform thermal erosion
        this.thermalErosion();
        
        return this.heightMap;
    }

    private hydraulicErosion(): void {
        const dropletCount = this.erosionIterations;
        const erosionStrength = this.erosionStrength;
        const erosionDeposition = this.erosionDeposition;

        for (let i = 0; i < dropletCount; i++) {
            // Create a new water droplet at a random position
            const droplet: Droplet = {
                x: Math.random() * (this.width - 1),
                y: Math.random() * (this.height - 1),
                volume: 1.0,
                speed: 0.0,
                sediment: 0.0,
                directionX: 0.0,
                directionY: 0.0
            };

            // Simulate droplet path
            while (droplet.volume > 0.01) {
                // Get current cell coordinates
                const cellX = Math.floor(droplet.x);
                const cellY = Math.floor(droplet.y);
                
                if (cellX < 0 || cellX >= this.width - 1 || cellY < 0 || cellY >= this.height - 1) {
                    break;
                }

                // Calculate gradient at current position
                const gradient = this.calculateGradient(droplet.x, droplet.y);
                
                // Update droplet direction
                droplet.directionX = (droplet.directionX * 0.9 + gradient[0] * 0.1);
                droplet.directionY = (droplet.directionY * 0.9 + gradient[1] * 0.1);
                
                // Normalize direction
                const len = Math.sqrt(droplet.directionX * droplet.directionX + droplet.directionY * droplet.directionY);
                if (len !== 0) {
                    droplet.directionX /= len;
                    droplet.directionY /= len;
                }

                // Update position
                droplet.x += droplet.directionX;
                droplet.y += droplet.directionY;
                
                // Calculate height difference
                const oldHeight = this.getInterpolatedHeight(droplet.x - droplet.directionX, droplet.y - droplet.directionY);
                const newHeight = this.getInterpolatedHeight(droplet.x, droplet.y);
                const heightDiff = newHeight - oldHeight;

                // Update speed and volume
                droplet.speed = Math.sqrt(Math.max(0, droplet.speed * droplet.speed + heightDiff * 9.81));
                droplet.volume *= 0.99;

                // Calculate sediment capacity
                const capacity = Math.max(-heightDiff, 0.01) * droplet.speed * droplet.volume * erosionStrength;

                // If carrying more sediment than capacity, deposit sediment
                if (droplet.sediment > capacity) {
                    const amountToDeposit = (droplet.sediment - capacity) * erosionDeposition;
                    droplet.sediment -= amountToDeposit;
                    this.deposit(droplet.x, droplet.y, amountToDeposit);
                }
                // Otherwise, erode surface
                else {
                    const amountToErode = Math.min((capacity - droplet.sediment) * erosionStrength, -heightDiff);
                    droplet.sediment += amountToErode;
                    this.erode(droplet.x, droplet.y, amountToErode);
                }
            }

            if (i % 1000 === 0) {
                this.emit('erosionProgress', i / dropletCount);
            }
        }
    }

    private thermalErosion(): void {
        const iterations = Math.floor(this.erosionIterations * 0.2);
        const talus = Math.tan(Math.PI * 0.25); // Maximum stable slope angle (45 degrees)

        for (let iter = 0; iter < iterations; iter++) {
            for (let y = 0; y < this.height - 1; y++) {
                for (let x = 0; x < this.width - 1; x++) {
                    const currentHeight = this.heightMap[y][x];
                    
                    // Check each neighbor
                    const neighbors = [
                        [x + 1, y],
                        [x - 1, y],
                        [x, y + 1],
                        [x, y - 1]
                    ];

                    for (const [nx, ny] of neighbors) {
                        if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                            const heightDiff = currentHeight - this.heightMap[ny][nx];
                            const distance = 1.0; // Distance between cells
                            const slope = heightDiff / distance;

                            if (slope > talus) {
                                const amount = (slope - talus) * this.erosionSmoothness;
                                this.heightMap[y][x] -= amount * 0.5;
                                this.heightMap[ny][nx] += amount * 0.5;
                            }
                        }
                    }
                }
            }

            if (iter % 10 === 0) {
                this.emit('thermalErosionProgress', iter / iterations);
            }
        }
    }

    private calculateGradient(x: number, y: number): [number, number] {
        const cellX = Math.floor(x);
        const cellY = Math.floor(y);
        const fx = x - cellX;
        const fy = y - cellY;

        // Calculate heights at cell corners
        const h00 = this.heightMap[cellY][cellX];
        const h10 = this.heightMap[cellY][Math.min(cellX + 1, this.width - 1)];
        const h01 = this.heightMap[Math.min(cellY + 1, this.height - 1)][cellX];
        const h11 = this.heightMap[Math.min(cellY + 1, this.height - 1)][Math.min(cellX + 1, this.width - 1)];

        // Calculate gradient using bilinear interpolation
        const gradientX = (h10 - h00) * (1 - fy) + (h11 - h01) * fy;
        const gradientY = (h01 - h00) * (1 - fx) + (h11 - h10) * fx;

        return [gradientX, gradientY];
    }

    private getInterpolatedHeight(x: number, y: number): number {
        const cellX = Math.floor(x);
        const cellY = Math.floor(y);
        const fx = x - cellX;
        const fy = y - cellY;

        if (cellX < 0 || cellX >= this.width - 1 || cellY < 0 || cellY >= this.height - 1) {
            return 0;
        }

        // Get heights of four nearest cells
        const h00 = this.heightMap[cellY][cellX];
        const h10 = this.heightMap[cellY][cellX + 1];
        const h01 = this.heightMap[cellY + 1][cellX];
        const h11 = this.heightMap[cellY + 1][cellX + 1];

        // Bilinear interpolation
        return h00 * (1 - fx) * (1 - fy) +
               h10 * fx * (1 - fy) +
               h01 * (1 - fx) * fy +
               h11 * fx * fy;
    }

    private deposit(x: number, y: number, amount: number): void {
        const cellX = Math.floor(x);
        const cellY = Math.floor(y);
        const fx = x - cellX;
        const fy = y - cellY;

        if (cellX < 0 || cellX >= this.width - 1 || cellY < 0 || cellY >= this.height - 1) {
            return;
        }

        // Distribute sediment to four nearest cells based on distance
        this.heightMap[cellY][cellX] += amount * (1 - fx) * (1 - fy);
        this.heightMap[cellY][cellX + 1] += amount * fx * (1 - fy);
        this.heightMap[cellY + 1][cellX] += amount * (1 - fx) * fy;
        this.heightMap[cellY + 1][cellX + 1] += amount * fx * fy;
    }

    private erode(x: number, y: number, amount: number): void {
        const cellX = Math.floor(x);
        const cellY = Math.floor(y);
        const fx = x - cellX;
        const fy = y - cellY;

        if (cellX < 0 || cellX >= this.width - 1 || cellY < 0 || cellY >= this.height - 1) {
            return;
        }

        // Remove sediment from four nearest cells based on distance
        this.heightMap[cellY][cellX] -= amount * (1 - fx) * (1 - fy);
        this.heightMap[cellY][cellX + 1] -= amount * fx * (1 - fy);
        this.heightMap[cellY + 1][cellX] -= amount * (1 - fx) * fy;
        this.heightMap[cellY + 1][cellX + 1] -= amount * fx * fy;
    }
} 