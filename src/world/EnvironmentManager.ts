import EventEmitter from 'eventemitter3';
import { BiomeManager, BiomeType } from './BiomeManager';
import { WeatherSystem, WeatherData } from '../core/WeatherSystem';
import { TimeManager } from '../core/TimeManager';

export interface EnvironmentalConditions {
    temperature: number;
    humidity: number;
    windSpeed: number;
    windDirection: number;
    lightLevel: number;
}

export interface EnvironmentState {
    time: number;
    weather: WeatherData;
    biome: BiomeType;
    temperature: number;
    humidity: number;
    windSpeed: number;
    windDirection: number;
    lightLevel: number;
}

export class EnvironmentManager extends EventEmitter {
    private biomeManager: BiomeManager;
    private weatherSystem: WeatherSystem;
    private timeManager: TimeManager;
    private currentState: EnvironmentState;

    constructor(
        biomeManager: BiomeManager,
        weatherSystem: WeatherSystem,
        timeManager: TimeManager
    ) {
        super();
        this.biomeManager = biomeManager;
        this.weatherSystem = weatherSystem;
        this.timeManager = timeManager;
        
        const initialWeather = weatherSystem.getCurrentWeather();
        this.currentState = {
            time: 0,
            weather: {
                ...initialWeather,
                precipitation: 0,
                cloudCover: 0,
                visibility: 10000,
                pressure: 1013.25
            },
            biome: biomeManager.getCurrentBiome(),
            temperature: 20,
            humidity: 0.5,
            windSpeed: 0,
            windDirection: 0,
            lightLevel: 1.0
        };

        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        this.weatherSystem.on('weatherChanged', this.onWeatherUpdate.bind(this));
        this.timeManager.on('update', this.onTimeUpdate.bind(this));
        this.biomeManager.on('biomeChanged', this.onBiomeUpdate.bind(this));
    }

    private onWeatherUpdate(weatherData: WeatherData): void {
        this.currentState.weather = weatherData;
        this.currentState.temperature = weatherData.temperature;
        this.currentState.humidity = weatherData.humidity;
        this.currentState.windSpeed = weatherData.windSpeed;
        this.currentState.windDirection = weatherData.windDirection;

        this.emit('environmentUpdate', {
            type: 'weather',
            data: this.currentState
        });
    }

    private onTimeUpdate(deltaTime: number): void {
        this.currentState.time += deltaTime;

        // Update environment based on time of day
        const timeOfDay = (this.currentState.time % 24) / 24; // Normalized time (0-1)
        
        // Adjust temperature based on time of day
        const baseTemp = this.currentState.weather.temperature;
        const tempVariation = Math.sin(timeOfDay * Math.PI * 2) * 5; // ±5 degrees variation
        this.currentState.temperature = baseTemp + tempVariation;

        // Update light level based on time of day
        this.currentState.lightLevel = Math.sin(timeOfDay * Math.PI) * 0.8 + 0.2; // 0.2 to 1.0

        this.emit('environmentUpdate', {
            type: 'time',
            data: this.currentState
        });
    }

    private onBiomeUpdate(biome: BiomeType): void {
        this.currentState.biome = biome;
        
        this.emit('environmentUpdate', {
            type: 'biome',
            data: this.currentState
        });
    }

    public update(deltaTime: number): void {
        // Update any continuous environmental changes
        this.updateWindConditions(deltaTime);
        this.updateTemperature(deltaTime);
        this.updateHumidity(deltaTime);
    }

    private updateWindConditions(deltaTime: number): void {
        // Gradually change wind conditions
        const windChangeRate = 0.1;
        const windSpeedNoise = (Math.random() - 0.5) * 2 * deltaTime * windChangeRate;
        const windDirectionNoise = (Math.random() - 0.5) * Math.PI * deltaTime * windChangeRate;

        this.currentState.windSpeed = Math.max(0, Math.min(30, this.currentState.windSpeed + windSpeedNoise));
        this.currentState.windDirection = (this.currentState.windDirection + windDirectionNoise) % (Math.PI * 2);
    }

    private updateTemperature(deltaTime: number): void {
        // Temperature changes based on weather and time
        const targetTemp = this.currentState.weather.temperature;
        const tempDiff = targetTemp - this.currentState.temperature;
        const tempChangeRate = 0.1;

        this.currentState.temperature += tempDiff * tempChangeRate * deltaTime;
    }

    private updateHumidity(deltaTime: number): void {
        // Humidity changes based on weather and temperature
        const targetHumidity = this.currentState.weather.humidity;
        const humidityDiff = targetHumidity - this.currentState.humidity;
        const humidityChangeRate = 0.05;

        this.currentState.humidity += humidityDiff * humidityChangeRate * deltaTime;
    }

    public getCurrentState(): EnvironmentState {
        return { ...this.currentState };
    }

    public getEnvironmentalConditions(biomeType: BiomeType): EnvironmentalConditions {
        return {
            temperature: this.currentState.temperature,
            humidity: this.currentState.humidity,
            windSpeed: this.currentState.windSpeed,
            windDirection: this.currentState.windDirection,
            lightLevel: this.currentState.lightLevel
        };
    }
}