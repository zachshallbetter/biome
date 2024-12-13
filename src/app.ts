import { Engine } from './core/Engine';
import { WeatherType } from './core/WeatherSystem';
import { createNoise2D } from 'simplex-noise';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';

async function main() {
    try {
        // Create Express app
        const app = express();
        const httpServer = createServer(app);
        const io = new Server(httpServer, {
            cors: {
                origin: "http://localhost:3000",
                methods: ["GET", "POST"]
            }
        });

        // Serve static files from dist/client
        app.use(express.static(path.join(__dirname, '../dist/client')));

        // Get the engine instance
        const engine = Engine.getInstance();

        // Initialize the engine
        console.log('Initializing Biome Engine...');
        await engine.initialize();
        console.log('Engine initialized successfully');

        // Handle WebSocket connections
        io.on('connection', (socket) => {
            console.log('Client connected');

            // Generate and send terrain data
            const terrainSize = 128; // Increased size for more detail
            console.log('Generating terrain with size:', terrainSize, 'x', terrainSize);
            const terrainHeights: number[][] = [];
            const biomeMap: number[][] = [];
            
            // Create Simplex noise for terrain generation
            const noise2D = createNoise2D();
            const scale = 0.03; // Scale for the noise
            const mountainScale = 0.05; // Scale for mountain noise
            
            console.log('Generating terrain using scales:', {
                baseScale: scale,
                mountainScale: mountainScale
            });

            let minHeight = 1, maxHeight = 0;
            let biomeCounts: { [key: number]: number } = {};
            
            for (let y = 0; y < terrainSize; y++) {
                terrainHeights[y] = [];
                biomeMap[y] = [];
                for (let x = 0; x < terrainSize; x++) {
                    // Generate base terrain
                    const baseHeight = (noise2D(x * scale, y * scale) + 1) * 0.5;
                    
                    // Add mountains
                    const mountainNoise = Math.pow(Math.max(0, noise2D(x * mountainScale, y * mountainScale)), 2);
                    const mountainHeight = mountainNoise * 0.5;
                    
                    // Combine base terrain and mountains
                    const height = baseHeight * 0.7 + mountainHeight * 0.3;
                    terrainHeights[y][x] = height;
                    
                    // Track min/max heights
                    minHeight = Math.min(minHeight, height);
                    maxHeight = Math.max(maxHeight, height);
                    
                    // Determine biome based on height and position
                    let biomeType: number;
                    if (height < 0.2) {
                        biomeType = 0; // Deep Ocean
                    } else if (height < 0.3) {
                        biomeType = 1; // Ocean
                    } else if (height < 0.35) {
                        biomeType = 2; // Beach
                    } else if (height < 0.5) {
                        biomeType = 3; // Plains
                    } else if (height < 0.6) {
                        biomeType = 5; // Forest
                    } else if (height < 0.7) {
                        biomeType = 6; // Dense Forest
                    } else if (height < 0.8) {
                        biomeType = 7; // Mountains
                    } else {
                        biomeType = 8; // Snow
                    }
                    
                    biomeMap[y][x] = biomeType;
                    biomeCounts[biomeType] = (biomeCounts[biomeType] || 0) + 1;
                }
            }

            console.log('Terrain generation complete:', {
                heightRange: { min: minHeight, max: maxHeight },
                biomeDistribution: Object.entries(biomeCounts).map(([biome, count]) => ({
                    biome: getBiomeName(parseInt(biome)),
                    percentage: (count / (terrainSize * terrainSize) * 100).toFixed(1) + '%'
                }))
            });

            socket.emit('terrainUpdate', {
                heightMap: terrainHeights,
                biomeMap: biomeMap,
                size: {
                    width: terrainSize,
                    height: terrainSize
                }
            });

            // Set up weather cycle
            const weatherCycle = async () => {
                const weatherTypes = [
                    WeatherType.CLEAR,
                    WeatherType.CLOUDY,
                    WeatherType.RAIN,
                    WeatherType.STORM,
                    WeatherType.SNOW
                ];

                let currentIndex = 0;
                
                setInterval(() => {
                    const nextWeather = weatherTypes[currentIndex];
                    const intensity = Math.random();
                    const temperature = nextWeather === WeatherType.SNOW ? -5 : 15 + Math.random() * 10;
                    const humidity = Math.random();
                    const windSpeed = Math.random() * 10;
                    const windDirection = Math.random() * Math.PI * 2;

                    console.log('Weather transition:', {
                        type: nextWeather,
                        intensity: intensity.toFixed(2),
                        temperature: temperature.toFixed(1) + '°C',
                        humidity: (humidity * 100).toFixed(1) + '%',
                        windSpeed: windSpeed.toFixed(1) + ' m/s',
                        windDirection: (windDirection * 180 / Math.PI).toFixed(1) + '°'
                    });
                    
                    const weatherData = {
                        type: nextWeather,
                        intensity,
                        temperature,
                        humidity,
                        windSpeed,
                        windDirection
                    };

                    engine.getWeatherSystem().transitionTo(weatherData, 5);
                    io.emit('weatherUpdate', weatherData);

                    currentIndex = (currentIndex + 1) % weatherTypes.length;
                }, 15000);
            };

            // Start the weather cycle
            weatherCycle();

            // Emit time updates
            setInterval(() => {
                const gameTime = engine.getTimeManager().getGameTime();
                const dayNightCycle = (gameTime % 24) / 24;
                const timeData = {
                    time: gameTime,
                    dayNightCycle
                };

                console.log('Time update:', {
                    gameTime: Math.floor(gameTime) + ':' + Math.floor((gameTime % 1) * 60).toString().padStart(2, '0'),
                    dayPhase: getDayPhase(dayNightCycle),
                    lightLevel: (Math.sin(dayNightCycle * Math.PI) * 100).toFixed(1) + '%'
                });

                io.emit('timeUpdate', timeData);
            }, 1000);

            // Handle disconnection
            socket.on('disconnect', () => {
                console.log('Client disconnected');
            });
        });

        // Start the engine
        engine.start();
        console.log('Engine started');

        // Start the server
        const PORT = process.env.PORT || 8080;
        httpServer.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

        // Example cleanup function
        const cleanup = () => {
            console.log('Shutting down Biome Engine...');
            engine.stop();
            httpServer.close(() => {
                process.exit(0);
            });
        };

        // Handle cleanup on process termination
        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);

    } catch (error) {
        console.error('Failed to initialize Biome Engine:', error);
        process.exit(1);
    }
}

type BiomeNames = {
    [key: number]: string;
};

const biomeNames: BiomeNames = {
    0: 'Deep Ocean',
    1: 'Ocean',
    2: 'Beach',
    3: 'Plains',
    4: 'Desert',
    5: 'Forest',
    6: 'Dense Forest',
    7: 'Mountains',
    8: 'Snow'
};

function getBiomeName(biomeType: number): string {
    return biomeNames[biomeType] || 'Unknown';
}

function getDayPhase(dayNightCycle: number): string {
    if (dayNightCycle < 0.25) return 'Night';
    if (dayNightCycle < 0.35) return 'Dawn';
    if (dayNightCycle < 0.65) return 'Day';
    if (dayNightCycle < 0.75) return 'Dusk';
    return 'Night';
}

main().catch(console.error); 