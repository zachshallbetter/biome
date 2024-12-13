import { vec2 } from 'gl-matrix';
import { PhysicsObject } from './PhysicsEngine';

export interface CollisionManifold {
    objectA: PhysicsObject;
    objectB: PhysicsObject;
    normal: vec2;
    penetrationDepth: number;
    contactPoint: vec2;
}

export class CollisionHandler {
    private static readonly SLOP = 0.01; // Penetration allowance
    private static readonly PERCENT = 0.2; // Penetration percentage to correct

    public detectCollisions(objects: PhysicsObject[]): CollisionManifold[] {
        const manifolds: CollisionManifold[] = [];

        for (let i = 0; i < objects.length; i++) {
            for (let j = i + 1; j < objects.length; j++) {
                const objA = objects[i];
                const objB = objects[j];

                // Skip if both objects are static
                if (objA.isStatic && objB.isStatic) continue;

                // Skip if objects are in different collision groups
                if ((objA.collisionMask & objB.collisionGroup) === 0 &&
                    (objB.collisionMask & objA.collisionGroup) === 0) continue;

                const manifold = this.checkCollision(objA, objB);
                if (manifold) {
                    manifolds.push(manifold);
                }
            }
        }

        return manifolds;
    }

    private checkCollision(objA: PhysicsObject, objB: PhysicsObject): CollisionManifold | null {
        // Check AABB overlap
        if (!this.checkAABBOverlap(objA, objB)) {
            return null;
        }

        // Calculate collision normal and penetration depth
        const normal = vec2.create();
        vec2.subtract(normal, objB.position, objA.position);
        const distance = vec2.length(normal);

        if (distance === 0) {
            // Objects are at the same position, use arbitrary normal
            vec2.set(normal, 1, 0);
        } else {
            vec2.scale(normal, normal, 1 / distance);
        }

        // Calculate overlap extents
        const overlapX = this.calculateOverlap(
            objA.boundingBox.min[0], objA.boundingBox.max[0],
            objB.boundingBox.min[0], objB.boundingBox.max[0]
        );

        const overlapY = this.calculateOverlap(
            objA.boundingBox.min[1], objA.boundingBox.max[1],
            objB.boundingBox.min[1], objB.boundingBox.max[1]
        );

        if (overlapX <= 0 || overlapY <= 0) {
            return null;
        }

        // Use the smallest overlap as penetration depth
        const penetrationDepth = Math.min(overlapX, overlapY);

        // Calculate contact point (center of overlap region)
        const contactPoint = vec2.create();
        vec2.add(contactPoint, objA.position, objB.position);
        vec2.scale(contactPoint, contactPoint, 0.5);

        return {
            objectA: objA,
            objectB: objB,
            normal,
            penetrationDepth,
            contactPoint
        };
    }

    private checkAABBOverlap(objA: PhysicsObject, objB: PhysicsObject): boolean {
        return !(objA.boundingBox.max[0] < objB.boundingBox.min[0] ||
                objA.boundingBox.min[0] > objB.boundingBox.max[0] ||
                objA.boundingBox.max[1] < objB.boundingBox.min[1] ||
                objA.boundingBox.min[1] > objB.boundingBox.max[1]);
    }

    private calculateOverlap(minA: number, maxA: number, minB: number, maxB: number): number {
        return Math.min(maxA, maxB) - Math.max(minA, minB);
    }

    public resolveCollisions(manifolds: CollisionManifold[]): void {
        // Resolve collisions using iterative impulse resolution
        const iterations = 10;
        for (let i = 0; i < iterations; i++) {
            for (const manifold of manifolds) {
                this.resolveCollision(manifold);
            }
        }

        // Apply position correction to prevent sinking
        for (const manifold of manifolds) {
            this.correctPosition(manifold);
        }
    }

    private resolveCollision(manifold: CollisionManifold): void {
        const { objectA, objectB, normal } = manifold;

        // Calculate relative velocity
        const relativeVelocity = vec2.create();
        vec2.subtract(relativeVelocity, objectB.velocity, objectA.velocity);

        // Calculate relative velocity along the normal
        const normalVelocity = vec2.dot(relativeVelocity, normal);

        // Don't resolve if objects are moving apart
        if (normalVelocity > 0) return;

        // Calculate restitution (bounce)
        const restitution = Math.min(objectA.restitution, objectB.restitution);

        // Calculate impulse scalar
        let j = -(1 + restitution) * normalVelocity;
        j /= (1 / objectA.mass) + (1 / objectB.mass);

        // Apply impulse
        const impulse = vec2.create();
        vec2.scale(impulse, normal, j);

        if (!objectA.isStatic) {
            vec2.scaleAndAdd(objectA.velocity, objectA.velocity, impulse, -1 / objectA.mass);
        }
        if (!objectB.isStatic) {
            vec2.scaleAndAdd(objectB.velocity, objectB.velocity, impulse, 1 / objectB.mass);
        }

        // Apply friction
        this.applyFriction(manifold, j);
    }

    private applyFriction(manifold: CollisionManifold, normalImpulse: number): void {
        const { objectA, objectB, normal } = manifold;

        // Calculate relative velocity
        const relativeVelocity = vec2.create();
        vec2.subtract(relativeVelocity, objectB.velocity, objectA.velocity);

        // Calculate tangent vector
        const tangent = vec2.create();
        const dot = vec2.dot(relativeVelocity, normal);
        vec2.scale(tangent, normal, dot);
        vec2.subtract(tangent, relativeVelocity, tangent);

        // Check if there's any tangential velocity
        const tangentLength = vec2.length(tangent);
        if (tangentLength > 0) {
            vec2.scale(tangent, tangent, 1 / tangentLength);

            // Calculate friction impulse magnitude
            const friction = Math.min(objectA.friction, objectB.friction);
            const j = -vec2.dot(relativeVelocity, tangent);
            const frictionImpulse = Math.max(Math.min(j * friction, Math.abs(normalImpulse)), -Math.abs(normalImpulse));

            // Apply friction impulse
            if (!objectA.isStatic) {
                vec2.scaleAndAdd(objectA.velocity, objectA.velocity, tangent, -frictionImpulse / objectA.mass);
            }
            if (!objectB.isStatic) {
                vec2.scaleAndAdd(objectB.velocity, objectB.velocity, tangent, frictionImpulse / objectB.mass);
            }
        }
    }

    private correctPosition(manifold: CollisionManifold): void {
        const { objectA, objectB, normal, penetrationDepth } = manifold;

        // Calculate correction vector
        const correction = vec2.create();
        const correctionMagnitude = Math.max(
            penetrationDepth - CollisionHandler.SLOP,
            0
        ) * CollisionHandler.PERCENT;

        vec2.scale(correction, normal, correctionMagnitude);

        // Apply correction based on mass ratio
        if (!objectA.isStatic) {
            vec2.scaleAndAdd(objectA.position, objectA.position, correction, -1 / objectA.mass);
        }
        if (!objectB.isStatic) {
            vec2.scaleAndAdd(objectB.position, objectB.position, correction, 1 / objectB.mass);
        }
    }
}