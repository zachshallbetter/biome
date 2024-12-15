import * as THREE from 'three';
import { SceneManager } from '../ui/SceneManager';

export interface SkyData {
    time: number;
    cloudCover: number;
    sunPosition: THREE.Vector3;
}

export class SkyVisualizer {
    private sky: THREE.Mesh | null = null;
    private clouds: THREE.Mesh | null = null;
    private sun: THREE.DirectionalLight | null = null;
    private sunSprite: THREE.Sprite | null = null;
    private ambient: THREE.AmbientLight | null = null;

    constructor(private sceneManager: SceneManager) {}

    private createSunSprite(): THREE.Sprite {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext('2d')!;
        
        const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255,255,200,1)');
        gradient.addColorStop(0.5, 'rgba(255,255,0,0.5)');
        gradient.addColorStop(1, 'rgba(255,255,0,0)');
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, 64, 64);
        
        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        
        const material = new THREE.SpriteMaterial({
            map: texture,
            color: 0xFFFFFF,
            transparent: true,
            blending: THREE.AdditiveBlending
        });
        
        return new THREE.Sprite(material);
    }

    private createCloudTexture(): THREE.Texture {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const context = canvas.getContext('2d')!;
        
        // Create cloud-like noise pattern
        context.fillStyle = 'white';
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const radius = Math.random() * 50 + 20;
            
            context.beginPath();
            context.arc(x, y, radius, 0, Math.PI * 2);
            context.fill();
        }
        
        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    public async initialize(): Promise<void> {
        // Create sky dome
        const skyGeometry = new THREE.SphereGeometry(1000, 32, 32);
        const skyMaterial = new THREE.MeshBasicMaterial({
            color: 0x87CEEB,
            side: THREE.BackSide,
            fog: false
        });
        this.sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.sceneManager.add(this.sky);

        // Create cloud layer
        const cloudGeometry = new THREE.PlaneGeometry(2000, 2000, 1, 1);
        const cloudMaterial = new THREE.MeshBasicMaterial({
            map: this.createCloudTexture(),
            transparent: true,
            opacity: 0.5,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        this.clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
        this.clouds.rotation.x = -Math.PI / 2;
        this.clouds.position.y = 200;
        this.sceneManager.add(this.clouds);

        // Create sun light
        this.sun = new THREE.DirectionalLight(0xFFFFFF, 1);
        this.sun.position.set(0, 100, 0);
        this.sun.castShadow = true;
        this.sun.shadow.mapSize.width = 2048;
        this.sun.shadow.mapSize.height = 2048;
        this.sun.shadow.camera.near = 0.5;
        this.sun.shadow.camera.far = 500;
        this.sun.shadow.camera.left = -100;
        this.sun.shadow.camera.right = 100;
        this.sun.shadow.camera.top = 100;
        this.sun.shadow.camera.bottom = -100;
        this.sceneManager.add(this.sun);

        // Create sun sprite
        this.sunSprite = this.createSunSprite();
        this.sunSprite.scale.set(50, 50, 1);
        this.sceneManager.add(this.sunSprite);

        // Create ambient light
        this.ambient = new THREE.AmbientLight(0x404040);
        this.sceneManager.add(this.ambient);
    }

    public updateSky(data: SkyData): void {
        if (!this.sky || !this.sun || !this.ambient || !this.clouds || !this.sunSprite) return;

        // Update sun position
        const sunRadius = 800; // Distance from center
        const sunAngle = (data.time - 6) * Math.PI / 12; // Convert time to angle (0 at 6AM)
        const sunHeight = Math.sin(sunAngle);
        const sunDistance = Math.cos(sunAngle);
        
        this.sun.position.set(
            sunDistance * sunRadius,
            sunHeight * sunRadius,
            0
        );
        this.sunSprite.position.copy(this.sun.position);

        // Calculate sky color based on time of day
        const hour = data.time;
        let skyColor = new THREE.Color();
        let sunIntensity = 0;
        let ambientIntensity = 0;
        
        if (hour < 6 || hour > 18) {
            // Night
            skyColor.setHex(0x1a1a2a);
            sunIntensity = 0.1;
            ambientIntensity = 0.3;
        } else if (hour < 8 || hour > 16) {
            // Dawn/Dusk
            const t = hour < 8 ? (hour - 6) / 2 : (18 - hour) / 2;
            skyColor.setHex(0xff7f50);
            skyColor.lerp(new THREE.Color(0x1a1a2a), 1 - t);
            sunIntensity = 0.5;
            ambientIntensity = 0.5;
        } else {
            // Day
            skyColor.setHex(0x87ceeb);
            sunIntensity = 1;
            ambientIntensity = 0.7;
        }

        // Apply cloud cover
        const cloudFactor = 1 - data.cloudCover;
        skyColor.multiplyScalar(cloudFactor);
        sunIntensity *= cloudFactor;
        
        // Update materials and lights
        (this.sky.material as THREE.MeshBasicMaterial).color = skyColor;
        this.sun.intensity = sunIntensity;
        this.ambient.intensity = ambientIntensity;
        
        // Update cloud opacity and color
        (this.clouds.material as THREE.MeshBasicMaterial).opacity = data.cloudCover * 0.7;
        this.sunSprite.material.opacity = cloudFactor;
    }

    public resize(): void {
        // No resize needed for sky
    }

    public render(): void {
        if (this.clouds) {
            // Slowly rotate clouds for movement effect
            this.clouds.rotation.z += 0.0001;
        }
    }

    public dispose(): void {
        if (this.sky) {
            this.sceneManager.remove(this.sky);
            (this.sky.geometry as THREE.BufferGeometry).dispose();
            (this.sky.material as THREE.Material).dispose();
            this.sky = null;
        }
        if (this.clouds) {
            this.sceneManager.remove(this.clouds);
            (this.clouds.geometry as THREE.BufferGeometry).dispose();
            (this.clouds.material as THREE.Material).dispose();
            this.clouds = null;
        }
        if (this.sun) {
            this.sceneManager.remove(this.sun);
            this.sun = null;
        }
        if (this.sunSprite) {
            this.sceneManager.remove(this.sunSprite);
            (this.sunSprite.material as THREE.SpriteMaterial).dispose();
            this.sunSprite = null;
        }
        if (this.ambient) {
            this.sceneManager.remove(this.ambient);
            this.ambient = null;
        }
    }
}
