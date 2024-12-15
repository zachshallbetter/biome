import EventEmitter from 'eventemitter3';
import { io, Socket } from 'socket.io-client';

interface TimeControlEvent {
    command: 'play' | 'pause' | 'setSpeed';
    speed?: number;
}

interface TimeUpdateData {
    time: number;
    dayNightCycle: number;
}

interface WeatherUpdateData {
    type: string;
    intensity: number;
    temperature: number;
    humidity: number;
    windSpeed: number;
    windDirection: number;
}

interface TerrainUpdateData {
    heightMap: number[][];
    biomeMap: number[][];
    size: {
        width: number;
        height: number;
    };
}

interface BiomeUpdateData {
    elevation: number;
    moisture: number;
    temperature: number;
    fertility: number;
    roughness: number;
}

export class EngineConnection extends EventEmitter {
    private socket: Socket | null = null;
    private isConnected: boolean = false;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private readonly serverUrl: string = 'http://localhost:8080';

    constructor() {
        super();
        console.log('EngineConnection constructor started');
    }

    public async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                console.log('Connecting to engine...');
                this.socket = io(this.serverUrl, {
                    reconnection: true,
                    reconnectionAttempts: this.maxReconnectAttempts,
                    reconnectionDelay: 1000,
                    transports: ['websocket']
                });

                this.socket.on('connect', () => {
                    console.log('Connected to engine');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    resolve();
                });

                this.socket.on('disconnect', () => {
                    console.log('Disconnected from engine');
                    this.isConnected = false;
                    this.emit('connectionLost');
                });

                this.socket.on('error', (error: Error) => {
                    console.error('Socket error:', error);
                    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                        reject(new Error('Failed to connect to engine after maximum attempts'));
                    }
                });

                this.setupEventHandlers();

            } catch (error) {
                console.error('Failed to connect to engine:', error);
                reject(error);
            }
        });
    }

    private setupEventHandlers(): void {
        if (!this.socket) return;

        // Handle terrain updates
        this.socket.on('terrainUpdate', (data: TerrainUpdateData) => {
            this.emit('terrainUpdate', data);
        });

        // Handle weather updates
        this.socket.on('weatherUpdate', (data: WeatherUpdateData) => {
            this.emit('weatherUpdate', data);
        });

        // Handle time updates
        this.socket.on('timeUpdate', (data: TimeUpdateData) => {
            this.emit('timeUpdate', data);
        });

        // Handle time control acknowledgments
        this.socket.on('timeControlAck', (data: TimeControlEvent) => {
            this.emit('timeControlAck', data);
        });

        // Handle biome updates
        this.socket.on('biomeUpdate', (data: BiomeUpdateData) => {
            this.emit('biomeUpdate', data);
        });

        // Handle biome parameter changes
        this.socket.on('biomeParameterChange', (data: { parameter: string; value: number }) => {
            this.emit('biomeParameterChange', data);
        });
    }

    public sendTimeControl(command: TimeControlEvent): boolean {
        return this.sendToServer('timeControl', command);
    }

    public sendBiomeUpdate(data: BiomeUpdateData): boolean {
        return this.sendToServer('biomeUpdate', data);
    }

    public sendBiomeParameterChange(parameter: string, value: number): boolean {
        return this.sendToServer('biomeParameterChange', { parameter, value });
    }

    private sendToServer(event: string, data: unknown): boolean {
        if (this.socket && this.isConnected) {
            console.log(`Emitting ${event}:`, data);
            this.socket.emit(event, data);
            return true;
        }
        console.warn(`Failed to emit ${event}: Not connected`);
        return false;
    }

    public disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.isConnected = false;
    }

    public isSocketConnected(): boolean {
        return this.isConnected;
    }
}