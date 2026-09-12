/**
 * Skia renderer — polished target/projectile themes + lightweight FX.
 * Target rotation samples the authoritative compiled timeline.
 * Particles/pulses are driven by shared values (no React state per frame).
 */

import { useMemo } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import {
	Canvas,
	Circle,
	Group,
	Line,
	Path,
	RoundedRect,
	Skia,
	vec,
} from '@shopify/react-native-skia'
import {
	useDerivedValue,
	type SharedValue,
} from 'react-native-reanimated'

import type { ProjectileTheme, TargetTheme } from '../appearance/themes'
import {
	compileLevelTimeline,
	sampleCompiledTimeline,
} from '../game/engine'
import type { AttachedProjectile, LevelConfig } from '../game/models'
import type { FxKind } from '../hooks/useGameController'
import { colors } from '../theme'

interface GameCanvasProps {
	level: LevelConfig
	attachedProjectiles: AttachedProjectile[]
	clock: SharedValue<number>
	roundStartClock: SharedValue<number>
	isPaused: SharedValue<number>
	frozenElapsedMs: SharedValue<number>
	flightProgress: SharedValue<number>
	fxProgress: SharedValue<number>
	fxKind: FxKind
	fxLocalAngle: number | null
	projectileTheme: ProjectileTheme
	targetTheme: TargetTheme
	showReadyProjectile: boolean
	showFlyingProjectile: boolean
	collisionFlashVisible: boolean
}

const PARTICLE_COUNT = 8

function makeProjectilePath (
	width: number,
	length: number,
	silhouette: ProjectileTheme['silhouette'],
) {
	const tip = Skia.Path.Make()
	const half = width / 2
	if (silhouette === 'pin') {
		tip.moveTo(0, 0)
		tip.lineTo(half * 0.7, length * 0.35)
		tip.lineTo(half * 0.45, length)
		tip.lineTo(-half * 0.45, length)
		tip.lineTo(-half * 0.7, length * 0.35)
		tip.close()
	} else if (silhouette === 'dart') {
		tip.moveTo(0, 0)
		tip.lineTo(half, length * 0.4)
		tip.lineTo(half * 0.55, length)
		tip.lineTo(-half * 0.55, length)
		tip.lineTo(-half, length * 0.4)
		tip.close()
	} else {
		tip.moveTo(0, 0)
		tip.lineTo(half, length * 0.55)
		tip.lineTo(half * 0.35, length)
		tip.lineTo(-half * 0.35, length)
		tip.lineTo(-half, length * 0.55)
		tip.close()
	}
	return tip
}

