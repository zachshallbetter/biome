import * as THREE from 'three';
import { SceneManager } from '../ui/SceneManager';
import { createNoise2D } from 'simplex-noise';

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
}

export interface TimeData {
    time: number;
    dayNightCycle: number;
}

export class TerrainVisualizer {
    private terrain: THREE.Mesh | null = null;
    private lights: {
        ambient: THREE.AmbientLight;
        directional: THREE.DirectionalLight;
        hemispheric: THREE.HemisphereLight;
    };
    private lastTerrainUpdate: number = 0;
    private noise2D: (x: number, y: number) => number;
    private readonly TERRAIN_SIZE = 1000;
    private readonly TERRAIN_SEGMENTS = 200;
    private readonly MAX_HEIGHT = 100;

    constructor(private sceneManager: SceneManager) {
        console.log('TerrainVisualizer constructor started');

        // Initialize noise generator
        this.noise2D = createNoise2D();

        // Setup enhanced lighting
        this.lights = {
            ambient: new THREE.AmbientLight(0x404040, 0.5),
            directional: new THREE.DirectionalLight(0xffffff, 1),
            hemispheric: new THREE.HemisphereLight(0x87ceeb, 0x444444, 0.6)
        };

        // Configure directional light for better shadows
        this.lights.directional.position.set(100, 100, 50);
        this.lights.directional.castShadow = true;
        this.lights.directional.shadow.mapSize.width = 2048;
        this.lights.directional.shadow.mapSize.height = 2048;
        this.lights.directional.shadow.camera.near = 0.5;
        this.lights.directional.shadow.camera.far = 500;
        this.lights.directional.shadow.camera.left = -200;
        this.lights.directional.shadow.camera.right = 200;
        this.lights.directional.shadow.camera.top = 200;
        this.lights.directional.shadow.camera.bottom = -200;

        // Add lights to scene
        this.sceneManager.add(this.lights.ambient);
        this.sceneManager.add(this.lights.directional);
        this.sceneManager.add(this.lights.hemispheric);

        this.generateTerrain();
        console.log('TerrainVisualizer constructor completed');
    }

    private generateTerrain(): void {
        // Create geometry
        const geometry = new THREE.PlaneGeometry(
            this.TERRAIN_SIZE,
            this.TERRAIN_SIZE,
            this.TERRAIN_SEGMENTS,
            this.TERRAIN_SEGMENTS
        );

        // Generate height data
        const vertices = geometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const z = vertices[i + 2];
            
            // Multiple layers of noise for more interesting terrain
            const height = 
                this.noise2D(x * 0.002, z * 0.002) * this.MAX_HEIGHT * 1.00 +
                this.noise2D(x * 0.01, z * 0.01) * this.MAX_HEIGHT * 0.50 +
                this.noise2D(x * 0.05, z * 0.05) * this.MAX_HEIGHT * 0.25;

            vertices[i + 1] = height;
        }

        // Update normals for proper lighting
        geometry.computeVertexNormals();

        // Create material with better visual quality
        const material = new THREE.MeshPhongMaterial({
            color: 0x3b7d4f,
            specular: 0x111111,
            shininess: 10,
            flatShading: true,
            side: THREE.DoubleSide
        });

        // Create mesh
        this.terrain = new THREE.Mesh(geometry, material);
        this.terrain.rotation.x = -Math.PI / 2;
        this.terrain.receiveShadow = true;
        this.terrain.castShadow = true;

        // Add to scene
        this.sceneManager.add(this.terrain);
    }

    public async initialize(): Promise<void> {
        console.log('TerrainVisualizer initialization started');
        // Additional initialization if needed
        console.log('TerrainVisualizer initialization completed');
    }

    public updateTerrain(data: TerrainData): void {
        if (!this.terrain) return;
        
        // Update terrain based on data
        const vertices = (this.terrain.geometry as THREE.BufferGeometry).attributes.position.array;
        const width = data.size.width;
        const height = data.size.height;

        for (let i = 0; i < vertices.length; i += 3) {
            const x = Math.floor((i / 3) % width);
            const z = Math.floor((i / 3) / width);
            if (data.heightMap[z] && data.heightMap[z][x] !== undefined) {
                vertices[i + 1] = data.heightMap[z][x] * this.MAX_HEIGHT;
            }
        }

        (this.terrain.geometry as THREE.BufferGeometry).attributes.position.needsUpdate = true;
        (this.terrain.geometry as THREE.BufferGeometry).computeVertexNormals();
    }

    public resize(): void {
        // Handle resize if needed
    }

    public render(): void {
        // Additional per-frame updates if needed
    }

    public dispose(): void {
        if (this.terrain) {
            this.sceneManager.remove(this.terrain);
            (this.terrain.geometry as THREE.BufferGeometry).dispose();
            (this.terrain.material as THREE.Material).dispose();
            this.terrain = null;
        }

        Object.values(this.lights).forEach(light => {
            this.sceneManager.remove(light);
        });
    }
} 