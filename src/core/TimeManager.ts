import EventEmitter from 'eventemitter3';

export class TimeManager extends EventEmitter {
    private startTime: number = 0;
    private lastTime: number = 0;
    private deltaTime: number = 0;
    private timeScale: number = 1.0;
    private isRunning: boolean = false;
    private gameTime: number = 0;

    constructor() {
        super();
    }

    public start(): void {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.startTime = performance.now();
        this.lastTime = this.startTime;
        this.emit('started');
    }

    public stop(): void {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        this.emit('stopped');
    }

    public update(): void {
        if (!this.isRunning) return;

        const currentTime = performance.now();
        this.deltaTime = (currentTime - this.lastTime) * 0.001; // Convert to seconds
        this.lastTime = currentTime;

        // Update game time with time scale
        this.gameTime += this.deltaTime * this.timeScale;
        
        this.emit('update', this.deltaTime);
    }

    public getDeltaTime(): number {
        return this.deltaTime;
    }

    public getGameTime(): number {
        return this.gameTime;
    }

    public setTimeScale(scale: number): void {
        if (scale < 0) {
            throw new Error('Time scale cannot be negative');
        }
        this.timeScale = scale;
        this.emit('timeScaleChanged', scale);
    }

    public getTimeScale(): number {
        return this.timeScale;
    }

    public getElapsedTime(): number {
        return (performance.now() - this.startTime) * 0.001;
    }

    public reset(): void {
        this.startTime = performance.now();
        this.lastTime = this.startTime;
        this.deltaTime = 0;
        this.gameTime = 0;
        this.emit('reset');
    }

    public isPaused(): boolean {
        return !this.isRunning;
    }
} 