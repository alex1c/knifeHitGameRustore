/**
 * Skia renderer for Precision Throw.
 * Target rotation samples the same compiled timeline as collision:
 *   elapsed = paused ? frozenElapsed : clock - roundStartClock
 *   angle = sampleCompiledTimeline(...)
 */

import { useMemo } from 'react'
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

import {
	compileLevelTimeline,
	sampleCompiledTimeline,
} from '../game/engine'
import type { AttachedProjectile, LevelConfig } from '../game/models'
import { colors } from '../theme'

interface GameCanvasProps {
	level: LevelConfig
	attachedProjectiles: AttachedProjectile[]
	clock: SharedValue<number>
	roundStartClock: SharedValue<number>
	/** 1 while app background pause is active. */
	isPaused: SharedValue<number>
	frozenElapsedMs: SharedValue<number>
	flightProgress: SharedValue<number>
	showReadyProjectile: boolean
	showFlyingProjectile: boolean
	collisionLocalAngle: number | null
	collisionFlashVisible: boolean
}

export function GameCanvas ({
	level,
	attachedProjectiles,
	clock,
	roundStartClock,
	isPaused,
	frozenElapsedMs,
	flightProgress,
	showReadyProjectile,
	showFlyingProjectile,
	collisionLocalAngle,
	collisionFlashVisible,
}: GameCanvasProps) {
	const { width } = useWindowDimensions()
	const compiled = useMemo(() => compileLevelTimeline(level), [level])

	const size = Math.min(width - 32, 360)
	const canvasHeight = size * 1.35
	const center = size / 2
	const targetRadius = size * 0.32
	const projectileLength = size * 0.14
	const projectileWidth = size * 0.045
	const restY = size * 1.12
	const impactY = center + targetRadius - 4

	const {
		cycleDurationMs,
		anglePerCycle,
		segmentCount,
		durations,
		startSpeeds,
		endSpeeds,
		angleBeforeSegment,
	} = compiled

	const targetTransform = useDerivedValue(() => {
		'worklet'
		const elapsedMs =
			isPaused.value === 1
				? frozenElapsedMs.value
				: clock.value - roundStartClock.value
		const sample = sampleCompiledTimeline(
			elapsedMs,
			cycleDurationMs,
			anglePerCycle,
			segmentCount,
			durations,
			startSpeeds,
			endSpeeds,
			angleBeforeSegment,
		)
		return [{ rotate: (sample.angle * Math.PI) / 180 }]
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
