import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { FlyControls } from 'three/examples/jsm/controls/FlyControls';
import EventEmitter from 'eventemitter3';

export interface SceneConfig {
    container: HTMLElement;
    width?: number;
    height?: number;
    cameraType?: 'perspective' | 'orthographic';
    controlType?: 'orbit' | 'fly';
    backgroundColor?: number;
    fogColor?: number;
    fogDensity?: number;
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

export interface BiomeData {
    elevation: number;
    moisture: number;
    temperature: number;
    fertility: number;
    roughness: number;
}

export interface CameraMoveEvent {
    position: THREE.Vector3;
    target: THREE.Vector3;
}

export class SceneManager extends EventEmitter {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
    private renderer: THREE.WebGLRenderer;
    private controls: OrbitControls | FlyControls;
    private clock: THREE.Clock;
    private container: HTMLElement;
    private isRunning: boolean = false;
    private controlType: 'orbit' | 'fly';
    private pixelRatio: number;
    private width: number;
    private height: number;
    private resizeObserver: ResizeObserver;

    constructor(config: SceneConfig) {
        super();
        console.log('SceneManager constructor started');
        
        this.container = config.container;
        this.controlType = config.controlType || 'orbit';
        this.clock = new THREE.Clock();

        // Get container dimensions and pixel ratio
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;
        this.pixelRatio = Math.min(window.devicePixelRatio, 2); // Cap at 2x for performance
        console.log('Container dimensions:', { width: this.width, height: this.height, pixelRatio: this.pixelRatio });

        // Initialize scene
        this.scene = new THREE.Scene();
        if (config.backgroundColor) {
            this.scene.background = new THREE.Color(config.backgroundColor);
        }
        if (config.fogColor && config.fogDensity) {
            this.scene.fog = new THREE.FogExp2(config.fogColor, config.fogDensity);
        }

        // Initialize camera with wider view
        const aspect = this.width / this.height;
        if (config.cameraType === 'orthographic') {
            this.camera = new THREE.OrthographicCamera(-100 * aspect, 100 * aspect, 100, -100, 1, 2000);
        } else {
            this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 2000);
        }
        this.camera.position.set(200, 200, 200);
        this.camera.lookAt(0, 0, 0);

        // Initialize renderer with canvas
        let canvas = this.container.querySelector('canvas');
        console.log('Existing canvas:', canvas);

