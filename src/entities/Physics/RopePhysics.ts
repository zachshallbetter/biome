import { vec2 } from 'gl-matrix';
import EventEmitter from 'eventemitter3';

export interface RopePoint {
    id: string;
    position: vec2;
    prevPosition: vec2;
    velocity: vec2;
    mass: number;
    isFixed: boolean;
}

export interface RopeSegment {
    pointA: RopePoint;
    pointB: RopePoint;
    length: number;
    stiffness: number;
    damping: number;
}

export interface RopeConfig {
    gravity: vec2;
    iterations: number;
    defaultStiffness: number;
    defaultDamping: number;
}

export class RopePhysics extends EventEmitter {
    private points: Map<string, RopePoint>;
    private segments: RopeSegment[];
    private config: RopeConfig;

    constructor(config: Partial<RopeConfig> = {}) {
        super();
        this.points = new Map();
        this.segments = [];
        
        // Set default config values
        this.config = {
            gravity: vec2.fromValues(0, -9.81),
            iterations: 10,
            defaultStiffness: 0.5,
            defaultDamping: 0.1,
            ...config
        };
    }

    public createPoint(position: vec2, isFixed: boolean = false): string {
        const id = `point-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const point: RopePoint = {
            id,
            position: vec2.clone(position),
            prevPosition: vec2.clone(position),
            velocity: vec2.create(),
            mass: 1.0,
            isFixed
        };

        this.points.set(id, point);
        this.emit('pointCreated', point);
        return id;
    }

    public createSegment(pointAId: string, pointBId: string, options: Partial<Omit<RopeSegment, 'pointA' | 'pointB'>> = {}): void {
        const pointA = this.points.get(pointAId);
        const pointB = this.points.get(pointBId);

        if (!pointA || !pointB) {
            throw new Error('Invalid point IDs');
        }

        const segment: RopeSegment = {
            pointA,
            pointB,
            length: options.length || vec2.distance(pointA.position, pointB.position),
            stiffness: options.stiffness || this.config.defaultStiffness,
            damping: options.damping || this.config.defaultDamping
        };

        this.segments.push(segment);
        this.emit('segmentCreated', segment);
    }

    public update(deltaTime: number): void {
        // Update points
        for (const point of this.points.values()) {
            if (!point.isFixed) {
                this.updatePoint(point, deltaTime);
            }
        }

        // Solve constraints
        for (let i = 0; i < this.config.iterations; i++) {
            for (const segment of this.segments) {
                this.solveSegmentConstraint(segment);
            }
        }

        // Update velocities
        for (const point of this.points.values()) {
            if (!point.isFixed) {
                vec2.subtract(point.velocity, point.position, point.prevPosition);
                vec2.scale(point.velocity, point.velocity, 1 / deltaTime);
                vec2.copy(point.prevPosition, point.position);
            }
        }

        this.emit('updated');
    }

    private updatePoint(point: RopePoint, deltaTime: number): void {
        // Save current position
        vec2.copy(point.prevPosition, point.position);

        // Apply gravity
        vec2.scaleAndAdd(point.velocity, point.velocity, this.config.gravity, deltaTime);

        // Update position using Verlet integration
        const temp = vec2.clone(point.position);
        vec2.scaleAndAdd(point.position, point.position, point.velocity, deltaTime);
        vec2.copy(point.prevPosition, temp);
    }

    private solveSegmentConstraint(segment: RopeSegment): void {
        const { pointA, pointB, length, stiffness } = segment;

        // Calculate current distance
        const delta = vec2.create();
        vec2.subtract(delta, pointB.position, pointA.position);
        const currentLength = vec2.length(delta);

        if (currentLength === 0) return;

        const diff = (currentLength - length) / currentLength;

        // Calculate position corrections
        const correction = vec2.create();
        vec2.scale(correction, delta, diff * 0.5 * stiffness);

        if (!pointA.isFixed) {
            vec2.add(pointA.position, pointA.position, correction);
        }
        if (!pointB.isFixed) {
            vec2.subtract(pointB.position, pointB.position, correction);
        }

        // Apply damping
        if (!pointA.isFixed && !pointB.isFixed) {
            const relativeVelocity = vec2.create();
            vec2.subtract(relativeVelocity, pointB.velocity, pointA.velocity);
            
            const dampingForce = vec2.create();
            vec2.scale(dampingForce, relativeVelocity, segment.damping);
            
            vec2.scaleAndAdd(pointA.velocity, pointA.velocity, dampingForce, 0.5);
            vec2.scaleAndAdd(pointB.velocity, pointB.velocity, dampingForce, -0.5);
        }
    }

    public applyForce(pointId: string, force: vec2): void {
        const point = this.points.get(pointId);
        if (point && !point.isFixed) {
            vec2.scaleAndAdd(point.velocity, point.velocity, force, 1 / point.mass);
        }
    }

    public setPointPosition(pointId: string, position: vec2): void {
        const point = this.points.get(pointId);
        if (point) {
            vec2.copy(point.position, position);
            vec2.copy(point.prevPosition, position);
            vec2.zero(point.velocity);
        }
    }

    public getPoint(pointId: string): RopePoint | undefined {
        return this.points.get(pointId);
    }

    public getSegments(): RopeSegment[] {
        return [...this.segments];
    }

    public removePoint(pointId: string): void {
        const point = this.points.get(pointId);
        if (point) {
            // Remove all segments connected to this point
            this.segments = this.segments.filter(segment => 
                segment.pointA.id !== pointId && segment.pointB.id !== pointId
            );
            this.points.delete(pointId);
            this.emit('pointRemoved', point);
        }
    }

    public clear(): void {
        this.points.clear();
        this.segments = [];
        this.emit('cleared');
    }

    public setConfig(config: Partial<RopeConfig>): void {
        this.config = { ...this.config, ...config };
    }

    public getConfig(): RopeConfig {
        return { ...this.config };
    }
} 