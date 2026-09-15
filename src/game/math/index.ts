export {
	normalizeAngle,
	shortestAngularDistance,
	isAngularCollision,
	hasAngularCollisionWithAny,
	worldAngleToLocalAngle,
	localAngleToWorldAngle,
	WORLD_IMPACT_ANGLE_DEGREES,
} from './angles'

export {
	LOGICAL_TARGET_RADIUS,
	LOGICAL_PROJECTILE_WIDTH,
	LOGICAL_PROJECTILE_LENGTH,
	LOGICAL_PENETRATION,
	COLLISION_PADDING_DEGREES,
	attachedProjectilePose,
	attachedRadialEndpoints,
	computeMinAngularSeparationDegrees,
	computePlayfieldLayout,
	distanceFromCenter,
	handleEndRadiusFromCenter,
	logicalPenetration,
	logicalProjectileLength,
	logicalProjectileWidth,
	tipRadiusFromCenter,
} from './projectileGeometry'
