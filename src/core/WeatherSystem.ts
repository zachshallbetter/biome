import EventEmitter from 'eventemitter3';
import { ProceduralSystem } from './ProceduralSystem';

export enum WeatherType {
    CLEAR = 'CLEAR',
    CLOUDY = 'CLOUDY',
    RAIN = 'RAIN',
    STORM = 'STORM',
    SNOW = 'SNOW'
}

export interface WeatherData {
    type: WeatherType;
    intensity: number;
    temperature: number;
    humidity: number;
    windSpeed: number;
    windDirection: number; // In radians
    precipitation: number;
    cloudCover: number;
    visibility: number;
    pressure: number;
}

export class WeatherSystem extends EventEmitter {
    private currentState: WeatherData;
    private targetState: WeatherData;
    private transitionDuration: number = 0;
    private transitionTime: number = 0;
    private proceduralSystem: ProceduralSystem;
    private isInitialized: boolean = false;

    constructor() {
        super();
        this.proceduralSystem = new ProceduralSystem();
        
        // Initialize with default weather
        this.currentState = this.createDefaultWeather();
        this.targetState = { ...this.currentState };
    }

    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            await this.proceduralSystem.initialize();
            this.isInitialized = true;
            this.emit('initialized');
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    public start(): void {
        if (!this.isInitialized) {
            throw new Error('WeatherSystem must be initialized before starting');
        }
        this.emit('started');
    }

    public stop(): void {
        this.emit('stopped');
    }

    public update(deltaTime: number): void {
        if (this.transitionDuration > 0) {
            this.updateTransition(deltaTime);
        }

        // Update weather effects based on current state
        this.updateWeatherEffects(deltaTime);
        
        this.emit('update', this.currentState);
    }

    private updateTransition(deltaTime: number): void {
        this.transitionTime += deltaTime;
        const t = Math.min(this.transitionTime / this.transitionDuration, 1);

        // Interpolate between current and target states
        this.currentState = {
            type: this.targetState.type, // Don't interpolate enum
            intensity: this.lerp(this.currentState.intensity, this.targetState.intensity, t),
            temperature: this.lerp(this.currentState.temperature, this.targetState.temperature, t),
            humidity: this.lerp(this.currentState.humidity, this.targetState.humidity, t),
            windSpeed: this.lerp(this.currentState.windSpeed, this.targetState.windSpeed, t),
            windDirection: this.lerpAngle(this.currentState.windDirection, this.targetState.windDirection, t),
            precipitation: this.lerp(this.currentState.precipitation, this.targetState.precipitation, t),
            cloudCover: this.lerp(this.currentState.cloudCover, this.targetState.cloudCover, t),
            visibility: this.lerp(this.currentState.visibility, this.targetState.visibility, t),
            pressure: this.lerp(this.currentState.pressure, this.targetState.pressure, t)
        };

        if (t >= 1) {
            this.transitionDuration = 0;
            this.transitionTime = 0;
            this.emit('transitionComplete', this.currentState);
        }
    }

    private updateWeatherEffects(deltaTime: number): void {
        // Add small random variations to create more dynamic weather
        const variation = 0.1;
        this.currentState.intensity += (Math.random() - 0.5) * variation * deltaTime;
        this.currentState.intensity = Math.max(0, Math.min(1, this.currentState.intensity));

        this.currentState.windSpeed += (Math.random() - 0.5) * variation * deltaTime;
        this.currentState.windSpeed = Math.max(0, this.currentState.windSpeed);

        this.currentState.windDirection += (Math.random() - 0.5) * variation * deltaTime;
    }

    public transitionTo(newWeather: Partial<WeatherData>, duration: number = 10): void {
        this.targetState = {
            ...this.currentState,
            ...newWeather
        };
        this.transitionDuration = duration;
        this.transitionTime = 0;
        this.emit('transitionStart', { from: this.currentState, to: this.targetState, duration });
    }

    public getCurrentWeather(): WeatherData {
        return { ...this.currentState };
    }

    public generateWeatherForLocation(x: number, y: number, elevation: number): WeatherData {
        const noiseValue = this.proceduralSystem.generateNoise3D(x, y, elevation);
        
        // Use noise value to generate weather parameters
        const weather = this.createDefaultWeather();
        weather.temperature = this.lerp(0, 30, noiseValue); // 0°C to 30°C
        weather.humidity = Math.max(0, Math.min(1, noiseValue));
        weather.windSpeed = this.lerp(0, 20, Math.abs(this.proceduralSystem.generateNoise2D(x, y))); // 0 to 20 m/s
        weather.windDirection = this.proceduralSystem.generateNoise2D(x + 1000, y + 1000) * Math.PI * 2;
        
        // Determine weather type based on conditions
        weather.type = this.determineWeatherType(weather);
        
        return weather;
    }

    private determineWeatherType(weather: WeatherData): WeatherType {
        if (weather.temperature < 0) {
            return WeatherType.SNOW;
        } else if (weather.humidity > 0.8) {
            return weather.temperature > 20 ? WeatherType.STORM : WeatherType.RAIN;
        } else if (weather.humidity > 0.5) {
            return WeatherType.CLOUDY;
        }
        return WeatherType.CLEAR;
    }

    private createDefaultWeather(): WeatherData {
        return {
            type: WeatherType.CLEAR,
            intensity: 0,
            temperature: 20,
            humidity: 0.5,
            windSpeed: 0,
            windDirection: 0,
            precipitation: 0,
            cloudCover: 0,
            visibility: 10000, // 10km visibility
            pressure: 1013.25 // Standard atmospheric pressure in hPa
        };
    }

    private lerp(a: number, b: number, t: number): number {
        return a + (b - a) * t;
    }

    private lerpAngle(a: number, b: number, t: number): number {
        const diff = (b - a + Math.PI) % (Math.PI * 2) - Math.PI;
        return a + diff * t;
    }
} 