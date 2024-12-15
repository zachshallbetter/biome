import { SceneManager } from './SceneManager';
import EventEmitter from 'eventemitter3';

export interface ServerTimeData {
    gameTime: string;      // Format: "HH:MM"
    dayPhase: string;      // e.g., "Night", "Day", "Dawn", "Dusk"
    lightLevel: string;    // Format: "XX.X%"
}

export interface TimeData {
    time: number;          // Minutes since start of day
    dayNightCycle: number; // Progress through day (0-1)
}

export interface TimeControlState {
    isPlaying: boolean;
    currentTime: number;
    dayNightCycle: number;
    speed: number;
}

export interface TimeControlEvent {
    command: 'play' | 'pause' | 'setSpeed';
    speed?: number;
}

export interface TimeControlAck {
    command: 'play' | 'pause' | 'setSpeed';
    success: boolean;
    currentState: {
        isPaused: boolean;
        speed: number;
        currentTime: string;
    };
}

export class TimeManager extends EventEmitter {
    private readonly UPDATE_INTERVAL = 16; // ~60fps
    private container: HTMLElement;
    private timeContainer: HTMLElement;
    private timeState: TimeControlState;
    private timeDisplay: HTMLElement | null = null;
    private progressRing: SVGCircleElement | null = null;
    private playPauseIcon: HTMLElement | null = null;
    private lastUpdate: number = 0;
    private boundHandleTimeClick: (e: MouseEvent) => void;

    constructor(private sceneManager: SceneManager) {
        super();
        
        this.timeState = {
            isPlaying: true,
            currentTime: 0,
            dayNightCycle: 0,
            speed: 1
        };

        this.boundHandleTimeClick = this.handleTimeClick.bind(this);

        this.container = document.createElement('div');
        this.container.id = 'time-controls';
        this.container.className = 'time-controls';

        this.timeContainer = document.createElement('div');
        this.timeContainer.className = 'time-disc';
        this.container.appendChild(this.timeContainer);

        this.createTimeDisplay();
    }

    public start(): void {
        document.body.appendChild(this.container);
    }

    private createTimeDisplay(): void {
        this.timeDisplay = document.createElement('div');
        this.timeDisplay.className = 'time-display';
        this.timeDisplay.innerHTML = `
            <div class="time-hours">00:00</div>
            <div class="time-day">Day 1</div>
        `;
        
        const progressRing = document.createElement('svg');
        progressRing.className = 'progress-ring';
        progressRing.setAttribute('viewBox', '0 0 100 100');
        progressRing.innerHTML = `
            <circle class="progress-ring-circle-bg" cx="50" cy="50" r="45"/>
            <circle class="progress-ring-circle" cx="50" cy="50" r="45"/>
        `;
        this.progressRing = progressRing.querySelector('.progress-ring-circle');
        
        this.playPauseIcon = document.createElement('div');
        this.playPauseIcon.className = 'play-pause-icon';
        this.playPauseIcon.innerHTML = '⏸️';
        
        this.timeContainer.appendChild(progressRing);
        this.timeContainer.appendChild(this.timeDisplay);
        this.timeContainer.appendChild(this.playPauseIcon);
        
        this.timeContainer.addEventListener('click', this.boundHandleTimeClick);

        if (this.progressRing) {
            const circumference = 2 * Math.PI * 45;
            this.progressRing.style.strokeDasharray = `${circumference} ${circumference}`;
            this.progressRing.style.strokeDashoffset = circumference.toString();
        }
    }

    private handleTimeClick(e: MouseEvent): void {
        if (e.target && !(e.target as HTMLElement).closest('.panel-header')) {
            this.togglePlayPause();
        }
    }

    private parseServerTime(serverTime: string): { hours: number; minutes: number } {
        const [hours, minutes] = serverTime.split(':').map(Number);
        return { hours, minutes };
    }

    private calculateDayNightCycle(dayPhase: string, lightLevel: string): number {
        const light = parseFloat(lightLevel) / 100;
        switch (dayPhase.toLowerCase()) {
            case 'night':
                return light;
            case 'dawn':
                return 0.25 + (light * 0.25);
            case 'day':
                return 0.5 + (light * 0.25);
            case 'dusk':
                return 0.75 + (light * 0.25);
            default:
                return light;
        }
    }

    private updatePlayPauseIcon(): void {
        if (this.playPauseIcon) {
            this.playPauseIcon.innerHTML = this.timeState.isPlaying ? '⏸️' : '▶️';
        }
    }

    private togglePlayPause(): void {
        this.timeState.isPlaying = !this.timeState.isPlaying;
        this.updatePlayPauseIcon();
        
        const event: TimeControlEvent = {
            command: this.timeState.isPlaying ? 'play' : 'pause'
        };
        
        this.sceneManager.emit('timeControl', event);
        this.emit('timeControlSent', event);
    }

    public handleTimeControlAck(data: TimeControlAck): void {
        if (data.success) {
            this.timeState.isPlaying = !data.currentState.isPaused;
            this.timeState.speed = data.currentState.speed;
            this.updatePlayPauseIcon();
            this.emit('timeStateChanged', this.timeState);
        }
    }

    public handleServerTimeUpdate(data: ServerTimeData): void {
        const { hours, minutes } = this.parseServerTime(data.gameTime);
        const totalMinutes = (hours * 60) + minutes;
        const dayNightCycle = this.calculateDayNightCycle(data.dayPhase, data.lightLevel);

        this.updateTime({
            time: totalMinutes,
            dayNightCycle
        });
    }

    private updateTime(data: TimeData): void {
        const now = performance.now();
        if (now - this.lastUpdate < this.UPDATE_INTERVAL) return;
        this.lastUpdate = now;

        const totalHours = Math.floor(data.time / 60);
        const days = Math.floor(totalHours / 24);
        const hours = totalHours % 24;
        
        if (this.timeDisplay) {
            this.timeDisplay.innerHTML = `
                <div class="time-hours">${hours.toString().padStart(2, '0')}:00</div>
                <div class="time-day">Day ${days + 1}</div>
            `;
        }

        if (this.progressRing) {
            const circumference = 2 * Math.PI * 45;
            const progress = data.dayNightCycle;
            const offset = circumference - (progress * circumference);
            this.progressRing.style.strokeDashoffset = offset.toString();
        }

        this.timeState.currentTime = data.time;
        this.timeState.dayNightCycle = data.dayNightCycle;
        this.emit('timeUpdated', this.timeState);
    }

    public getContainer(): HTMLElement {
        return this.container;
    }

    public getTimeState(): Readonly<TimeControlState> {
        return { ...this.timeState };
    }

    public dispose(): void {
        this.timeContainer.removeEventListener('click', this.boundHandleTimeClick);
        this.removeAllListeners();
        
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}