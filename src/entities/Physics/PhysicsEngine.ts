import EventEmitter from 'eventemitter3';
import { vec2, vec3 } from 'gl-matrix';

export interface PhysicalProperties {
    mass: number;
    restitution: number;
    friction: number;
    isStatic: boolean;
    collisionMask: number;
    collisionGroup: number;
}

export interface PhysicsObject {
    id: string;
    position: vec2;
    velocity: vec2;
    acceleration: vec2;
    mass: number;
    restitution: number;
    friction: number;
    isStatic: boolean;
    boundingBox: {
        min: vec2;
        max: vec2;
    };
    collisionMask: number;
    collisionGroup: number;
}

export interface RigidBody {
    id: string;
    position: vec2;
    rotation: number;
    velocity: vec2;
    angularVelocity: number;
    force: vec2;
    torque: number;
    mass: number;
    inertia: number;
    restitution: number;
    friction: number;
    isStatic: boolean;
    boundingBox: {
        min: vec2;
        max: vec2;
    };
    collisionMask: number;
    collisionGroup: number;
}

export interface Node {
    id: string;
    position: vec3;
    rotation: vec3;
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
}

export interface PhysicsConfig {
    gravity: vec2;
    airResistance: number;
    maxVelocity: number;
    substeps: number;
    worldBounds: {
        min: vec2;
        max: vec2;
    };
}

export class PhysicsEngine extends EventEmitter {
    private objects: Map<string, PhysicsObject>;
    private rigidBodies: Map<string, RigidBody>;
    private config: PhysicsConfig;
    private accumulator: number;
    private fixedTimeStep: number;

    constructor(config: Partial<PhysicsConfig> = {}) {
        super();
        this.objects = new Map();
        this.rigidBodies = new Map();
        this.accumulator = 0;
        this.fixedTimeStep = 1 / 60; // 60 Hz physics update

        // Set default config values
        this.config = {
            gravity: vec2.fromValues(0, -9.81),
            airResistance: 0.01,
            maxVelocity: 100,
            substeps: 8,
            worldBounds: {
                min: vec2.fromValues(-1000, -1000),
                max: vec2.fromValues(1000, 1000)
            },
            ...config
        };
    }

    public addObject(object: PhysicsObject): void {
        this.objects.set(object.id, object);
        this.emit('objectAdded', object);
    }
    public addRigidBody(body: RigidBody): void {
        this.rigidBodies.set(body.id, body);
        this.emit('rigidBodyAdded', body);
    }

    public addNodeAsRigidBody(node: Node): void {
        const rigidBody: RigidBody = {
            id: node.id,
            position: vec2.fromValues(node.position[0], node.position[1]),
            rotation: node.rotation[2], // Only use Z rotation
            velocity: vec2.fromValues(node.velocity[0], node.velocity[1]),
            angularVelocity: node.angularVelocity[2],
            force: vec2.fromValues(node.force[0], node.force[1]),
            torque: node.torque[2],
            mass: node.mass,
            inertia: node.inertia,
            restitution: node.restitution,
            friction: node.friction,
            isStatic: node.isStatic,
            boundingBox: {
                min: vec2.fromValues(node.boundingBox.min[0], node.boundingBox.min[1]),
                max: vec2.fromValues(node.boundingBox.max[0], node.boundingBox.max[1])
            },
            collisionMask: node.collisionMask,
            collisionGroup: node.collisionGroup
        };

        this.rigidBodies.set(rigidBody.id, rigidBody);
        this.emit('rigidBodyAdded', rigidBody);
    }

    public removeObject(id: string): void {
        const object = this.objects.get(id);
        if (object) {
            this.objects.delete(id);
            this.emit('objectRemoved', object);
        }
    }

    public removeRigidBody(id: string): void {
        const body = this.rigidBodies.get(id);
        if (body) {
            this.rigidBodies.delete(id);
            this.emit('rigidBodyRemoved', body);
        }
    }

    public update(deltaTime: number): void {
        // Accumulate time for fixed timestep updates
        this.accumulator += deltaTime;

        // Perform fixed timestep updates
        while (this.accumulator >= this.fixedTimeStep) {
            this.fixedUpdate(this.fixedTimeStep);
            this.accumulator -= this.fixedTimeStep;
        }

        // Interpolate states for rendering
        const alpha = this.accumulator / this.fixedTimeStep;
        this.interpolateStates(alpha);

        this.emit('physicsUpdated');
    }

    private fixedUpdate(deltaTime: number): void {
        const substepDelta = deltaTime / this.config.substeps;

        for (let step = 0; step < this.config.substeps; step++) {
            // Update physics for each object
            for (const object of this.objects.values()) {
                if (!object.isStatic) {
                    this.updateObject(object, substepDelta);
                }
            }

            // Update physics for each rigid body
            for (const body of this.rigidBodies.values()) {
                if (!body.isStatic) {
                    this.updateRigidBody(body, substepDelta);
                }
            }

            // Handle collisions
            this.handleCollisions(substepDelta);
        }
    }

