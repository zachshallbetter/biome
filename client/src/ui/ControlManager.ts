import { SceneManager } from './SceneManager';
import { TimeManager, TimeControlState, ServerTimeData, TimeControlAck, TimeControlEvent } from './TimeManager';
import { Controls, BiomeData } from './components/Controls';
import { Panel } from './components/Panel';
import { PanelManager, PanelConfig } from './PanelManager';
import { defaultPanelConfigs } from '../config/ui.config';
import { Console } from './components/Console';

export class ControlManager {
    private sceneManager: SceneManager;
    private panelManager: PanelManager;
    private timeManager: TimeManager;
    private controls: Controls;
    private debugPanel: Console;

    constructor(sceneManager: SceneManager) {
        console.log('Initializing Control Manager...');
        this.sceneManager = sceneManager;
        
        // start managers and components
        const container = document.getElementById('app') || document.body;
        this.panelManager = new PanelManager(this.sceneManager, container);
        this.timeManager = new TimeManager(this.sceneManager);
        this.controls = new Controls(this.sceneManager);
        this.debugPanel = new Console(this.sceneManager);
    }

    public async start(): Promise<void> {
        console.log('Setting up Control Manager...');
        
        // Create and configure panels
        this.setupPanels();

        // Setup event listeners
        this.setupEventListeners();

        // Start components
        await this.timeManager.start();
        this.controls.getContainer().style.display = 'block';
        this.debugPanel.getContainer().style.display = 'block';

        console.log('Control Manager setup complete');
    }

    private setupPanels(): void {
        const configs = defaultPanelConfigs;
        
        // Time control panel
        const timePanel = {
            ...configs.find(c => c.type === 'time')!,
            content: this.timeManager.getContainer()
        };

        // Controls panel
        const controlsPanel = {
            ...configs.find(c => c.type === 'controls')!,
            content: this.controls.getContainer()
        };

        // Debug panel
        const debugPanel = {
            ...configs.find(c => c.type === 'debug')!,
            content: this.debugPanel.getContainer()
        };

        this.panelManager.createPanel(timePanel);
        this.panelManager.createPanel(controlsPanel);
        this.panelManager.createPanel(debugPanel);
    }

    private setupEventListeners(): void {
        // Time control events
        this.timeManager.on('timeUpdated', (state: TimeControlState) => {
            this.sceneManager.emit('timeUpdate', state);
        });

        this.timeManager.on('timeControlSent', (event: TimeControlEvent) => {
            this.sceneManager.emit('timeControl', event);
        });

        // Biome control events
        this.controls.on('biomeUpdate', (data: BiomeData) => {
            this.sceneManager.emit('biomeUpdate', data);
        });

        this.controls.on('biomeParameterChange', (data: BiomeData) => {
            this.sceneManager.emit('biomeParameterChange', data);
        });

        // Debug events
        this.sceneManager.on('debugInfo', (info: any) => {
            this.debugPanel.updateInfo(info);
        });
    }

    public handleTimeUpdate(data: ServerTimeData): void {
        this.timeManager.handleServerTimeUpdate(data);
    }

    public handleTimeControlAck(data: TimeControlAck): void {
        this.timeManager.handleTimeControlAck(data);
    }

    public dispose(): void {
        this.timeManager.dispose();
        this.controls.dispose();
        this.debugPanel.dispose();
        this.panelManager.dispose();
    }
}