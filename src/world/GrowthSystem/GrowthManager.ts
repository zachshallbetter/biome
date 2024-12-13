import EventEmitter from 'eventemitter3';
import { BiomeManager, BiomeType } from '../BiomeManager';
import { EnvironmentManager, EnvironmentalConditions } from '../EnvironmentManager';
import { TimeManager } from '../../core/TimeManager';
import { vec2 } from 'gl-matrix';

export interface GrowthStage {
    id: string;
    scale: number;
    textureVariant: number;
    requiredTime: number;
    requiredConditions: Partial<EnvironmentalConditions>;
}

export interface GrowthEntity {
    id: string;
    type: string;
    position: [number, number];
    currentStage: number;
    stageProgress: number;
    health: number;
    age: number;
    lastUpdate: number;
}

export interface GrowthRules {
    stages: GrowthStage[];
    maxHealth: number;
    healthDecayRate: number;
    growthRate: number;
    spreadChance: number;
    spreadRadius: number;
    maxDensity: number;
    biomeFactors: { [key in BiomeType]?: number };
}

export class GrowthManager extends EventEmitter {
    private biomeManager: BiomeManager;
    private environmentManager: EnvironmentManager;
    private timeManager: TimeManager;
    private entities: Map<string, GrowthEntity>;
    private growthRules: Map<string, GrowthRules>;
    private lastUpdate: number;

    constructor(
        biomeManager: BiomeManager,
        environmentManager: EnvironmentManager,
        timeManager: TimeManager
    ) {
        super();
        this.biomeManager = biomeManager;
        this.environmentManager = environmentManager;
        this.timeManager = timeManager;
        this.entities = new Map();
        this.growthRules = new Map();
        this.lastUpdate = 0;

        this.initializeGrowthRules();
    }

    private initializeGrowthRules(): void {
        // Define growth rules for different types of vegetation
        this.growthRules.set('tree', {
            stages: [
                {
                    id: 'sapling',
                    scale: 0.3,
                    textureVariant: 0,
                    requiredTime: 24, // hours
                    requiredConditions: {
                        temperature: 15,
                        humidity: 0.4
                    }
                },
                {
                    id: 'young',
                    scale: 0.6,
                    textureVariant: 1,
                    requiredTime: 72,
                    requiredConditions: {
                        temperature: 15,
                        humidity: 0.4
                    }
                },
                {
                    id: 'mature',
                    scale: 1.0,
                    textureVariant: 2,
                    requiredTime: 168,
                    requiredConditions: {
                        temperature: 15,
                        humidity: 0.4
                    }
                }
            ],
            maxHealth: 100,
            healthDecayRate: 0.1,
            growthRate: 1.0,
            spreadChance: 0.01,
            spreadRadius: 5,
            maxDensity: 0.3,
            biomeFactors: {
                [BiomeType.FOREST]: 1.2,
                [BiomeType.PLAINS]: 0.8,
                [BiomeType.RAINFOREST]: 1.5
            }
        });

        // Add more vegetation types...
    }

    public addEntity(type: string, position: [number, number]): string {
        const id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const entity: GrowthEntity = {
            id,
            type,
            position,
            currentStage: 0,
            stageProgress: 0,
            health: this.growthRules.get(type)?.maxHealth || 100,
            age: 0,
            lastUpdate: this.timeManager.getGameTime()
        };

        this.entities.set(id, entity);
        this.emit('entityAdded', entity);
        return id;
    }

    public update(deltaTime: number): void {
        const currentTime = this.timeManager.getGameTime();
        
        // Update only every hour of game time
        if (currentTime - this.lastUpdate < 1) return;
        this.lastUpdate = currentTime;

        // Update all entities
        for (const [id, entity] of this.entities) {
            this.updateEntity(entity, deltaTime);
        }

        // Handle entity spreading
        this.handleEntitySpreading();

        this.emit('growthUpdated');
    }

    private updateEntity(entity: GrowthEntity, deltaTime: number): void {
        const rules = this.growthRules.get(entity.type);
        if (!rules) return;

        const biomeType = this.getBiomeAtPosition(entity.position);
        const conditions = this.environmentManager.getEnvironmentalConditions(biomeType);
        if (!conditions) return;

        // Update age
        entity.age += deltaTime;

        // Update health based on environmental conditions
        this.updateEntityHealth(entity, rules, conditions);

        // Update growth if entity is healthy
        if (entity.health > 50) {
            this.updateEntityGrowth(entity, rules, conditions, biomeType);
        }

        // Remove dead entities
        if (entity.health <= 0) {
            this.entities.delete(entity.id);
            this.emit('entityDied', entity);
        }
    }

    private updateEntityHealth(
        entity: GrowthEntity,
        rules: GrowthRules,
        conditions: EnvironmentalConditions
    ): void {
        const stage = rules.stages[entity.currentStage];
        const healthChange = this.calculateHealthChange(stage, conditions, rules.healthDecayRate);
        
        entity.health = Math.max(0, Math.min(rules.maxHealth, entity.health + healthChange));
    }

    private updateEntityGrowth(
        entity: GrowthEntity,
        rules: GrowthRules,
        conditions: EnvironmentalConditions,
        biomeType: BiomeType
    ): void {
        const stage = rules.stages[entity.currentStage];
        if (!stage || entity.currentStage >= rules.stages.length - 1) return;

        const biomeFactor = rules.biomeFactors[biomeType] || 1.0;
        const growthRate = this.calculateGrowthRate(stage, conditions, rules.growthRate, biomeFactor);
        
        entity.stageProgress += growthRate;

        // Check for stage advancement
        if (entity.stageProgress >= stage.requiredTime) {
            entity.currentStage++;
            entity.stageProgress = 0;
            this.emit('entityAdvanced', entity);
        }
    }

