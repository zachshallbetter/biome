import { vec3 } from 'gl-matrix';
import { ProceduralSystem } from '../../core/ProceduralSystem';
import { NodeRule } from './NodeManager';

export interface StructureTemplate {
    id: string;
    name: string;
    description: string;
    baseRules: NodeRule[];
    growthRules: NodeRule[];
    constraints: StructureConstraints;
    properties: StructureProperties;
}

export interface StructureConstraints {
    minHeight: number;
    maxHeight: number;
    minWidth: number;
    maxWidth: number;
    minNodes: number;
    maxNodes: number;
    requiredSupports: number;
    symmetry: boolean;
    allowedMaterials: string[];
    environmentRequirements: {
        minTemperature: number;
        maxTemperature: number;
        minHumidity: number;
        maxHumidity: number;
        terrainTypes: string[];
    };
}

export interface StructureProperties {
    stability: number;
    complexity: number;
    adaptability: number;
    growthRate: number;
    weatherResistance: number;
    customProperties: Record<string, any>;
}

export class NodeProceduralRules {
    private templates: Map<string, StructureTemplate>;
    private proceduralSystem: ProceduralSystem;

    constructor(proceduralSystem: ProceduralSystem) {
        this.templates = new Map();
        this.proceduralSystem = proceduralSystem;
        this.initializeTemplates();
    }

    private initializeTemplates(): void {
        // Tree template
        this.templates.set('tree', {
            id: 'tree',
            name: 'Procedural Tree',
            description: 'A naturally growing tree with branches and foliage',
            baseRules: [
                {
                    type: 'trunk',
                    conditions: {
                        maxDistance: 2.0,
                        minDistance: 1.0,
                        angleRange: [-Math.PI / 8, Math.PI / 8],
                        maxConnections: 5,
                        supportRequired: 100,
                        materialCompatibility: ['wood']
                    },
                    properties: {
                        strength: 1.0,
                        flexibility: 0.3,
                        growthModifier: 1.0
                    }
                }
            ],
            growthRules: [
                {
                    type: 'branch',
                    conditions: {
                        maxDistance: 1.5,
                        minDistance: 0.5,
                        angleRange: [-Math.PI / 2, Math.PI / 2],
                        maxConnections: 3,
                        supportRequired: 50,
                        materialCompatibility: ['wood']
                    },
                    properties: {
                        strength: 0.7,
                        flexibility: 0.5,
                        growthModifier: 1.2
                    }
                }
            ],
            constraints: {
                minHeight: 5,
                maxHeight: 15,
                minWidth: 3,
                maxWidth: 8,
                minNodes: 20,
                maxNodes: 100,
                requiredSupports: 1,
                symmetry: false,
                allowedMaterials: ['wood', 'leaf'],
                environmentRequirements: {
                    minTemperature: 5,
                    maxTemperature: 35,
                    minHumidity: 0.3,
                    maxHumidity: 1.0,
                    terrainTypes: ['soil', 'grass', 'forest']
                }
            },
            properties: {
                stability: 0.8,
                complexity: 0.7,
                adaptability: 0.9,
                growthRate: 1.0,
                weatherResistance: 0.6,
                customProperties: {
                    leafDensity: 0.8,
                    fruitBearing: false,
                    seasonalChanges: true
                }
            }
        });

        // Tower template
        this.templates.set('tower', {
            id: 'tower',
            name: 'Procedural Tower',
            description: 'A vertical structure with support elements',
            baseRules: [
                {
                    type: 'foundation',
                    conditions: {
                        maxDistance: 4.0,
                        minDistance: 2.0,
                        angleRange: [-Math.PI / 4, Math.PI / 4],
                        maxConnections: 6,
                        supportRequired: 200,
                        materialCompatibility: ['stone', 'metal']
                    },
                    properties: {
                        strength: 1.0,
                        flexibility: 0.1,
                        growthModifier: 0.8
                    }
                }
            ],
            growthRules: [
                {
                    type: 'vertical',
                    conditions: {
                        maxDistance: 3.0,
                        minDistance: 2.0,
                        angleRange: [-Math.PI / 16, Math.PI / 16],
                        maxConnections: 4,
                        supportRequired: 150,
                        materialCompatibility: ['stone', 'metal']
                    },
                    properties: {
                        strength: 0.9,
                        flexibility: 0.2,
                        growthModifier: 0.9
                    }
                }
            ],
            constraints: {
                minHeight: 10,
                maxHeight: 30,
                minWidth: 4,
                maxWidth: 8,
                minNodes: 30,
                maxNodes: 150,
                requiredSupports: 4,
                symmetry: true,
                allowedMaterials: ['stone', 'metal', 'wood'],
                environmentRequirements: {
                    minTemperature: -20,
                    maxTemperature: 40,
                    minHumidity: 0,
                    maxHumidity: 1,
                    terrainTypes: ['rock', 'soil', 'stone']
                }
            },
            properties: {
                stability: 0.9,
                complexity: 0.6,
                adaptability: 0.4,
                growthRate: 0.5,
                weatherResistance: 0.8,
                customProperties: {
                    platformLevels: 3,
                    hasStaircase: true,
                    reinforced: true
                }
            }
        });

        // Add more templates...
    }

