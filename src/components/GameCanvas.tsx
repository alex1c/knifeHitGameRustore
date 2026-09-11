/**
 * Skia renderer for Precision Throw.
 * Target rotation comes from the same elapsed-time formula as collision:
 *   elapsed = clock - roundStartClock
 *   angle = signedSpeed * elapsed / 1000
 * No independent visual clock.
 */

import { StyleSheet, useWindowDimensions, View } from 'react-native'
import {
	Canvas,
	Circle,
	Group,
	Line,
	RoundedRect,
	vec,
} from '@shopify/react-native-skia'
import {
	useDerivedValue,
	type SharedValue,
} from 'react-native-reanimated'

import { signedAngularSpeedDegreesPerSecond } from '../game/engine'
import type { AttachedProjectile, LevelConfig } from '../game/models'
import { colors } from '../theme'

interface GameCanvasProps {
	level: LevelConfig
	attachedProjectiles: AttachedProjectile[]
	clock: SharedValue<number>
	roundStartClock: SharedValue<number>
	flightProgress: SharedValue<number>
	/** When true, draw the resting projectile at the bottom. */
	showReadyProjectile: boolean
	/** When true, draw the vertically animated flying projectile. */
	showFlyingProjectile: boolean
	/** Local-angle flash marker after a collision (degrees), or null. */
	collisionLocalAngle: number | null
	collisionFlashVisible: boolean
}

export function GameCanvas ({
	level,
	attachedProjectiles,
	clock,
	roundStartClock,
	flightProgress,
	showReadyProjectile,
	showFlyingProjectile,
	collisionLocalAngle,
	collisionFlashVisible,
}: GameCanvasProps) {
	const { width } = useWindowDimensions()

	const size = Math.min(width - 32, 360)
	const canvasHeight = size * 1.35
	const center = size / 2
	const targetRadius = size * 0.32
	const projectileLength = size * 0.14
	const projectileWidth = size * 0.045
	const restY = size * 1.12
	const impactY = center + targetRadius - 4

	const signedSpeed = signedAngularSpeedDegreesPerSecond(level)

	const targetTransform = useDerivedValue(() => {
		'worklet'
		const elapsedMs = clock.value - roundStartClock.value
		const radians = ((elapsedMs / 1000) * signedSpeed * Math.PI) / 180
		return [{ rotate: radians }]
	})

	const flyingY = useDerivedValue(() => {
		'worklet'
		return restY + (impactY - restY) * flightProgress.value
	})

	const outerShake = collisionFlashVisible
		? ([{ translateX: 4 }] as const)
		: ([{ translateX: 0 }] as const)

	return (
		<View style={[styles.wrap, { width: size, height: canvasHeight }]}>
			<Canvas style={{ width: size, height: canvasHeight }}>
				<Group transform={[...outerShake]}>
					{/* Central rotating target + local-space attachments */}
					<Group origin={vec(center, center)} transform={targetTransform}>
						<Circle
							cx={center}
							cy={center}
							r={targetRadius}
							color={colors.targetCore}
						/>
						<Circle
							cx={center}
							cy={center}
							r={targetRadius}
							color={colors.targetRing}
							style="stroke"
							strokeWidth={10}
						/>
						<Line
							p1={vec(center, center - targetRadius + 8)}
							p2={vec(center, center - targetRadius + 28)}
							color={colors.accent}
							strokeWidth={3}
						/>
						<Line
							p1={vec(center + targetRadius - 8, center)}
							p2={vec(center + targetRadius - 28, center)}
							color={colors.accent}
							strokeWidth={3}
						/>
						{attachedProjectiles.map((projectile) => {
							const theta = (projectile.angle * Math.PI) / 180
							const x = center + targetRadius * Math.sin(theta)
							const y = center - targetRadius * Math.cos(theta)
							return (
								<Group
									key={projectile.id}
									origin={vec(x, y)}
									transform={[{ rotate: theta }]}
								>
									<RoundedRect
										x={x - projectileWidth / 2}
										y={y - 4}
										width={projectileWidth}
										height={projectileLength}
										r={4}
										color={
											projectile.id.startsWith('obstacle')
												? colors.obstacle
												: colors.projectile
										}
									/>
								</Group>
							)
						})}
						{collisionFlashVisible && collisionLocalAngle !== null ? (
							<CollisionMarker
								center={center}
								targetRadius={targetRadius}
								localAngle={collisionLocalAngle}
								projectileWidth={projectileWidth}
								projectileLength={projectileLength}
							/>
						) : null}
					</Group>
				</Group>

				{/* Flying projectile — world space, vertical only */}
				{showFlyingProjectile ? (
					<RoundedRect
						x={center - projectileWidth / 2}
						y={flyingY}
						width={projectileWidth}
						height={projectileLength}
						r={4}
						color={colors.projectile}
					/>
				) : null}

				{/* Ready projectile at rest */}
				{showReadyProjectile ? (
					<RoundedRect
						x={center - projectileWidth / 2}
						y={restY}
						width={projectileWidth}
						height={projectileLength}
						r={4}
						color={colors.projectile}
					/>
				) : null}

				<Line
					p1={vec(center, center + targetRadius + 12)}
					p2={vec(center, restY)}
					color={colors.border}
					strokeWidth={2}
				/>
			</Canvas>
		</View>
	)
}

interface CollisionMarkerProps {
	center: number
	targetRadius: number
	localAngle: number
	projectileWidth: number
	projectileLength: number
}

function CollisionMarker ({
	center,
	targetRadius,
	localAngle,
	projectileWidth,
	projectileLength,
}: CollisionMarkerProps) {
	const theta = (localAngle * Math.PI) / 180
	const x = center + targetRadius * Math.sin(theta)
	const y = center - targetRadius * Math.cos(theta)

	return (
		<Group origin={vec(x, y)} transform={[{ rotate: theta }]}>
			<Circle cx={x} cy={y} r={projectileWidth * 1.1} color={colors.danger} />
			<RoundedRect
				x={x - projectileWidth / 2}
				y={y - 4}
				width={projectileWidth}
				height={projectileLength}
				r={4}
				color={colors.danger}
			/>
		</Group>
	)
}

const styles = StyleSheet.create({
	wrap: {
		alignSelf: 'center',
	},
})