        if (!canvas) {
            console.log('Creating new canvas');
            canvas = document.createElement('canvas');
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.style.display = 'block';
            this.container.appendChild(canvas);
        }

        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true,
            logarithmicDepthBuffer: true,
            powerPreference: "high-performance"
        });

        // Set initial size with pixel ratio
        this.renderer.setSize(this.width, this.height, false);
        this.renderer.setPixelRatio(this.pixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Enable tone mapping and color management
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        console.log('Renderer initialized:', {
            size: {
                width: this.renderer.domElement.width,
                height: this.renderer.domElement.height,
                style: {
                    width: this.renderer.domElement.style.width,
                    height: this.renderer.domElement.style.height
                }
            },
            pixelRatio: this.renderer.getPixelRatio()
        });

        // Initialize controls
        this.controls = this.initializeControls();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup basic lighting
        this.setupLighting();
        
        console.log('SceneManager initialization complete');

        // Set up camera movement handling
        this.on('cameraMove', this.handleCameraMove.bind(this));

        // Initialize resize observer
        this.resizeObserver = new ResizeObserver(this.handleResize.bind(this));
        this.resizeObserver.observe(this.container);
    }

    private setupEventListeners(): void {
        window.addEventListener('keydown', (event) => {
            switch (event.code) {
                case 'Space':
                    this.toggleControlType();
                    break;
                case 'KeyR':
                    this.resetCamera();
                    break;
            }
        });

        // Handle window DPI/zoom changes
        window.addEventListener('devicepixelratiochange', () => {
            this.pixelRatio = Math.min(window.devicePixelRatio, 2);
            this.handleResize();
        });
    }

    public handleResize(): void {
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;
        const aspect = this.width / this.height;

        if (this.camera instanceof THREE.PerspectiveCamera) {
            this.camera.aspect = aspect;
        } else {
            const cam = this.camera as THREE.OrthographicCamera;
            cam.left = -100 * aspect;
            cam.right = 100 * aspect;
            cam.top = 100;
            cam.bottom = -100;
        }

        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.width, this.height, false);
        this.renderer.setPixelRatio(this.pixelRatio);
        
        console.log('Resize handled:', { 
            width: this.width, 
            height: this.height, 
            aspect,
            pixelRatio: this.pixelRatio
        });

        // Emit resize event
        this.emit('resize', {
            width: this.width,
            height: this.height,
            aspect: aspect,
            pixelRatio: this.pixelRatio
        });
    }

    public resize(): void {
        this.handleResize();
    }

    private setupLighting(): void {
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(200, 200, 100);
        directionalLight.castShadow = true;
        
        // Configure shadow properties
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 1000;
        directionalLight.shadow.camera.left = -200;
        directionalLight.shadow.camera.right = 200;
        directionalLight.shadow.camera.top = 200;
        directionalLight.shadow.camera.bottom = -200;
        
        this.scene.add(ambientLight);
        this.scene.add(directionalLight);
    }

    private initializeControls(): OrbitControls | FlyControls {
        if (this.controlType === 'fly') {
            const flyControls = new FlyControls(this.camera, this.renderer.domElement);
            flyControls.movementSpeed = 100;
            flyControls.rollSpeed = Math.PI / 24;
            flyControls.autoForward = false;
            flyControls.dragToLook = true;
            return flyControls;
        } else {
            const orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
            orbitControls.enableDamping = true;
            orbitControls.dampingFactor = 0.05;
            orbitControls.screenSpacePanning = false;
            orbitControls.minDistance = 50;
            orbitControls.maxDistance = 1000;
            orbitControls.maxPolarAngle = Math.PI / 2.1; // Slightly above horizontal
            orbitControls.target.set(0, 0, 0);
            return orbitControls;
        }
    }

    public toggleControlType(): void {
        this.controlType = this.controlType === 'orbit' ? 'fly' : 'orbit';
        const oldControls = this.controls;
        this.controls = this.initializeControls();
        
        if (oldControls instanceof OrbitControls) {
            oldControls.dispose();
        }

        this.emit('controlsChanged', this.controlType);
    }

    public resetCamera(): void {
        this.camera.position.set(200, 200, 200);
        this.camera.lookAt(0, 0, 0);
        
        if (this.controls instanceof OrbitControls) {
            this.controls.reset();
        }
    }

    public render(): void {
        if (!this.isRunning) return;

        // Update controls
        if (this.controls instanceof OrbitControls) {
            this.controls.update();
        } else if (this.controls instanceof FlyControls) {
            this.controls.update(this.clock.getDelta());
        }

        // Render scene
        this.renderer.render(this.scene, this.camera);
    }

    public start(): void {
        if (!this.isRunning) {
            console.log('Starting SceneManager render loop');
            this.isRunning = true;
            this.clock.start();
            this.animate();
        }
    }

    private animate(): void {
        if (!this.isRunning) return;
        requestAnimationFrame(() => this.animate());
        this.render();
        this.emit('update', this.clock.getDelta());
    }

    public add(object: THREE.Object3D): void {
        this.scene.add(object);
    }

    public remove(object: THREE.Object3D): void {
        this.scene.remove(object);
    }

    public getScene(): THREE.Scene {
        return this.scene;
    }

    public getCamera(): THREE.Camera {
        return this.camera;
    }

    public getRenderer(): THREE.WebGLRenderer {
        return this.renderer;
    }

    public getControls(): OrbitControls | FlyControls {
        return this.controls;
    }

    public dispose(): void {
        this.isRunning = false;
        
        // Dispose of controls
        if (this.controls instanceof OrbitControls) {
            this.controls.dispose();
        }

        // Dispose of renderer
        this.renderer.dispose();

        // Clear the scene
        while(this.scene.children.length > 0) { 
            const object = this.scene.children[0];
            if (object instanceof THREE.Mesh) {
                if (object.geometry) {
                    object.geometry.dispose();
                }
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            }
            this.scene.remove(object);
        }

        // Disconnect resize observer
        this.resizeObserver.disconnect();

        // Remove all event listeners
        this.removeAllListeners();
    }

    private handleCameraMove(event: CameraMoveEvent): void {
        if (this.controls instanceof OrbitControls) {
            // Update orbit controls target
            this.controls.target.copy(event.target);
            this.controls.update();
        }
    }
}