    private updateRigidBody(body: RigidBody, deltaTime: number): void {
        // Apply gravity
        if (!body.isStatic) {
            vec2.scaleAndAdd(body.force, body.force, this.config.gravity, body.mass);
        }

        // Update linear velocity
        const acceleration = vec2.create();
        vec2.scale(acceleration, body.force, 1 / body.mass);
        vec2.scaleAndAdd(body.velocity, body.velocity, acceleration, deltaTime);

        // Update angular velocity
        body.angularVelocity += (body.torque / body.inertia) * deltaTime;

        // Update position
        vec2.scaleAndAdd(body.position, body.position, body.velocity, deltaTime);

        // Update rotation
        body.rotation += body.angularVelocity * deltaTime;

        // Reset forces and torque
        vec2.zero(body.force);
        body.torque = 0;

        // Handle world bounds
        this.constrainRigidBodyToWorldBounds(body);
    }

    private updateObject(object: PhysicsObject, deltaTime: number): void {
        // Apply gravity
        if (!object.isStatic) {
            vec2.scaleAndAdd(object.acceleration, object.acceleration, this.config.gravity, 1);
        }

        // Apply air resistance
        const speed = vec2.length(object.velocity);
        if (speed > 0) {
            const dragForce = this.config.airResistance * speed * speed;
            const dragDirection = vec2.create();
            vec2.scale(dragDirection, object.velocity, -1 / speed);
            vec2.scaleAndAdd(object.acceleration, object.acceleration, dragDirection, dragForce / object.mass);
        }

        // Update velocity
        vec2.scaleAndAdd(object.velocity, object.velocity, object.acceleration, deltaTime);

        // Clamp velocity to maximum speed
        const currentSpeed = vec2.length(object.velocity);
        if (currentSpeed > this.config.maxVelocity) {
            vec2.scale(object.velocity, object.velocity, this.config.maxVelocity / currentSpeed);
        }

        // Update position
        vec2.scaleAndAdd(object.position, object.position, object.velocity, deltaTime);

        // Reset acceleration
        vec2.zero(object.acceleration);

        // Handle world bounds
        this.constrainToWorldBounds(object);
    }

    private handleCollisions(deltaTime: number): void {
        const objects = Array.from(this.objects.values());
        const rigidBodies = Array.from(this.rigidBodies.values());
        
        // Object-Object collisions
        for (let i = 0; i < objects.length; i++) {
            for (let j = i + 1; j < objects.length; j++) {
                const objA = objects[i];
                const objB = objects[j];

                if (objA.isStatic && objB.isStatic) continue;
                if ((objA.collisionMask & objB.collisionGroup) === 0 &&
                    (objB.collisionMask & objA.collisionGroup) === 0) continue;

                if (this.checkCollision(objA, objB)) {
                    this.resolveCollision(objA, objB);
                    this.emit('collision', { objectA: objA, objectB: objB });
                }
            }
        }

        // RigidBody-RigidBody collisions
        for (let i = 0; i < rigidBodies.length; i++) {
            for (let j = i + 1; j < rigidBodies.length; j++) {
                const bodyA = rigidBodies[i];
                const bodyB = rigidBodies[j];

                if (bodyA.isStatic && bodyB.isStatic) continue;
                if ((bodyA.collisionMask & bodyB.collisionGroup) === 0 &&
                    (bodyB.collisionMask & bodyA.collisionGroup) === 0) continue;

                if (this.checkRigidBodyCollision(bodyA, bodyB)) {
                    this.resolveRigidBodyCollision(bodyA, bodyB);
                    this.emit('rigidBodyCollision', { bodyA, bodyB });
                }
            }
        }
    }

    private checkRigidBodyCollision(bodyA: RigidBody, bodyB: RigidBody): boolean {
        return !(bodyA.boundingBox.max[0] < bodyB.boundingBox.min[0] ||
                bodyA.boundingBox.min[0] > bodyB.boundingBox.max[0] ||
                bodyA.boundingBox.max[1] < bodyB.boundingBox.min[1] ||
                bodyA.boundingBox.min[1] > bodyB.boundingBox.max[1]);
    }

