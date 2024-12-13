export interface TerrainSettings {
    // Basic terrain settings
    width: number;
    height: number;
    seed: string;
    scale: number;

    // Noise settings
    baseOctaves: number;
    basePersistence: number;
    baseLacunarity: number;
    baseScale: number;

    // Mountain settings
    mountainOctaves: number;
    mountainPersistence: number;
    mountainLacunarity: number;
    mountainScale: number;
    mountainWeight: number;

    // Ocean settings
    oceanOctaves: number;
    oceanPersistence: number;
    oceanLacunarity: number;
    oceanScale: number;
    oceanLevel: number;

    // Erosion settings
    erosionIterations: number;
    erosionStrength: number;
    erosionDeposition: number;
    erosionSmoothness: number;

    // Biome thresholds
    heightThresholds: {
        deepOcean: number;
        ocean: number;
        beach: number;
        lowland: number;
        hills: number;
        mountains: number;
        peaks: number;
    };

    // Climate settings
    temperatureScale: number;
    humidityScale: number;
    temperatureOffset: number;
    humidityOffset: number;
}

export const DEFAULT_TERRAIN_SETTINGS: TerrainSettings = {
    width: 256,
    height: 256,
    seed: 'biome-default-seed',
    scale: 1.0,

    baseOctaves: 6,
    basePersistence: 0.5,
    baseLacunarity: 2.0,
    baseScale: 100.0,

    mountainOctaves: 4,
    mountainPersistence: 0.5,
    mountainLacunarity: 2.0,
    mountainScale: 150.0,
    mountainWeight: 0.35,

    oceanOctaves: 2,
    oceanPersistence: 0.6,
    oceanLacunarity: 2.0,
    oceanScale: 200.0,
    oceanLevel: 0.4,

    erosionIterations: 50000,
    erosionStrength: 0.3,
    erosionDeposition: 0.1,
    erosionSmoothness: 0.15,

    heightThresholds: {
        deepOcean: 0.2,
        ocean: 0.4,
        beach: 0.45,
        lowland: 0.55,
        hills: 0.7,
        mountains: 0.85,
        peaks: 0.95
    },

    temperatureScale: 250.0,
    humidityScale: 300.0,
    temperatureOffset: 0.0,
    humidityOffset: 0.2
}; 