    public getTemplate(id: string): StructureTemplate | undefined {
        return this.templates.get(id);
    }

    public getAllTemplates(): StructureTemplate[] {
        return Array.from(this.templates.values());
    }

    public validateStructure(
        nodes: { position: vec3; connections: string[] }[],
        template: StructureTemplate
    ): boolean {
        // Check node count
        if (nodes.length < template.constraints.minNodes ||
            nodes.length > template.constraints.maxNodes) {
            return false;
        }

        // Check dimensions
        const bounds = this.calculateBounds(nodes);
        const height = bounds.max[1] - bounds.min[1];
        const width = Math.max(
            bounds.max[0] - bounds.min[0],
            bounds.max[2] - bounds.min[2]
        );

        if (height < template.constraints.minHeight ||
            height > template.constraints.maxHeight ||
            width < template.constraints.minWidth ||
            width > template.constraints.maxWidth) {
            return false;
        }

        // Check support points
        const groundNodes = nodes.filter(node => 
            Math.abs(node.position[1] - bounds.min[1]) < 0.1
        );
        if (groundNodes.length < template.constraints.requiredSupports) {
            return false;
        }

        // Check symmetry if required
        if (template.constraints.symmetry && !this.checkSymmetry(nodes)) {
            return false;
        }

        return true;
    }

    private calculateBounds(nodes: { position: vec3 }[]): { min: vec3; max: vec3 } {
        const min = vec3.fromValues(Infinity, Infinity, Infinity);
        const max = vec3.fromValues(-Infinity, -Infinity, -Infinity);

        for (const node of nodes) {
            vec3.min(min, min, node.position);
            vec3.max(max, max, node.position);
        }

        return { min, max };
    }

    private checkSymmetry(nodes: { position: vec3 }[]): boolean {
        const bounds = this.calculateBounds(nodes);
        const center = vec3.scale(vec3.create(), vec3.add(vec3.create(), bounds.min, bounds.max), 0.5);

        // Check if nodes are roughly symmetrical around the center
        const nodeMap = new Map<string, boolean>();
        for (const node of nodes) {
            const relativePos = vec3.subtract(vec3.create(), node.position, center);
            const mirrorPos = vec3.fromValues(-relativePos[0], relativePos[1], -relativePos[2]);
            vec3.add(mirrorPos, mirrorPos, center);

            // Look for a matching node within a small tolerance
            const tolerance = 0.5;
            const hasMatch = nodes.some(other => 
                vec3.distance(other.position, mirrorPos) < tolerance
            );

            if (!hasMatch) return false;
        }

        return true;
    }

    public generateGrowthParameters(
        template: StructureTemplate,
        position: vec3,
        age: number
    ): Record<string, number> {
        const baseNoise = this.proceduralSystem.generateNoise2D(
            position[0],
            position[2]
        );

        return {
            growth: baseNoise * template.properties.growthRate * age,
            variation: this.proceduralSystem.generateNoise2D(
                position[0] + 1000,
                position[2]
            ) * template.properties.adaptability,
            density: this.proceduralSystem.generateNoise2D(
                position[0],
                position[2] + 1000
            ) * template.properties.complexity,
            stability: template.properties.stability * (1 - age * 0.1)
        };
    }

    public getNextGrowthRule(
        template: StructureTemplate,
        currentHeight: number,
        connectionCount: number
    ): NodeRule | undefined {
        const heightRatio = currentHeight / template.constraints.maxHeight;
        
        // Use different rules based on height and connection count
        if (heightRatio < 0.2) {
            return template.baseRules[0]; // Use base/foundation rules
        } else if (connectionCount >= 3) {
            // Limit branching for stability
            return template.growthRules.find(rule => 
                rule.conditions.maxConnections <= 2
            );
        } else {
            // Use standard growth rules
            return template.growthRules[0];
        }
    }
} 