export interface WeatherData {
    type: string;
    intensity: number;
    temperature: number;
    humidity: number;
}

export interface TimeData {
    time: number;
    dayNightCycle: number;
}

export class DebugPanel {
    private fpsElement: HTMLElement | null = null;
    private weatherElement: HTMLElement | null = null;
    private timeElement: HTMLElement | null = null;

    constructor() {
        console.log('DebugPanel constructor started');
    }

    public initialize(): void {
        console.log('Initializing DebugPanel');
        this.fpsElement = document.getElementById('fps');
        this.weatherElement = document.getElementById('weather');
        this.timeElement = document.getElementById('time');

        if (!this.fpsElement || !this.weatherElement || !this.timeElement) {
            console.error('Failed to find debug panel elements');
        }
    }

    public updateFPS(fps: number): void {
        if (this.fpsElement) {
            this.fpsElement.textContent = `FPS: ${fps}`;
        }
    }

    public updateWeather(data: WeatherData): void {
        if (this.weatherElement) {
            this.weatherElement.textContent = `Weather: ${data.type} (${Math.round(data.intensity * 100)}%)
            Temp: ${Math.round(data.temperature)}°C
            Humidity: ${Math.round(data.humidity * 100)}%`;
        }
    }

    public updateTime(data: TimeData): void {
        if (this.timeElement) {
            const hours = Math.floor(data.time / 60);
            const minutes = Math.floor(data.time % 60);
            this.timeElement.textContent = `Time: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }
    }

    public update(): void {
        // Update any dynamic content that doesn't rely on engine data
    }
} 