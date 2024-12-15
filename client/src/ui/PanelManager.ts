import { Panel } from './components/Panel';
import { SceneManager } from './SceneManager';

export type PanelType = 'time' | 'status' | 'debug' | 'controls';

export interface PanelConfig {
    id: string;
    title: string;
    type: PanelType;
    position: { x: number; y: number };
    size: { width: number; height: number };
    minSize: { width: number; height: number };
    isResizable: boolean;
    isDraggable: boolean;
    isMinimizable: boolean;
    isClosable: boolean;
    visible: boolean;
    className?: string;
    content?: HTMLElement;
}

export class PanelManager {
    private panels: Map<string, Panel> = new Map();

    constructor(private sceneManager: SceneManager, private container: HTMLElement) {
        this.setupEventListeners();
    }

    public createPanel(config: PanelConfig): Panel {
        if (this.panels.has(config.id)) {
            throw new Error(`Panel with id ${config.id} already exists`);
        }

        const panel = new Panel(config);
        
        if (config.visible) {
            this.container.appendChild(panel.getContainer());
        }
        this.panels.set(config.id, panel);
        return panel;
    }

    public removePanel(id: string): boolean {
        const panel = this.panels.get(id);
        if (panel) {
            panel.dispose();
            return this.panels.delete(id);
        }
        return false;
    }

    public getPanel(id: string): Panel | undefined {
        return this.panels.get(id);
    }

    public getPanelsByType(type: PanelType): Panel[] {
        return Array.from(this.panels.values())
            .filter(panel => panel['config'].type === type);
    }

    public updatePanelContent(id: string, content: HTMLElement): void {
        const panel = this.panels.get(id);
        if (panel) {
            panel.setContent(content);
        }
    }

    public updatePanelConfig(id: string, updates: Partial<PanelConfig>): void {
        const panel = this.panels.get(id);
        if (panel) {
            const currentConfig = panel['config'];
            const newConfig = { ...currentConfig, ...updates };
            panel['config'] = newConfig;
            
            if (updates.visible !== undefined) {
                if (updates.visible) {
                    this.container.appendChild(panel.getContainer());
                } else {
                    panel.getContainer().remove();
                }
            }
        }
    }

    public getAllPanels(): Panel[] {
        return Array.from(this.panels.values());
    }

    public dispose(): void {
        this.panels.forEach(panel => panel.dispose());
        this.panels.clear();
        this.sceneManager.removeAllListeners();
    }

    private setupEventListeners(): void {
        // Panel-related event listeners can be added here
        this.sceneManager.on('panelEvent', (data) => {
            console.log('Panel event received:', data);
        });
    }
}