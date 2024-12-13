import { vec3 } from 'gl-matrix';
import { NodeManager, Node, NodeRule } from './NodeManager';
import { NodeProceduralRules, StructureTemplate } from './NodeProceduralRules';
import { ProceduralSystem } from '../../core/ProceduralSystem';
import { EnvironmentManager } from '../../world/EnvironmentManager';

export interface GenerationConfig {
    template: StructureTemplate;
    startPosition: vec3;
    size: number;
    complexity: number;
    age: number;
    environmentalFactors: {
        temperature: number;
        humidity: number;
        windStrength: number;
        windDirection: vec3;
        terrainType: string;
    };
}

export class NodeStructureGenerator {
    private nodeManager: NodeManager;
    private rules: NodeProceduralRules;
    private proceduralSystem: ProceduralSystem;
    private environmentManager: EnvironmentManager;

    constructor(
        nodeManager: NodeManager,
        rules: NodeProceduralRules,
        proceduralSystem: ProceduralSystem,
        environmentManager: EnvironmentManager
    ) {
        this.nodeManager = nodeManager;
        this.rules = rules;
        this.proceduralSystem = proceduralSystem;
        this.environmentManager = environmentManager;
    }

    public generateStructure(config: GenerationConfig): string[] {
        // Validate environment conditions
        if (!this.validateEnvironment(config)) {
            throw new Error('Environmental conditions not suitable for structure generation');
        }

        // Initialize generation
        const rootNode = this.nodeManager.createNode(
            config.startPosition,
            config.template.baseRules[0].type
        );

        const generatedNodes = new Set<string>([rootNode]);
        const growthQueue = [rootNode];
        const maxIterations = config.size * 10; // Prevent infinite loops
        let iterations = 0;

        // Generate structure using growth rules
        while (growthQueue.length > 0 && generatedNodes.size < config.size && iterations < maxIterations) {
            const currentNodeId = growthQueue.shift()!;
            const currentNode = this.nodeManager.getNode(currentNodeId)!;

            // Get growth parameters for current node
            const growthParams = this.rules.generateGrowthParameters(
                config.template,
                currentNode.position,
                config.age
            );

            // Calculate number of branches based on complexity and growth parameters
            const branchCount = Math.floor(
                this.proceduralSystem.generateNoise2D(
                    currentNode.position[0],
                    currentNode.position[2]
                ) * config.complexity * growthParams.density + 1
            );

            // Generate branches
            for (let i = 0; i < branchCount; i++) {
                if (generatedNodes.size >= config.size) break;

                const newNode = this.generateBranch(
                    currentNode,
                    config,
                    growthParams,
                    i,
                    branchCount
                );

                if (newNode) {
                    generatedNodes.add(newNode);
                    growthQueue.push(newNode);
                }
            }

            iterations++;
        }

        // Validate final structure
        const nodes = Array.from(generatedNodes).map(id => this.nodeManager.getNode(id)!);
        if (!this.rules.validateStructure(nodes, config.template)) {
            throw new Error('Generated structure does not meet template constraints');
        }

        return Array.from(generatedNodes);
    }

    private generateBranch(
        parentNode: Node,
        config: GenerationConfig,
        growthParams: Record<string, number>,
        branchIndex: number,
        totalBranches: number
    ): string | null {
        // Get appropriate growth rule based on current height and connections
        const currentHeight = parentNode.position[1] - config.startPosition[1];
        const rule = this.rules.getNextGrowthRule(
            config.template,
            currentHeight,
            parentNode.connections.length
        );

        if (!rule) return null;

        // Calculate branch direction with variation
        const baseAngle = (Math.PI * 2 * branchIndex) / totalBranches;
        const angleVariation = this.proceduralSystem.generateNoise2D(
            parentNode.position[0] + branchIndex,
            parentNode.position[2]
        ) * Math.PI * growthParams.variation;

        const finalAngle = baseAngle + angleVariation;

        // Apply environmental influences
        const environmentalInfluence = this.calculateEnvironmentalInfluence(
            config.environmentalFactors,
            currentHeight
        );

        // Calculate new position
        const distance = rule.conditions.minDistance +
            (rule.conditions.maxDistance - rule.conditions.minDistance) *
            this.proceduralSystem.generateNoise2D(
                parentNode.position[0],
                parentNode.position[2] + branchIndex
            );

        const newPosition = vec3.fromValues(
            parentNode.position[0] + Math.cos(finalAngle) * distance,
            parentNode.position[1] + distance * 0.5 + environmentalInfluence.heightModifier,
            parentNode.position[2] + Math.sin(finalAngle) * distance
        );

        // Apply wind influence
        vec3.scaleAndAdd(
            newPosition,
            newPosition,
            config.environmentalFactors.windDirection,
            config.environmentalFactors.windStrength * environmentalInfluence.windSusceptibility
        );

        // Create new node
        const newNode = this.nodeManager.createNode(newPosition, rule.type);

        // Attempt to connect nodes
        if (!this.nodeManager.connectNodes(parentNode.id, newNode, rule.type)) {
            this.nodeManager.removeNode(newNode);
            return null;
        }

        return newNode;
    }