    private calculateHealthChange(
        stage: GrowthStage,
        conditions: EnvironmentalConditions,
        baseDecayRate: number
    ): number {
        let healthChange = -baseDecayRate;

        // Check if conditions are favorable
        if (this.areConditionsFavorable(conditions, stage.requiredConditions)) {
            healthChange += 1.0; // Health regeneration in favorable conditions
        }

        // Additional factors
        if (conditions.temperature < 0) {
            healthChange -= 0.5; // Cold damage
        }
        if (conditions.humidity < 0.2) {
            healthChange -= 0.3; // Drought damage
        }

        return healthChange;
    }

    private calculateGrowthRate(
        stage: GrowthStage,
        conditions: EnvironmentalConditions,
        baseRate: number,
        biomeFactor: number
    ): number {
        let rate = baseRate * biomeFactor;

        // Adjust rate based on conditions
        rate *= this.getTemperatureFactor(conditions.temperature);
        rate *= this.getHumidityFactor(conditions.humidity);
        rate *= this.getLightFactor(conditions.lightLevel);

        return Math.max(0, rate);
    }

    private getTemperatureFactor(temperature: number): number {
        // Optimal temperature range: 15-25°C
        const optimalTemp = 20;
        const tolerance = 10;
        const diff = Math.abs(temperature - optimalTemp);
        return Math.max(0, 1 - diff / tolerance);
    }

    private getHumidityFactor(humidity: number): number {
        // Optimal humidity range: 0.4-0.8
        if (humidity < 0.2) return 0;
        if (humidity > 0.9) return 0.5;
        return 1 - Math.abs(0.6 - humidity);
    }

    private getLightFactor(lightLevel: number): number {
        // Most plants grow better with more light, default to 1 if no light level
        if (typeof lightLevel === 'undefined') {
            return 1.0;
        }
        return Math.pow(lightLevel, 0.5);
    }

    private handleEntitySpreading(): void {
        const newEntities: [string, [number, number]][] = [];

        for (const entity of this.entities.values()) {
            const rules = this.growthRules.get(entity.type);
            if (!rules || entity.currentStage < rules.stages.length - 1) continue;

            // Check for spreading
            if (Math.random() < rules.spreadChance) {
                const spreadPosition = this.findSpreadPosition(entity, rules);
                if (spreadPosition) {
                    newEntities.push([entity.type, spreadPosition]);
                }
            }
        }

        // Add new entities after iteration
        for (const [type, position] of newEntities) {
            this.addEntity(type, position);
        }
    }

    private findSpreadPosition(entity: GrowthEntity, rules: GrowthRules): [number, number] | null {
        const attempts = 10;
        for (let i = 0; i < attempts; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * rules.spreadRadius;
            const x = Math.round(entity.position[0] + Math.cos(angle) * distance);
            const y = Math.round(entity.position[1] + Math.sin(angle) * distance);

            if (this.canGrowAt(x, y, entity.type)) {
                return [x, y];
            }
        }
        return null;
    }

    private canGrowAt(x: number, y: number, type: string): boolean {
        const rules = this.growthRules.get(type);
        if (!rules) return false;

        // Check biome compatibility
        const biomeType = this.getBiomeAtPosition([x, y]);
        if (!rules.biomeFactors[biomeType]) return false;

        // Check density constraints
        const localDensity = this.calculateLocalDensity(x, y, type);
        return localDensity < rules.maxDensity;
    }

    private calculateLocalDensity(x: number, y: number, type: string): number {
        const rules = this.growthRules.get(type);
        if (!rules) return 1;

        let count = 0;
        for (const entity of this.entities.values()) {
            if (entity.type === type) {
                const dx = entity.position[0] - x;
                const dy = entity.position[1] - y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance <= rules.spreadRadius) {
                    count++;
                }
            }
        }

        return count / (Math.PI * rules.spreadRadius * rules.spreadRadius);
    }

    private getBiomeAtPosition(position: [number, number]): BiomeType {
        // Get biome from biome manager
        return this.biomeManager.getBiomeAtPosition(position[0], position[1]);
    }

    private areConditionsFavorable(
        current: EnvironmentalConditions,
        required: Partial<EnvironmentalConditions>
    ): boolean {
        for (const [key, value] of Object.entries(required)) {
            const currentValue = current[key as keyof EnvironmentalConditions];
            if (typeof currentValue === 'number' && Math.abs(currentValue - value) > 5) {
                return false;
            }
        }
        return true;
    }

    public getEntitiesInArea(x: number, y: number, radius: number): GrowthEntity[] {
        const entities: GrowthEntity[] = [];
        
        for (const entity of this.entities.values()) {
            const dx = entity.position[0] - x;
            const dy = entity.position[1] - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= radius) {
                entities.push({ ...entity });
            }
        }

        return entities;
    }

    public removeEntity(id: string): void {
        const entity = this.entities.get(id);
        if (entity) {
            this.entities.delete(id);
            this.emit('entityRemoved', entity);
        }
    }

    public getGrowthRules(type: string): GrowthRules | undefined {
        return this.growthRules.get(type);
    }
} 