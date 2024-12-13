import { SceneManager } from '../scene/SceneManager';

export class Controls {
    private container: HTMLElement;
    private sceneManager: SceneManager;

    constructor(sceneManager: SceneManager) {
        console.log('Controls constructor started');
        this.sceneManager = sceneManager;
        
        // Create controls container
        this.container = document.createElement('div');
        this.container.id = 'controls-overlay';
        this.container.className = 'controls-overlay';
        document.body.appendChild(this.container);

        this.createControls();
        this.setupEventListeners();
        console.log('Controls constructor completed');
    }

    private createControls(): void {
        const controls = [
            { id: 'toggle-controls', label: 'Toggle Controls', hotkey: 'Space', action: () => this.sceneManager.toggleControlType() },
            { id: 'reset-camera', label: 'Reset Camera', hotkey: 'R', action: () => this.sceneManager.resetCamera() }
        ];

        controls.forEach(control => {
            const button = document.createElement('button');
            button.id = control.id;
            button.className = 'control-button';
            
            const label = document.createElement('span');
            label.className = 'control-label';
            label.textContent = control.label;
            
            const hotkey = document.createElement('span');
            hotkey.className = 'control-hotkey';
            hotkey.textContent = `[${control.hotkey}]`;
            
            button.appendChild(label);
            button.appendChild(hotkey);
            
            button.addEventListener('click', control.action);
            this.container.appendChild(button);
        });
    }

    private setupEventListeners(): void {
        window.addEventListener('keydown', (event) => {
            switch (event.code) {
                case 'Space':
                    event.preventDefault();
                    this.sceneManager.toggleControlType();
                    this.highlightButton('toggle-controls');
                    break;
                case 'KeyR':
                    event.preventDefault();
                    this.sceneManager.resetCamera();
                    this.highlightButton('reset-camera');
                    break;
            }
        });
    }

    private highlightButton(id: string): void {
        const button = document.getElementById(id);
        if (button) {
            button.classList.add('active');
            setTimeout(() => button.classList.remove('active'), 200);
        }
    }

    public dispose(): void {
        // Remove event listeners and clean up
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
} 