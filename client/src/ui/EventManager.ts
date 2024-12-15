import EventEmitter from 'eventemitter3';

export interface EventManagerConfig {
    eventEmitter?: EventEmitter;
}

export class EventManager {
    private eventEmitter: EventEmitter;

    constructor(config?: EventManagerConfig) {
        this.eventEmitter = config?.eventEmitter || new EventEmitter();
    }

    public on(event: string, listener: (...args: any[]) => void): void {
        this.eventEmitter.on(event, listener);
    }

    public off(event: string, listener: (...args: any[]) => void): void {
        this.eventEmitter.off(event, listener);
    }

    public emit(event: string, ...args: any[]): void {
        this.eventEmitter.emit(event, ...args);
    }

    public removeAllListeners(): void {
        this.eventEmitter.removeAllListeners();
    }

    public getEventEmitter(): EventEmitter {
        return this.eventEmitter;
    }
}