export function GameCanvas ({
	level,
	attachedProjectiles,
	clock,
	roundStartClock,
	isPaused,
	frozenElapsedMs,
	flightProgress,
	fxProgress,
	fxKind,
	fxLocalAngle,
	projectileTheme,
	targetTheme,
	showReadyProjectile,
	showFlyingProjectile,
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

	const projectilePath = useMemo(
		() =>
			makeProjectilePath(
				projectileWidth,
				projectileLength,
				projectileTheme.silhouette,
			),
		[projectileLength, projectileTheme.silhouette, projectileWidth],
	)

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
		const pulse =
			fxKind === 'none'
				? 1
				: 1 +
					Math.sin(Math.min(1, fxProgress.value) * Math.PI) *
						(fxKind === 'win' ? 0.08 : 0.045)
		return [
			{ scale: pulse },
			{ rotate: (sample.angle * Math.PI) / 180 },
		]
	})

	const flyingTransform = useDerivedValue(() => {
		'worklet'
		const y = restY + (impactY - restY) * flightProgress.value
		return [{ translateX: center }, { translateY: y }]
	})

	const impactRingRadius = useDerivedValue(() => {
		'worklet'
		if (fxKind === 'none') {
			return 0
		}
		return 8 + fxProgress.value * (fxKind === 'win' ? 42 : 28)
	})

	const impactRingOpacity = useDerivedValue(() => {
		'worklet'
		if (fxKind === 'none') {
			return 0
		}
		return Math.max(0, 1 - fxProgress.value)
	})

	const outerShake = collisionFlashVisible
		? ([{ translateX: 6 }] as const)
		: ([{ translateX: 0 }] as const)

	const fxWorld = useMemo(() => {
		if (fxLocalAngle === null) {
			return { x: center, y: center + targetRadius }
		}
		const theta = (fxLocalAngle * Math.PI) / 180
		return {
			x: center + targetRadius * Math.sin(theta),
			y: center - targetRadius * Math.cos(theta),
		}
	}, [center, fxLocalAngle, targetRadius])

	const particleAngles = useMemo(
		() =>
			Array.from(
				{ length: PARTICLE_COUNT },
				(_, i) => (i / PARTICLE_COUNT) * Math.PI * 2,
			),
		[],
	)

	return (
		<View style={[styles.wrap, { width: size, height: canvasHeight }]}>
			<Canvas style={{ width: size, height: canvasHeight }}>
				<Group transform={[...outerShake]}>
					<Group origin={vec(center, center)} transform={targetTransform}>
						<Circle
							cx={center}
							cy={center}
							r={targetRadius + 14}
							color={targetTheme.accent}
							opacity={0.12}
						/>
						<Circle
							cx={center}
							cy={center}
							r={targetRadius}
							color={targetTheme.core}
						/>
						<Circle
							cx={center}
							cy={center}
							r={targetRadius * 0.62}
							color={targetTheme.mark}
							style="stroke"
							strokeWidth={2}
							opacity={0.35}
						/>
						<Circle
							cx={center}
							cy={center}
							r={targetRadius * 0.28}
							color={targetTheme.accent}
							opacity={0.55}
						/>
						<Circle
							cx={center}
							cy={center}
							r={targetRadius}
							color={targetTheme.ring}
							style="stroke"
							strokeWidth={10}
						/>
						{[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
							const rad = (deg * Math.PI) / 180
							const inner = targetRadius - 18
							const outer = targetRadius - 6
							return (
								<Line
									key={`tick-${deg}`}
									p1={vec(
										center + inner * Math.sin(rad),
										center - inner * Math.cos(rad),
									)}
									p2={vec(
										center + outer * Math.sin(rad),
										center - outer * Math.cos(rad),
									)}
									color={targetTheme.mark}
									strokeWidth={deg % 90 === 0 ? 3 : 1.5}
									opacity={deg % 90 === 0 ? 0.9 : 0.45}
								/>
							)
						})}

						{attachedProjectiles.map((projectile) => {
							const theta = (projectile.angle * Math.PI) / 180
							const x = center + targetRadius * Math.sin(theta)
							const y = center - targetRadius * Math.cos(theta)
							const isObstacle = projectile.id.startsWith('obstacle')
							return (
								<Group
									key={projectile.id}
									origin={vec(x, y)}
									transform={[{ rotate: theta }]}
								>
									<Group transform={[{ translateX: x, translateY: y }]}>
										<Path
											path={projectilePath}
											color={
												isObstacle ? colors.obstacle : projectileTheme.fill
											}
										/>
										<RoundedRect
											x={-projectileWidth * 0.22}
											y={projectileLength * 0.45}
											width={projectileWidth * 0.44}
											height={projectileLength * 0.2}
											r={2}
											color={projectileTheme.accent}
											opacity={0.7}
										/>
									</Group>
								</Group>
							)
						})}

						{collisionFlashVisible && fxLocalAngle !== null ? (
							<CollisionMarker
								center={center}
								targetRadius={targetRadius}
								localAngle={fxLocalAngle}
								projectileWidth={projectileWidth}
								projectileLength={projectileLength}
							/>
						) : null}

						{fxKind !== 'none' ? (
							<>
								<Circle
									cx={fxWorld.x}
									cy={fxWorld.y}
									r={impactRingRadius}
									color={
										fxKind === 'collision'
											? colors.danger
											: projectileTheme.accent
									}
									style="stroke"
									strokeWidth={3}
									opacity={impactRingOpacity}
								/>
								{particleAngles.map((angle, index) => (
									<FxParticle
										key={`p-${index}`}
										originX={fxWorld.x}
										originY={fxWorld.y}
										angle={angle}
										progress={fxProgress}
										kind={fxKind}
										color={
											fxKind === 'collision'
												? colors.danger
												: index % 2 === 0
													? projectileTheme.fill
													: projectileTheme.accent
										}
									/>
								))}
							</>
						) : null}
					</Group>
				</Group>

				{showFlyingProjectile ? (
					<Group transform={flyingTransform}>
						<Path path={projectilePath} color={projectileTheme.fill} />
						<RoundedRect
							x={-projectileWidth * 0.22}
							y={projectileLength * 0.45}
							width={projectileWidth * 0.44}
							height={projectileLength * 0.2}
							r={2}
							color={projectileTheme.accent}
							opacity={0.7}
						/>
					</Group>
				) : null}

				{showReadyProjectile ? (
					<Group transform={[{ translateX: center, translateY: restY }]}>
						<Path path={projectilePath} color={projectileTheme.fill} />
						<RoundedRect
							x={-projectileWidth * 0.22}
							y={projectileLength * 0.45}
							width={projectileWidth * 0.44}
							height={projectileLength * 0.2}
							r={2}
							color={projectileTheme.accent}
							opacity={0.7}
						/>
					</Group>
				) : null}

				<Line
					p1={vec(center, center + targetRadius + 12)}
					p2={vec(center, restY)}
					color={colors.border}
					strokeWidth={2}
					opacity={0.7}
				/>
			</Canvas>
		</View>
	)
}

interface FxParticleProps {
	originX: number
	originY: number
	angle: number
	progress: SharedValue<number>
	kind: FxKind
	color: string
}

function FxParticle ({
	originX,
	originY,
	angle,
	progress,
	kind,
	color,
}: FxParticleProps) {
	const transform = useDerivedValue(() => {
		'worklet'
		const dist = (kind === 'win' ? 36 : 24) * progress.value
		return [
			{ translateX: originX + Math.cos(angle) * dist },
			{ translateY: originY + Math.sin(angle) * dist },
			{ scale: Math.max(0.15, 1 - progress.value) },
		]
	})
	const opacity = useDerivedValue(() => {
		'worklet'
		return Math.max(0, 1 - progress.value)
	})
	return (
		<Group transform={transform} opacity={opacity}>
			<Circle cx={0} cy={0} r={kind === 'collision' ? 3.5 : 2.8} color={color} />
		</Group>
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
			<Circle cx={x} cy={y} r={projectileWidth * 1.2} color={colors.danger} />
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
