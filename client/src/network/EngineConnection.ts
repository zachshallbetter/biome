import { io, Socket } from 'socket.io-client';
import EventEmitter from 'eventemitter3';

export class EngineConnection extends EventEmitter<string | symbol> {
    private socket: Socket | null = null;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private reconnectDelay: number = 1000;

    constructor() {
        super();
    }

    public async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.socket = io('http://localhost:8080', {
                    transports: ['websocket'],
                    reconnection: true,
                    reconnectionAttempts: this.maxReconnectAttempts,
                    reconnectionDelay: this.reconnectDelay
                });

                this.setupSocketListeners(resolve, reject);
            } catch (error) {
                reject(error);
            }
        });
    }

    private setupSocketListeners(resolve: () => void, reject: (error: Error) => void): void {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            console.log('Connected to Biome Engine');
            this.reconnectAttempts = 0;
            resolve();
        });

        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.reconnectAttempts++;
            
            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                reject(new Error('Failed to connect to Biome Engine'));
            }
        });

        this.socket.on('disconnect', (reason) => {
            console.log('Disconnected from Biome Engine:', reason);
        });

        // Engine events
        this.socket.on('terrainUpdate', (data) => {
            console.log('Received terrain update:', {
                size: data.size,
                dataTypes: {
                    heightMap: typeof data.heightMap,
                    biomeMap: typeof data.biomeMap
                },
                arrayLengths: {
                    heightMap: data.heightMap?.length,
                    biomeMap: data.biomeMap?.length
                }
            });
            this.emit('terrainUpdate', data);
        });

        this.socket.on('weatherUpdate', (data) => {
            console.log('Received weather update:', {
                type: data.type,
                intensity: data.intensity,
                temperature: data.temperature,
                humidity: data.humidity,
                wind: {
                    speed: data.windSpeed,
                    direction: data.windDirection
                }
            });
            this.emit('weatherUpdate', data);
        });

        this.socket.on('timeUpdate', (data) => {
            console.log('Received time update:', {
                time: data.time,
                dayNightCycle: data.dayNightCycle,
                phase: this.getDayPhase(data.dayNightCycle)
            });
            this.emit('timeUpdate', data);
        });

        this.socket.on('error', (error) => {
            console.error('Engine error:', error);
            this.emit('error', error);
        });
    }

    private getDayPhase(dayNightCycle: number): string {
        if (dayNightCycle < 0.25) return 'Night';
        if (dayNightCycle < 0.35) return 'Dawn';
        if (dayNightCycle < 0.65) return 'Day';
        if (dayNightCycle < 0.75) return 'Dusk';
        return 'Night';
    }

    public disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    public isConnected(): boolean {
        return this.socket?.connected ?? false;
    }

    public override emit<T extends string | symbol>(event: T, ...args: any[]): boolean {
        if (!this.socket?.connected) {
            console.warn('Cannot emit event: not connected to engine');
            return false;
        }

        this.socket.emit(event as string, ...args);
        return true;
    }
}