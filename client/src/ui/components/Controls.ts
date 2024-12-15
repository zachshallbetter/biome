import { SceneManager } from '../SceneManager';
import EventEmitter from 'eventemitter3';

export interface BiomeData {
    elevation: number;
    moisture: number;
    temperature: number;
    fertility: number;
    roughness: number;
}

export interface BiomeControl {
    id: string;
    label: string;
    min: number;
    max: number;
    step: number;
    default: number;
}

export class Controls extends EventEmitter {
    private container: HTMLElement;
    private biomeControls: {[key: string]: HTMLInputElement} = {};
    private readonly BIOME_PARAMS: BiomeControl[] = [
        { id: 'elevation', label: 'Elevation', min: 0, max: 1000, step: 1, default: 100 },
        { id: 'moisture', label: 'Moisture', min: 0, max: 100, step: 1, default: 50 },
        { id: 'temperature', label: 'Temperature', min: -20, max: 50, step: 1, default: 20 },
        { id: 'fertility', label: 'Fertility', min: 0, max: 100, step: 1, default: 50 },
        { id: 'roughness', label: 'Roughness', min: 0, max: 100, step: 1, default: 30 }
    ];

    constructor(private sceneManager: SceneManager) {
        super();
        
        this.container = document.createElement('div');
        this.container.className = 'controls-container';
        
        this.createBiomeControls();
    }

    private createBiomeControls(): void {
        const header = document.createElement('h3');
        header.textContent = 'Biome Parameters';
        this.container.appendChild(header);

        this.BIOME_PARAMS.forEach(param => {
            const container = document.createElement('div');
            container.className = 'biome-control';

            const label = document.createElement('label');
            label.textContent = param.label;

            const input = document.createElement('input');
            input.type = 'range';
            input.min = param.min.toString();
            input.max = param.max.toString();
            input.step = param.step.toString();
            input.value = param.default.toString();

            const value = document.createElement('span');
            value.className = 'biome-value';
            value.textContent = param.default.toString();

            input.addEventListener('input', () => {
                value.textContent = input.value;
                this.updateBiomeParameter(param.id, parseFloat(input.value));
            });

            this.biomeControls[param.id] = input;

            container.appendChild(label);
            container.appendChild(input);
            container.appendChild(value);
            this.container.appendChild(container);
        });

        // Add apply button
        const applyButton = document.createElement('button');
        applyButton.textContent = 'Apply Changes';
        applyButton.className = 'biome-apply';
        applyButton.addEventListener('click', () => this.applyBiomeChanges());
        this.container.appendChild(applyButton);
    }

    private updateBiomeParameter(param: string, value: number): void {
        this.emit('biomeParameterChange', {
            parameter: param,
            value: value
        });
    }

    private applyBiomeChanges(): void {
        const biomeData: BiomeData = {
            elevation: parseFloat(this.biomeControls.elevation.value),
            moisture: parseFloat(this.biomeControls.moisture.value),
            temperature: parseFloat(this.biomeControls.temperature.value),
            fertility: parseFloat(this.biomeControls.fertility.value),
            roughness: parseFloat(this.biomeControls.roughness.value)
        };

        this.emit('biomeUpdate', biomeData);
        this.sceneManager.emit('biomeUpdate', biomeData);
    }

    public getContainer(): HTMLElement {
        return this.container;
    }

    public dispose(): void {
        Object.values(this.biomeControls).forEach(input => {
            input.removeEventListener('input', () => {});
        });
        this.biomeControls = {};
        this.removeAllListeners();
        
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}