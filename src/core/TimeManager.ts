import EventEmitter from 'eventemitter3';

export interface TimeState {
    currentTime: number;      // Minutes since start
    dayNightCycle: number;    // 0-1 representing progress through day
    speed: number;           // Current time speed multiplier
    isPaused: boolean;       // Whether time is paused
    dayLength: number;       // Real seconds per in-game day
}

export interface TimeUpdateEvent {
    time: number;           // Current time in minutes
    dayNightCycle: number;  // Progress through day (0-1)
    formattedTime: string;  // Formatted time string (HH:00)
}

export interface TimeControlAck {
    command: 'pause' | 'play' | 'setSpeed' | 'setTime';
    success: boolean;
    currentState: {
        isPaused: boolean;
        speed: number;
        currentTime: string;
    };
}

export class TimeManager extends EventEmitter {
    private state: TimeState;
    private lastUpdate: number;
    private readonly REAL_SECONDS_PER_DAY = 240; // 4 minutes real time = 1 day
    private readonly MINUTES_PER_DAY = 1440;     // 24 hours * 60 minutes

    constructor() {
        super();
        this.state = {
            currentTime: 360, // Start at 6:00 AM
            dayNightCycle: 0.25,
            speed: 1,
            isPaused: false,
            dayLength: this.REAL_SECONDS_PER_DAY
        };
        this.lastUpdate = Date.now();
        
        this.logInitialization();
    }

    private logInitialization(): void {
        console.log('Time Manager initialized:', {
            dayLength: `${this.REAL_SECONDS_PER_DAY} seconds`,
            startTime: this.formatTime(this.state.currentTime)
        });
    }

    private formatTime(minutes: number): string {
        const hours = Math.floor(minutes / 60) % 24;
        return `${hours.toString().padStart(2, '0')}:00`;
    }

    public update(): void {
        if (this.state.isPaused) return;

        const now = Date.now();
        const deltaTime = (now - this.lastUpdate) / 1000; // Convert to seconds
        this.lastUpdate = now;

        // Calculate time progression
        const minutesPerSecond = (this.MINUTES_PER_DAY / this.state.dayLength) * this.state.speed;
        const deltaMinutes = deltaTime * minutesPerSecond;

        this.updateGameTime(deltaMinutes);
        this.emitTimeUpdate();
    }

    private updateGameTime(deltaMinutes: number): void {
        // Update time, rounding to nearest hour
        this.state.currentTime = (this.state.currentTime + deltaMinutes) % this.MINUTES_PER_DAY;
        if (this.state.currentTime < 0) this.state.currentTime += this.MINUTES_PER_DAY;
        this.state.currentTime = Math.round(this.state.currentTime / 60) * 60;

        // Update day/night cycle (0-1)
        this.state.dayNightCycle = this.state.currentTime / this.MINUTES_PER_DAY;
    }

    private emitTimeUpdate(): void {
        const timeUpdate: TimeUpdateEvent = {
            time: this.state.currentTime,
            dayNightCycle: this.state.dayNightCycle,
            formattedTime: this.formatTime(this.state.currentTime)
        };
        this.emit('timeUpdate', timeUpdate);
    }

    public handleTimeControl(command: 'pause' | 'play' | 'setSpeed' | 'setTime', data?: { speed?: number; time?: number }): void {
        let success = true;

        switch (command) {
            case 'pause':
                this.state.isPaused = true;
                console.log('Time paused');
                break;
            case 'play':
                this.state.isPaused = false;
                this.lastUpdate = Date.now(); // Reset last update to prevent time jump
                console.log('Time resumed');
                break;
            case 'setSpeed':
                if (typeof data?.speed === 'number') {
                    this.state.speed = Math.max(0, data.speed);
                    console.log(`Time speed set to ${data.speed}x`);
                } else {
                    success = false;
                }
                break;
            case 'setTime':
                if (typeof data?.time === 'number') {
                    this.state.currentTime = data.time % this.MINUTES_PER_DAY;
                    this.state.dayNightCycle = this.state.currentTime / this.MINUTES_PER_DAY;
                    console.log(`Time set to ${this.formatTime(this.state.currentTime)}`);
                } else {
                    success = false;
                }
                break;
        }

        this.emitTimeControlAck(command, success);
    }

    private emitTimeControlAck(command: TimeControlAck['command'], success: boolean): void {
        const ack: TimeControlAck = {
            command,
            success,
            currentState: {
                isPaused: this.state.isPaused,
                speed: this.state.speed,
                currentTime: this.formatTime(this.state.currentTime)
            }
        };
        this.emit('timeControlAck', ack);
    }

    public getGameTime(): number {
        return this.state.currentTime;
    }

    public getState(): Readonly<TimeState> {
        return { ...this.state };
    }

    public getDeltaTime(): number {
        return (Date.now() - this.lastUpdate) / 1000;
    }
}