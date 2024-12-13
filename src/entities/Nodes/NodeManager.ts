import { vec3 } from 'gl-matrix';
import { PhysicsEngine, RigidBody } from '../Physics/PhysicsEngine';
import EventEmitter from 'eventemitter3';

export interface NodeProperties {
    mass: number;
    restitution: number;
    friction: number;
    isStatic: boolean;
    collisionMask: number;
    collisionGroup: number;
    maxConnections: number;
    connectionRadius: number;
    stability: number;
    materialType: string;
    customData: Record<string, any>;
}

export interface NodeRule {
    type: string;
    conditions: {
        maxDistance: number;
        minDistance: number;
        angleRange: [number, number];
        maxConnections: number;
        supportRequired: number;
        materialCompatibility: string[];
    };
    properties: {
        strength: number;
        flexibility: number;
        growthModifier: number;
    };
}

export interface Node {
    id: string;
    position: vec3;
    rotation: vec3;
    scale: vec3;
    velocity: vec3;
    angularVelocity: vec3;
    force: vec3;
    torque: vec3;
    mass: number;
    inertia: number;
    restitution: number;
    friction: number;
    isStatic: boolean;
    boundingBox: {
        min: vec3;
        max: vec3;
    };
    collisionMask: number;
    collisionGroup: number;
    connections: string[];
    properties: {
        maxConnections: number;
        connectionRadius: number;
        stability: number;
        materialType: string;
        customData: Record<string, any>;
    };
}

export class NodeManager extends EventEmitter {
    private nodes: Map<string, Node>;
    private physicsEngine: PhysicsEngine;

    constructor(physicsEngine: PhysicsEngine) {
        super();
        this.nodes = new Map();
        this.physicsEngine = physicsEngine;
    }

    public createNode(position: vec3, type: string, properties?: Partial<NodeProperties>): string {
        const id = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Create bounding box
        const size = 1.0; // Default node size
        const boundingBox = {
            min: vec3.fromValues(position[0] - size/2, position[1] - size/2, position[2] - size/2),
            max: vec3.fromValues(position[0] + size/2, position[1] + size/2, position[2] + size/2)
        };

        // Default properties
        const defaultProps: NodeProperties = {
            mass: 1.0,
            restitution: 0.3,
            friction: 0.5,
            isStatic: false,
            collisionMask: 0xFFFF,
            collisionGroup: 0x0001,
            maxConnections: 4,
            connectionRadius: 2.0,
            stability: 1.0,
            materialType: 'default',
            customData: {}
        };

        const finalProps = { ...defaultProps, ...properties };

        // Create the node
        const node: Node = {
            id,
            position: vec3.clone(position),
            rotation: vec3.create(),
            scale: vec3.fromValues(1, 1, 1),
            velocity: vec3.create(),
            angularVelocity: vec3.create(),
            force: vec3.create(),
            torque: vec3.create(),
            mass: finalProps.mass,
            inertia: finalProps.mass * (size * size) / 6,
            restitution: finalProps.restitution,
            friction: finalProps.friction,
            isStatic: finalProps.isStatic,
            boundingBox,
            collisionMask: finalProps.collisionMask,
            collisionGroup: finalProps.collisionGroup,
            connections: [],
            properties: {
                maxConnections: finalProps.maxConnections,
                connectionRadius: finalProps.connectionRadius,
                stability: finalProps.stability,
                materialType: finalProps.materialType,
                customData: finalProps.customData
            }
        };

        // Add to physics engine
        this.physicsEngine.addRigidBody(node as unknown as RigidBody);
        
        // Store in local map
        this.nodes.set(id, node);
        
        this.emit('nodeCreated', node);
        return id;
    }

    public removeNode(id: string): void {
        const node = this.nodes.get(id);
        if (node) {
            // Remove from physics engine
            this.physicsEngine.removeRigidBody(id);
            
            // Remove all connections
            this.removeAllConnections(id);
            
            // Remove from local map
            this.nodes.delete(id);
            
            this.emit('nodeRemoved', node);
        }
    }

    public connectNodes(nodeAId: string, nodeBId: string, type: string): boolean {
        const nodeA = this.nodes.get(nodeAId);
        const nodeB = this.nodes.get(nodeBId);
        
        if (!nodeA || !nodeB) return false;

        // Check max connections
        if (nodeA.connections.length >= nodeA.properties.maxConnections ||
            nodeB.connections.length >= nodeB.properties.maxConnections) {
            return false;
        }

        // Check connection radius
        const distance = vec3.distance(nodeA.position, nodeB.position);
        if (distance > nodeA.properties.connectionRadius ||
            distance > nodeB.properties.connectionRadius) {
            return false;
        }

        nodeA.connections.push(nodeBId);
        nodeB.connections.push(nodeAId);
        
        this.emit('nodesConnected', { nodeA, nodeB, type });
        return true;
    }

    public disconnectNodes(nodeAId: string, nodeBId: string): void {
        const nodeA = this.nodes.get(nodeAId);
        const nodeB = this.nodes.get(nodeBId);
        
        if (nodeA && nodeB) {
            nodeA.connections = nodeA.connections.filter(id => id !== nodeBId);
            nodeB.connections = nodeB.connections.filter(id => id !== nodeAId);
            
            this.emit('nodesDisconnected', { nodeA, nodeB });
        }
    }

    private removeAllConnections(nodeId: string): void {
        const node = this.nodes.get(nodeId);
        if (node) {
            for (const connectedId of node.connections) {
                const connectedNode = this.nodes.get(connectedId);
                if (connectedNode) {
                    connectedNode.connections = connectedNode.connections.filter(id => id !== nodeId);
                }
            }
            node.connections = [];
        }
    }

    public getNode(id: string): Node | undefined {
        return this.nodes.get(id);
    }

    public findNodesInRadius(position: vec3, radius: number): Node[] {
        return Array.from(this.nodes.values()).filter(node => 
            vec3.distance(node.position, position) <= radius
        );
    }

    public getConnectedNodes(nodeId: string): Node[] {
        const node = this.nodes.get(nodeId);
        if (!node) return [];
        
        return node.connections
            .map(id => this.nodes.get(id))
            .filter((node): node is Node => node !== undefined);
    }

    public cleanup(): void {
        // Remove all nodes
        for (const nodeId of this.nodes.keys()) {
            this.removeNode(nodeId);
        }
        
        // Clear map
        this.nodes.clear();
        
        // Remove all listeners
        this.removeAllListeners();
    }
}