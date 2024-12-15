import { SceneManager } from '../SceneManager';

export interface WeatherData {
    type: string;
    intensity: number;
    temperature: number;
    humidity: number;
    windSpeed: number;
    windDirection: number;
}

export interface TimeData {
    time: number;
    dayNightCycle: number;
}

export class Console {
    private container: HTMLElement;
    private fpsDisplay: HTMLElement;
    private timeDisplay: HTMLElement;
    private weatherDisplay: HTMLElement;

    constructor(sceneManager: SceneManager) {
        // Create main container
        this.container = document.getElementById('console') || document.createElement('div');
        this.container.id = 'console';

        // Create displays
        this.fpsDisplay = document.getElementById('fps') || document.createElement('div');
        this.timeDisplay = document.getElementById('time') || document.createElement('div'); 
        this.weatherDisplay = document.getElementById('weather') || document.createElement('div');

        this.fpsDisplay.id = 'fps';
        this.timeDisplay.id = 'time';
        this.weatherDisplay.id = 'weather';

        // Set initial values
        this.fpsDisplay.textContent = 'FPS: --';
        this.timeDisplay.textContent = 'Time: --:--';
        this.weatherDisplay.textContent = 'Weather: Clear';

        // Add to container if not already present
        if (!document.getElementById('fps')) {
            this.container.appendChild(this.fpsDisplay);
        }
        if (!document.getElementById('time')) {
            this.container.appendChild(this.timeDisplay);
        }
        if (!document.getElementById('weather')) {
            this.container.appendChild(this.weatherDisplay);
        }

        // Add container to document if not already present
        if (!document.getElementById('console')) {
            document.body.appendChild(this.container);
        }
    }

    public updateFPS(fps: number): void {
        this.fpsDisplay.textContent = `FPS: ${Math.round(fps)}`;
    }

    public updateWeather(data: WeatherData): void {
        this.weatherDisplay.textContent = `Weather: ${data.type}`;
    }

    public updateTime(data: TimeData): void {
        const hours = Math.floor(data.time / 60);
        const minutes = Math.floor(data.time % 60);
        this.timeDisplay.textContent = `Time: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    public updateInfo(info: any): void {
        if ('fps' in info) {
            this.updateFPS(info.fps);
        }
        if ('weather' in info) {
            this.updateWeather(info.weather);
        }
        if ('time' in info) {
            this.updateTime(info.time);
        }
    }

    public getContainer(): HTMLElement {
        return this.container;
    }

    public dispose(): void {
        if (this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}