    private resolveRigidBodyCollision(bodyA: RigidBody, bodyB: RigidBody): void {
        // Calculate collision normal
        const normal = vec2.create();
        vec2.subtract(normal, bodyB.position, bodyA.position);
        vec2.normalize(normal, normal);

        // Calculate relative velocity
        const relativeVelocity = vec2.create();
        vec2.subtract(relativeVelocity, bodyB.velocity, bodyA.velocity);

        // Calculate relative velocity along the normal
        const velocityAlongNormal = vec2.dot(relativeVelocity, normal);

        // Don't resolve if bodies are moving apart
        if (velocityAlongNormal > 0) return;

        const restitution = Math.min(bodyA.restitution, bodyB.restitution);

        // Calculate impulse scalar
        let j = -(1 + restitution) * velocityAlongNormal;
        j /= (1 / bodyA.mass) + (1 / bodyB.mass);

        // Apply impulse
        const impulse = vec2.create();
        vec2.scale(impulse, normal, j);
        if (!bodyA.isStatic) {
            vec2.scaleAndAdd(bodyA.velocity, bodyA.velocity, impulse, -1 / bodyA.mass);
            const crossVec = vec3.fromValues(normal[0], normal[1], 0);
            const impVec = vec3.fromValues(impulse[0], impulse[1], 0);
            const crossProduct = vec3.cross(vec3.create(), crossVec, impVec);
            bodyA.angularVelocity -= crossProduct[2] / bodyA.inertia;
        }
        if (!bodyB.isStatic) {
            vec2.scaleAndAdd(bodyB.velocity, bodyB.velocity, impulse, 1 / bodyB.mass);
            const crossVec = vec3.fromValues(normal[0], normal[1], 0);
            const impVec = vec3.fromValues(impulse[0], impulse[1], 0);
            const crossProduct = vec3.cross(vec3.create(), crossVec, impVec);
            bodyB.angularVelocity += crossProduct[2] / bodyB.inertia;
        }

        // Apply friction
        this.applyRigidBodyFriction(bodyA, bodyB, normal, j);
    }

    private applyRigidBodyFriction(bodyA: RigidBody, bodyB: RigidBody, normal: vec2, impulse: number): void {
        const relativeVelocity = vec2.create();
        vec2.subtract(relativeVelocity, bodyB.velocity, bodyA.velocity);

        const tangent = vec2.create();
        const dot = vec2.dot(relativeVelocity, normal);
        vec2.scale(tangent, normal, dot);
        vec2.subtract(tangent, relativeVelocity, tangent);
        vec2.normalize(tangent, tangent);

        const frictionImpulse = -vec2.dot(relativeVelocity, tangent) *
            Math.min(bodyA.friction, bodyB.friction) * impulse;

        if (!bodyA.isStatic) {
            vec2.scaleAndAdd(bodyA.velocity, bodyA.velocity, tangent, -frictionImpulse / bodyA.mass);
        }
        if (!bodyB.isStatic) {
            vec2.scaleAndAdd(bodyB.velocity, bodyB.velocity, tangent, frictionImpulse / bodyB.mass);
        }
    }

    private checkCollision(objA: PhysicsObject, objB: PhysicsObject): boolean {
        return !(objA.boundingBox.max[0] < objB.boundingBox.min[0] ||
                objA.boundingBox.min[0] > objB.boundingBox.max[0] ||
                objA.boundingBox.max[1] < objB.boundingBox.min[1] ||
                objA.boundingBox.min[1] > objB.boundingBox.max[1]);
    }

    private resolveCollision(objA: PhysicsObject, objB: PhysicsObject): void {
        // Calculate collision normal
        const normal = vec2.create();
        vec2.subtract(normal, objB.position, objA.position);
        vec2.normalize(normal, normal);

        // Calculate relative velocity
        const relativeVelocity = vec2.create();
        vec2.subtract(relativeVelocity, objB.velocity, objA.velocity);

        // Calculate relative velocity along the normal
        const velocityAlongNormal = vec2.dot(relativeVelocity, normal);

        // Don't resolve if objects are moving apart
        if (velocityAlongNormal > 0) return;

        // Calculate restitution (bounce)
        const restitution = Math.min(objA.restitution, objB.restitution);

        // Calculate impulse scalar
        let j = -(1 + restitution) * velocityAlongNormal;
        j /= (1 / objA.mass) + (1 / objB.mass);

        // Apply impulse
        const impulse = vec2.create();
        vec2.scale(impulse, normal, j);

        if (!objA.isStatic) {
            vec2.scaleAndAdd(objA.velocity, objA.velocity, impulse, -1 / objA.mass);
        }
        if (!objB.isStatic) {
            vec2.scaleAndAdd(objB.velocity, objB.velocity, impulse, 1 / objB.mass);
        }

        // Apply friction
        this.applyFriction(objA, objB, normal, j);
    }

