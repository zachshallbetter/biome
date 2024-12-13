import EventEmitter from 'eventemitter3';
import { vec2 } from 'gl-matrix';
import { PhysicsEngine, PhysicsObject } from './Physics/PhysicsEngine';
import { BiomeManager } from '../world/BiomeManager';

export interface EntityComponents {
    physics?: PhysicsObject;
    renderable?: {
        model: string;
        texture: string;
        scale: vec2;
    };
    interactive?: {
        isSelectable: boolean;
        isClickable: boolean;
        onInteract?: () => void;
    };
    growth?: {
        stage: number;
        maxStage: number;
        growthRate: number;
        lastGrowthTime: number;
    };
    aging?: {
        age: number;
        maxAge: number;
        deteriorationRate: number;
        condition: number;
    };
    [key: string]: any;
}

export interface Entity {
    id: string;
    type: string;
    position: vec2;
    rotation: number;
    scale: vec2;
    components: EntityComponents;
    tags: Set<string>;
    active: boolean;
}

export class EntityManager extends EventEmitter {
    private entities: Map<string, Entity>;
    private physicsEngine: PhysicsEngine;
    private biomeManager: BiomeManager;
    private entityTemplates: Map<string, Partial<Entity>>;
    private lastUpdate: number;

    constructor(physicsEngine: PhysicsEngine, biomeManager: BiomeManager) {
        super();
        this.entities = new Map();
        this.physicsEngine = physicsEngine;
        this.biomeManager = biomeManager;
        this.entityTemplates = new Map();
        this.lastUpdate = Date.now();

        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        this.physicsEngine.on('collision', ({ objectA, objectB }) => {
            const entityA = this.findEntityByPhysicsId(objectA.id);
            const entityB = this.findEntityByPhysicsId(objectB.id);
            
            if (entityA && entityB) {
                this.emit('entityCollision', { entityA, entityB });
            }
        });
    }

    public registerTemplate(type: string, template: Partial<Entity>): void {
        this.entityTemplates.set(type, template);
    }

    public createEntity(type: string, position: vec2, overrides: Partial<Entity> = {}): string {
        const template = this.entityTemplates.get(type);
        if (!template) {
            throw new Error(`No template registered for entity type: ${type}`);
        }

        const id = `entity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const entity: Entity = {
            id,
            type,
            position: vec2.clone(position),
            rotation: 0,
            scale: vec2.fromValues(1, 1),
            components: {},
            tags: new Set(),
            active: true,
            ...template,
            ...overrides
        };

        // Initialize physics if component exists
        if (entity.components.physics) {
            const physicsObject = {
                ...entity.components.physics,
                id: `physics-${id}`,
                position: vec2.clone(position)
            };
            this.physicsEngine.addObject(physicsObject);
            entity.components.physics = physicsObject;
        }

        this.entities.set(id, entity);
        this.emit('entityCreated', entity);
        return id;
    }

    public removeEntity(id: string): void {
        const entity = this.entities.get(id);
        if (entity) {
            // Cleanup physics
            if (entity.components.physics) {
                this.physicsEngine.removeObject(entity.components.physics.id);
            }

            this.entities.delete(id);
            this.emit('entityRemoved', entity);
        }
    }

    public update(deltaTime: number): void {
        const currentTime = Date.now();
        
        for (const entity of this.entities.values()) {
            if (!entity.active) continue;

            // Update physics-based position
            if (entity.components.physics) {
                const physicsObject = entity.components.physics;
                vec2.copy(entity.position, physicsObject.position);
                // Update rotation based on physics if needed
            }

            // Update growth
            if (entity.components.growth) {
                this.updateGrowth(entity, currentTime);
            }

            // Update aging
            if (entity.components.aging) {
                this.updateAging(entity, deltaTime);
            }

            // Emit update event for the entity
            this.emit('entityUpdated', entity);
        }

        this.lastUpdate = currentTime;
    }

    private updateGrowth(entity: Entity, currentTime: number): void {
        const growth = entity.components.growth!;
        const timeSinceLastGrowth = (currentTime - growth.lastGrowthTime) / 1000; // Convert to seconds

        if (growth.stage < growth.maxStage) {
            const growthProgress = timeSinceLastGrowth * growth.growthRate;
            if (growthProgress >= 1) {
                growth.stage++;
                growth.lastGrowthTime = currentTime;
                this.emit('entityGrowth', { entity, newStage: growth.stage });

                // Update scale based on growth stage
                const growthScale = 1 + (growth.stage / growth.maxStage) * 0.5;
                vec2.scale(entity.scale, entity.scale, growthScale);
            }
        }
    }

    private updateAging(entity: Entity, deltaTime: number): void {
        const aging = entity.components.aging!;
        
        aging.age += deltaTime;
        const ageRatio = aging.age / aging.maxAge;
        
        // Update condition based on age and deterioration rate
        aging.condition = Math.max(0, 1 - (ageRatio * aging.deteriorationRate));

        if (aging.age >= aging.maxAge) {
            this.emit('entityDeath', entity);
            this.removeEntity(entity.id);
        } else if (aging.condition < 0.5 && !entity.tags.has('deteriorated')) {
            entity.tags.add('deteriorated');
            this.emit('entityDeteriorated', entity);
        }
    }

    public getEntity(id: string): Entity | undefined {
        return this.entities.get(id);
    }

    public findEntitiesByType(type: string): Entity[] {
        return Array.from(this.entities.values()).filter(entity => entity.type === type);
    }

    public findEntitiesByTag(tag: string): Entity[] {
        return Array.from(this.entities.values()).filter(entity => entity.tags.has(tag));
    }

    public findEntitiesInRadius(position: vec2, radius: number): Entity[] {
        return Array.from(this.entities.values()).filter(entity => {
            const distance = vec2.distance(position, entity.position);
            return distance <= radius;
        });
    }

    private findEntityByPhysicsId(physicsId: string): Entity | undefined {
        return Array.from(this.entities.values()).find(
            entity => entity.components.physics?.id === physicsId
        );
    }

    public setEntityActive(id: string, active: boolean): void {
        const entity = this.entities.get(id);
        if (entity) {
            entity.active = active;
            if (entity.components.physics) {
                // Update physics object state if needed
            }
            this.emit('entityActiveChanged', { entity, active });
        }
    }

    public addComponent(entityId: string, componentName: string, component: any): void {
        const entity = this.entities.get(entityId);
        if (entity) {
            entity.components[componentName] = component;
            this.emit('componentAdded', { entity, componentName, component });
        }
    }

    public removeComponent(entityId: string, componentName: string): void {
        const entity = this.entities.get(entityId);
        if (entity && entity.components[componentName]) {
            delete entity.components[componentName];
            this.emit('componentRemoved', { entity, componentName });
        }
    }

    public cleanup(): void {
        // Remove all entities
        for (const entity of this.entities.values()) {
            this.removeEntity(entity.id);
        }

        // Clear all event listeners
        this.removeAllListeners();
    }
} 