    private validateEnvironment(config: GenerationConfig): boolean {
        const { environmentalFactors, template } = config;
        const requirements = template.constraints.environmentRequirements;

        // Check temperature
        if (environmentalFactors.temperature < requirements.minTemperature ||
            environmentalFactors.temperature > requirements.maxTemperature) {
            return false;
        }

        // Check humidity
        if (environmentalFactors.humidity < requirements.minHumidity ||
            environmentalFactors.humidity > requirements.maxHumidity) {
            return false;
        }

        // Check terrain type
        if (!requirements.terrainTypes.includes(environmentalFactors.terrainType)) {
            return false;
        }

        return true;
    }

    private calculateEnvironmentalInfluence(
        factors: GenerationConfig['environmentalFactors'],
        height: number
    ): { heightModifier: number; windSusceptibility: number } {
        // Height modification based on environmental factors
        const heightModifier = 
            (factors.temperature - 20) * 0.02 + // Temperature influence
            (factors.humidity - 0.5) * 0.1;    // Humidity influence

        // Wind susceptibility increases with height
        const windSusceptibility = Math.min(
            0.1 + height * 0.05,  // Base susceptibility increases with height
            1.0                   // Maximum susceptibility cap
        );

        return {
            heightModifier,
            windSusceptibility
        };
    }

    public modifyStructure(
        nodeIds: string[],
        modifications: {
            scale?: number;
            rotation?: vec3;
            materialType?: string;
            customProperties?: Record<string, any>;
        }
    ): void {
        for (const id of nodeIds) {
            const node = this.nodeManager.getNode(id);
            if (!node) continue;

            if (modifications.scale) {
                vec3.scale(node.scale, node.scale, modifications.scale);
            }

            if (modifications.rotation) {
                vec3.add(node.rotation, node.rotation, modifications.rotation);
            }

            if (modifications.materialType) {
                node.properties.materialType = modifications.materialType;
            }

            if (modifications.customProperties) {
                node.properties.customData = {
                    ...node.properties.customData,
                    ...modifications.customProperties
                };
            }
        }
    }

    public optimizeStructure(nodeIds: string[]): void {
        const nodes = nodeIds.map(id => this.nodeManager.getNode(id)!);
        const bounds = this.calculateBounds(nodes);

        // Identify and remove redundant nodes
        const redundantNodes = new Set<string>();
        for (const node of nodes) {
            if (redundantNodes.has(node.id)) continue;

            // Check if node has too many nearby connections
            const nearbyNodes = this.nodeManager.findNodesInRadius(
                node.position,
                node.properties.connectionRadius * 0.5
            );

            if (nearbyNodes.length > node.properties.maxConnections + 1) {
                // Keep the node with the most stable connections
                const sorted = nearbyNodes.sort((a, b) => 
                    this.calculateNodeStability(b) - this.calculateNodeStability(a)
                );

                // Mark others as redundant
                for (let i = 1; i < sorted.length; i++) {
                    redundantNodes.add(sorted[i].id);
                }
            }
        }

        // Remove redundant nodes
        for (const id of redundantNodes) {
            this.nodeManager.removeNode(id);
        }
    }

    private calculateBounds(nodes: Node[]): { min: vec3; max: vec3 } {
        const min = vec3.fromValues(Infinity, Infinity, Infinity);
        const max = vec3.fromValues(-Infinity, -Infinity, -Infinity);

        for (const node of nodes) {
            vec3.min(min, min, node.position);
            vec3.max(max, max, node.position);
        }

        return { min, max };
    }

    private calculateNodeStability(node: Node): number {
        let stability = node.properties.stability;

        // Factor in connection count
        stability *= (node.connections.length / node.properties.maxConnections);

        // Factor in height (lower nodes are more stable)
        const heightFactor = 1 - (node.position[1] * 0.1);
        stability *= Math.max(0.1, heightFactor);

        // Factor in connection angles (more evenly distributed connections are more stable)
        if (node.connections.length > 1) {
            const angles = this.calculateConnectionAngles(node);
            const angleVariation = this.calculateAngleVariation(angles);
            stability *= (1 - angleVariation * 0.5);
        }

        return stability;
    }

    private calculateConnectionAngles(node: Node): number[] {
        const angles: number[] = [];
        for (const connectedId of node.connections) {
            const connected = this.nodeManager.getNode(connectedId);
            if (!connected) continue;

            const direction = vec3.subtract(vec3.create(), connected.position, node.position);
            angles.push(Math.atan2(direction[2], direction[0]));
        }
        return angles;
    }

    private calculateAngleVariation(angles: number[]): number {
        if (angles.length < 2) return 0;

        // Sort angles
        angles.sort((a, b) => a - b);

        // Calculate average angle difference
        let totalDiff = 0;
        for (let i = 1; i < angles.length; i++) {
            totalDiff += angles[i] - angles[i - 1];
        }
        totalDiff += Math.PI * 2 - (angles[angles.length - 1] - angles[0]);

        const idealDiff = (Math.PI * 2) / angles.length;
        const avgDiff = totalDiff / angles.length;

        return Math.abs(avgDiff - idealDiff) / Math.PI;
    }
} 