    private applyFriction(objA: PhysicsObject, objB: PhysicsObject, normal: vec2, impulse: number): void {
        const relativeVelocity = vec2.create();
        vec2.subtract(relativeVelocity, objB.velocity, objA.velocity);

        // Calculate tangent vector
        const tangent = vec2.create();
        const dot = vec2.dot(relativeVelocity, normal);
        vec2.scale(tangent, normal, dot);
        vec2.subtract(tangent, relativeVelocity, tangent);
        vec2.normalize(tangent, tangent);

        // Calculate friction impulse
        const frictionImpulse = -vec2.dot(relativeVelocity, tangent) *
            Math.min(objA.friction, objB.friction) * impulse;

        // Apply friction impulse
        if (!objA.isStatic) {
            vec2.scaleAndAdd(objA.velocity, objA.velocity, tangent, -frictionImpulse / objA.mass);
        }
        if (!objB.isStatic) {
            vec2.scaleAndAdd(objB.velocity, objB.velocity, tangent, frictionImpulse / objB.mass);
        }
    }

    private constrainToWorldBounds(object: PhysicsObject): void {
        // X-axis bounds
        if (object.position[0] < this.config.worldBounds.min[0]) {
            object.position[0] = this.config.worldBounds.min[0];
            object.velocity[0] *= -object.restitution;
        } else if (object.position[0] > this.config.worldBounds.max[0]) {
            object.position[0] = this.config.worldBounds.max[0];
            object.velocity[0] *= -object.restitution;
        }

        // Y-axis bounds
        if (object.position[1] < this.config.worldBounds.min[1]) {
            object.position[1] = this.config.worldBounds.min[1];
            object.velocity[1] *= -object.restitution;
        } else if (object.position[1] > this.config.worldBounds.max[1]) {
            object.position[1] = this.config.worldBounds.max[1];
            object.velocity[1] *= -object.restitution;
        }
    }

    private constrainRigidBodyToWorldBounds(body: RigidBody): void {
        // X-axis bounds
        if (body.position[0] < this.config.worldBounds.min[0]) {
            body.position[0] = this.config.worldBounds.min[0];
            body.velocity[0] *= -body.restitution;
        } else if (body.position[0] > this.config.worldBounds.max[0]) {
            body.position[0] = this.config.worldBounds.max[0];
            body.velocity[0] *= -body.restitution;
        }

        // Y-axis bounds
        if (body.position[1] < this.config.worldBounds.min[1]) {
            body.position[1] = this.config.worldBounds.min[1];
            body.velocity[1] *= -body.restitution;
        } else if (body.position[1] > this.config.worldBounds.max[1]) {
            body.position[1] = this.config.worldBounds.max[1];
            body.velocity[1] *= -body.restitution;
        }
    }

    private interpolateStates(alpha: number): void {
        for (const object of this.objects.values()) {
            if (!object.isStatic) {
                this.emit('objectInterpolated', { object, alpha });
            }
        }

        for (const body of this.rigidBodies.values()) {
            if (!body.isStatic) {
                this.emit('rigidBodyInterpolated', { body, alpha });
            }
        }
    }

    public applyForce(objectId: string, force: vec2): void {
        const object = this.objects.get(objectId);
        if (object && !object.isStatic) {
            const acceleration = vec2.create();
            vec2.scale(acceleration, force, 1 / object.mass);
            vec2.add(object.acceleration, object.acceleration, acceleration);
        }

        const body = this.rigidBodies.get(objectId);
        if (body && !body.isStatic) {
            vec2.add(body.force, body.force, force);
        }
    }

    public applyTorque(bodyId: string, torque: number): void {
        const body = this.rigidBodies.get(bodyId);
        if (body && !body.isStatic) {
            body.torque += torque;
        }
    }

    public applyImpulse(objectId: string, impulse: vec2): void {
        const object = this.objects.get(objectId);
        if (object && !object.isStatic) {
            vec2.scaleAndAdd(object.velocity, object.velocity, impulse, 1 / object.mass);
        }

        const body = this.rigidBodies.get(objectId);
        if (body && !body.isStatic) {
            vec2.scaleAndAdd(body.velocity, body.velocity, impulse, 1 / body.mass);
        }
    }

    public setGravity(gravity: vec2): void {
        vec2.copy(this.config.gravity, gravity);
    }

    public getObject(id: string): PhysicsObject | undefined {
        return this.objects.get(id);
    }

    public getRigidBody(id: string): RigidBody | undefined {
        return this.rigidBodies.get(id);
    }

    public getAllObjects(): PhysicsObject[] {
        return Array.from(this.objects.values());
    }

    public getAllRigidBodies(): RigidBody[] {
        return Array.from(this.rigidBodies.values());
    }

    public getConfig(): PhysicsConfig {
        return { ...this.config };
    }

    public setConfig(config: Partial<PhysicsConfig>): void {
        this.config = { ...this.config, ...config };
    }
}