import * as THREE from 'three';
import { SceneManager } from '../ui/SceneManager';

export interface WeatherData {
    type: string;
    intensity: number;
    temperature: number;
    humidity: number;
    windSpeed: number;
    windDirection: number;
}

export class WeatherVisualizer {
    private particles: THREE.Points | null = null;
    private particleSystem: THREE.BufferGeometry;
    private particleMaterial: THREE.PointsMaterial;
    private readonly PARTICLE_COUNT = 10000;
    private windIndicator: THREE.ArrowHelper | null = null;
    private windSpeed: number = 0;
    private windDirection: number = 0;

    constructor(private sceneManager: SceneManager) {
        this.particleSystem = new THREE.BufferGeometry();
        this.particleMaterial = new THREE.PointsMaterial({
            color: 0xFFFFFF,
            size: 0.5,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            map: this.createParticleTexture()
        });
    }

    private createParticleTexture(): THREE.Texture {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const context = canvas.getContext('2d')!;
        
        // Create circular particle
        const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, 32, 32);
        
        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    public async initialize(): Promise<void> {
        const positions = new Float32Array(this.PARTICLE_COUNT * 3);
        const velocities = new Float32Array(this.PARTICLE_COUNT * 3);
        const sizes = new Float32Array(this.PARTICLE_COUNT);

        for (let i = 0; i < this.PARTICLE_COUNT; i++) {
            positions[i * 3] = Math.random() * 1000 - 500;
            positions[i * 3 + 1] = Math.random() * 500;
            positions[i * 3 + 2] = Math.random() * 1000 - 500;

            velocities[i * 3] = 0;
            velocities[i * 3 + 1] = -1;
            velocities[i * 3 + 2] = 0;
            
            sizes[i] = Math.random() * 0.5 + 0.5;
        }

        this.particleSystem.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.particleSystem.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        this.particleSystem.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        this.particles = new THREE.Points(this.particleSystem, this.particleMaterial);
        this.particles.visible = false;
        this.sceneManager.add(this.particles);

        // Create wind direction indicator
        const dir = new THREE.Vector3(1, 0, 0);
        const origin = new THREE.Vector3(0, 100, 0);
        const length = 50;
        const color = 0x0088ff;
        this.windIndicator = new THREE.ArrowHelper(dir, origin, length, color);
        this.windIndicator.visible = false;
        this.sceneManager.add(this.windIndicator);
    }

    public updateWeather(data: WeatherData): void {
        if (!this.particles || !this.windIndicator) return;

        // Update wind properties
        this.windSpeed = data.windSpeed;
        this.windDirection = data.windDirection;

        // Update particle visibility and appearance
        this.particles.visible = data.type === 'RAIN' || data.type === 'SNOW';
        if (!this.particles.visible) return;

        // Update particle material based on weather type
        if (data.type === 'SNOW') {
            this.particleMaterial.size = 1.0;
            this.particleMaterial.color.setHex(0xFFFFFF);
            this.particleMaterial.opacity = 0.8;
        } else {
            this.particleMaterial.size = 0.5;
            this.particleMaterial.color.setHex(0x88CCFF);
            this.particleMaterial.opacity = 0.6;
        }

        // Apply temperature effect (affects particle size)
        const tempScale = (data.temperature + 20) / 40; // Normalize temp from -20 to +20
        this.particleMaterial.size *= THREE.MathUtils.clamp(tempScale, 0.5, 1.5);

        // Apply humidity effect (affects opacity)
        this.particleMaterial.opacity *= THREE.MathUtils.clamp(data.humidity, 0.3, 1.0);

        const positions = this.particleSystem.attributes.position.array as Float32Array;
        const velocities = this.particleSystem.attributes.velocity.array as Float32Array;
        const sizes = this.particleSystem.attributes.size.array as Float32Array;

        for (let i = 0; i < positions.length; i += 3) {
            // Update particle positions
            const fallSpeed = data.type === 'SNOW' ? 0.5 : 1.0;
            positions[i + 1] -= velocities[i + 1] * data.intensity * fallSpeed;

            // Reset particles that go below ground
            if (positions[i + 1] < 0) {
                positions[i] = Math.random() * 1000 - 500;
                positions[i + 1] = 500;
                positions[i + 2] = Math.random() * 1000 - 500;
                sizes[i/3] = Math.random() * 0.5 + 0.5;
            }

            // Apply wind effect
            const windAngle = this.windDirection * Math.PI / 180;
            positions[i] += Math.sin(windAngle) * this.windSpeed * 0.1;
            positions[i + 2] += Math.cos(windAngle) * this.windSpeed * 0.1;
        }

        // Update wind indicator
        const windDir = new THREE.Vector3(
            Math.sin(this.windDirection * Math.PI / 180),
            0,
            Math.cos(this.windDirection * Math.PI / 180)
        );
        this.windIndicator.visible = true;
        this.windIndicator.setDirection(windDir.normalize());
        this.windIndicator.setLength(50 * this.windSpeed / 10);

        this.particleSystem.attributes.position.needsUpdate = true;
        this.particleSystem.attributes.size.needsUpdate = true;
    }

    public resize(): void {
        // No resize needed for weather particles
    }

    public render(): void {
        // Rendering is handled by SceneManager
    }

    public dispose(): void {
        if (this.particles) {
            this.sceneManager.remove(this.particles);
            this.particleSystem.dispose();
            this.particleMaterial.dispose();
            this.particles = null;
        }
        if (this.windIndicator) {
            this.sceneManager.remove(this.windIndicator);
            this.windIndicator = null;
        }
    }
}
