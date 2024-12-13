import * as THREE from 'three';
import { SceneManager } from '../scene/SceneManager';

export interface TerrainData {
    heightMap: number[][];
    biomeMap: number[][];
    size: {
        width: number;
        height: number;
    };
}

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

export class TerrainVisualizer {
    private sceneManager: SceneManager;
    private terrain: THREE.Mesh | null = null;
    private weatherParticles: THREE.Points | null = null;
    private lights: {
        ambient: THREE.AmbientLight;
        directional: THREE.DirectionalLight;
        hemispheric: THREE.HemisphereLight;
    };
    private lastTerrainUpdate: number = 0;

    constructor(containerId: string) {
        console.log('TerrainVisualizer constructor started');
        
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container element with id '${containerId}' not found`);
        }

        // Initialize scene manager with better initial camera position
        this.sceneManager = new SceneManager({
            container,
            controlType: 'orbit',
            backgroundColor: 0x87ceeb, // Sky blue
            fogColor: 0xc6e2ff,
            fogDensity: 0.0015
        });

        // Setup enhanced lighting
        this.lights = {
            ambient: new THREE.AmbientLight(0x404040, 0.5),
            directional: new THREE.DirectionalLight(0xffffff, 1),
            hemispheric: new THREE.HemisphereLight(0x87ceeb, 0x444444, 0.6)
        };

        // Configure directional light for better shadows
        this.lights.directional.position.set(200, 200, 100);
        this.lights.directional.castShadow = true;
        this.lights.directional.shadow.mapSize.width = 2048;
        this.lights.directional.shadow.mapSize.height = 2048;
        this.lights.directional.shadow.camera.near = 0.5;
        this.lights.directional.shadow.camera.far = 1000;
        this.lights.directional.shadow.camera.left = -200;
        this.lights.directional.shadow.camera.right = 200;
        this.lights.directional.shadow.camera.top = 200;
        this.lights.directional.shadow.camera.bottom = -200;

        // Add lights to scene
        this.sceneManager.add(this.lights.ambient);
        this.sceneManager.add(this.lights.directional);
        this.sceneManager.add(this.lights.hemispheric);

        // Add grid helper with finer grid
        const gridHelper = new THREE.GridHelper(1000, 100, 0x000000, 0x444444);
        gridHelper.position.y = -0.1; // Slightly below terrain to avoid z-fighting
        this.sceneManager.add(gridHelper);

        // Add axes helper
        const axesHelper = new THREE.AxesHelper(50);
        this.sceneManager.add(axesHelper);

        // Position camera for better initial view
        const camera = this.sceneManager.getCamera();
        camera.position.set(200, 200, 200);
        camera.lookAt(0, 0, 0);

        console.log('TerrainVisualizer constructor completed');
    }

    public async initialize(): Promise<void> {
        console.log('TerrainVisualizer initialization started');
        
        // Enable shadow mapping in renderer
        const renderer = this.sceneManager.getRenderer();
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Initialize weather effects
        await this.initializeWeatherEffects();

        // Start the scene manager
        this.sceneManager.start();
        
        console.log('TerrainVisualizer initialization completed');
    }

    private async initializeWeatherEffects(): Promise<void> {
        // Create rain/snow particle system
        const particleCount = 10000;
        const particleGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = Math.random() * 1000 - 500;
            positions[i * 3 + 1] = Math.random() * 500;
            positions[i * 3 + 2] = Math.random() * 1000 - 500;

            velocities[i * 3] = 0;
            velocities[i * 3 + 1] = -1;
            velocities[i * 3 + 2] = 0;
        }

        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

        const particleMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.5,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.weatherParticles = new THREE.Points(particleGeometry, particleMaterial);
        this.weatherParticles.visible = false;
        this.sceneManager.add(this.weatherParticles);
    }

    private getBiomeColor(biomeType: number, height: number): THREE.Color {
        const baseColors: { [key: number]: THREE.Color } = {
            0: new THREE.Color(0x1E4D6B), // Deep Ocean
            1: new THREE.Color(0x2A8AC0), // Ocean
            2: new THREE.Color(0xD2B98B), // Beach
            3: new THREE.Color(0x567D46), // Plains
            4: new THREE.Color(0xE1C78F), // Desert
            5: new THREE.Color(0x2D4A22), // Forest
            6: new THREE.Color(0x1A2F15), // Dense Forest
            7: new THREE.Color(0x8B8B8B), // Mountains
            8: new THREE.Color(0xFFFFFF)  // Snow
        };

        const color = baseColors[biomeType] || new THREE.Color(0xFF00FF);

        // Adjust color based on height
        if (height > 0.8) {
            // Snow-capped peaks
            color.lerp(new THREE.Color(0xFFFFFF), 0.3);
        } else if (height < 0.2) {
            // Darker in valleys
            color.multiplyScalar(0.7);
        }

        return color;
    }

    public updateTerrain(data: TerrainData): void {
        const now = performance.now();
        console.log(`Terrain update received at ${now}ms (${now - this.lastTerrainUpdate}ms since last update)`);
        this.lastTerrainUpdate = now;

        console.log('Terrain data:', {
            size: data.size,
            heightRange: {
                min: Math.min(...data.heightMap.flat()),
                max: Math.max(...data.heightMap.flat())
            },
            biomeTypes: [...new Set(data.biomeMap.flat())]
        });

        if (this.terrain) {
            console.log('Removing existing terrain');
            this.sceneManager.remove(this.terrain);
        }

        // Create geometry with higher resolution
        const geometry = new THREE.PlaneGeometry(
            data.size.width,
            data.size.height,
            data.size.width - 1,
            data.size.height - 1
        );

        // Update vertices based on height map with enhanced scaling
        const positions = geometry.attributes.position.array as Float32Array;
        const heightScale = 50; // Increased height scale for more dramatic terrain
        
        console.log('Updating terrain vertices...');
        for (let i = 0; i < positions.length; i += 3) {
            const x = Math.floor((i / 3) % data.size.width);
            const y = Math.floor((i / 3) / data.size.width);
            positions[i + 2] = data.heightMap[y][x] * heightScale;
        }

        geometry.computeVertexNormals();

        // Create enhanced material with better visual properties
        const material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            flatShading: false,
            roughness: 0.8,
            metalness: 0.2,
            side: THREE.DoubleSide
        });

        // Set vertex colors based on biome map with enhanced colors
        const colors = new Float32Array(positions.length);
        console.log('Setting biome colors...');
        for (let i = 0; i < positions.length; i += 3) {
            const x = Math.floor((i / 3) % data.size.width);
            const y = Math.floor((i / 3) / data.size.width);
            const height = positions[i + 2] / heightScale;
            const biomeColor = this.getBiomeColor(data.biomeMap[y][x], height);
            colors[i] = biomeColor.r;
            colors[i + 1] = biomeColor.g;
            colors[i + 2] = biomeColor.b;
        }

        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        // Create mesh with enhanced features
        this.terrain = new THREE.Mesh(geometry, material);
        this.terrain.rotation.x = -Math.PI / 2;
        this.terrain.castShadow = true;
        this.terrain.receiveShadow = true;

        // Center the terrain
        this.terrain.position.set(-data.size.width / 2, 0, -data.size.height / 2);

        console.log('Adding terrain to scene:', {
            position: this.terrain.position,
            rotation: this.terrain.rotation,
            scale: this.terrain.scale,
            geometry: {
                vertices: positions.length / 3,
                colors: colors.length / 3
            }
        });

        this.sceneManager.add(this.terrain);
    }

    public updateWeatherEffects(data: WeatherData): void {
        // Update lighting based on weather
        const intensity = 1 - (data.intensity * 0.5);
        this.lights.directional.intensity = intensity;
        this.lights.hemispheric.intensity = 0.6 * intensity;

        // Update fog based on weather
        const scene = this.sceneManager.getScene();
        if (scene.fog instanceof THREE.FogExp2) {
            scene.fog.density = 0.0015 + (data.intensity * 0.002);
        }

        // Update particles
        if (this.weatherParticles) {
            this.weatherParticles.visible = data.type === 'RAIN' || data.type === 'SNOW';
            
            if (this.weatherParticles.visible) {
                const positions = this.weatherParticles.geometry.attributes.position.array as Float32Array;
                const velocities = this.weatherParticles.geometry.attributes.velocity.array as Float32Array;
                
                for (let i = 0; i < positions.length; i += 3) {
                    // Update particle positions
                    positions[i + 1] -= velocities[i + 1] * data.intensity * 2;
                    
                    // Reset particles that go below ground
                    if (positions[i + 1] < 0) {
                        positions[i] = Math.random() * 1000 - 500;
                        positions[i + 1] = 500;
                        positions[i + 2] = Math.random() * 1000 - 500;
                    }
                    
                    // Apply wind effect
                    positions[i] += Math.sin(data.windDirection) * data.windSpeed * 0.1;
                    positions[i + 2] += Math.cos(data.windDirection) * data.windSpeed * 0.1;
                }
                
                this.weatherParticles.geometry.attributes.position.needsUpdate = true;
            }
        }
    }

    public updateLighting(data: TimeData): void {
        // Update lighting based on time of day
        const daylight = Math.sin(data.dayNightCycle * Math.PI);
        this.lights.ambient.intensity = 0.3 + (daylight * 0.2);
        this.lights.directional.intensity = 0.5 + (daylight * 0.5);
        this.lights.hemispheric.intensity = 0.4 + (daylight * 0.2);

        // Update directional light position to simulate sun movement
        const angle = data.dayNightCycle * Math.PI * 2;
        const radius = 200;
        this.lights.directional.position.set(
            Math.cos(angle) * radius,
            Math.sin(angle) * radius,
            50
        );

        // Update scene background color based on time of day
        const scene = this.sceneManager.getScene();
        const skyColor = new THREE.Color();
        if (data.dayNightCycle < 0.25 || data.dayNightCycle > 0.75) {
            // Night
            skyColor.setHSL(0.67, 0.8, 0.2);
        } else if (data.dayNightCycle < 0.3 || data.dayNightCycle > 0.7) {
            // Dawn/Dusk
            skyColor.setHSL(0.1, 0.8, 0.5);
        } else {
            // Day
            skyColor.setHSL(0.6, 0.8, 0.7);
        }
        scene.background = skyColor;

        // Update fog color to match sky
        if (scene.fog instanceof THREE.FogExp2) {
            scene.fog.color = skyColor;
        }
    }
    public resize(): void {
        this.sceneManager.handleResize();
    }

    public render(): void {
        this.sceneManager.render();
    }

    public dispose(): void {
        if (this.terrain) {
            if (this.terrain.geometry) {
                this.terrain.geometry.dispose();
            }
            if (this.terrain.material) {
                if (Array.isArray(this.terrain.material)) {
                    this.terrain.material.forEach(material => material.dispose());
                } else {
                    this.terrain.material.dispose();
                }
            }
        }

        if (this.weatherParticles) {
            if (this.weatherParticles.geometry) {
                this.weatherParticles.geometry.dispose();
            }
            if (this.weatherParticles.material) {
                if (Array.isArray(this.weatherParticles.material)) {
                    this.weatherParticles.material.forEach(material => material.dispose());
                } else {
                    this.weatherParticles.material.dispose();
                }
            }
        }

        this.sceneManager.dispose();
    }

    public getSceneManager(): SceneManager {
        return this.sceneManager;
    }
} 