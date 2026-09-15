/**
 * Skia renderer — target / projectile themes + lightweight FX.
 *
 * Geometry comes from projectileGeometry.ts via a uniform playfield scale.
 * Attached projectiles live in LOCAL target space; the target group rotates them.
 */

import { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
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
	computeMinAngularSeparationDegrees,
	sampleCompiledTimeline,
} from '../game/engine'
import {
	attachedProjectilePose,
	computePlayfieldLayout,
	tipRadiusFromCenter,
} from '../game/math/projectileGeometry'
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
	/** Available stage box — canvas scales to fit target + handles. */
	availableWidth: number
	availableHeight: number
}

const PARTICLE_COUNT = 8

/**
 * Tip at (0, 0), handle extends toward +Y.
 * All themes share the same width/length envelope for fair collision.
 */
function makeProjectilePath (
	width: number,
	length: number,
	silhouette: ProjectileTheme['silhouette'],
) {
	const tip = Skia.Path.Make()
	const half = width / 2
	if (silhouette === 'pin') {
		tip.moveTo(0, 0)
		tip.lineTo(half * 0.55, length * 0.28)
		tip.lineTo(half * 0.45, length)
		tip.lineTo(-half * 0.45, length)
		tip.lineTo(-half * 0.55, length * 0.28)
		tip.close()
	} else if (silhouette === 'dart') {
		tip.moveTo(0, 0)
		tip.lineTo(half * 0.85, length * 0.32)
		tip.lineTo(half * 0.55, length)
		tip.lineTo(-half * 0.55, length)
		tip.lineTo(-half * 0.85, length * 0.32)
		tip.close()
	} else {
		tip.moveTo(0, 0)
		tip.lineTo(half * 0.9, length * 0.4)
		tip.lineTo(half * 0.35, length)
		tip.lineTo(-half * 0.35, length)
		tip.lineTo(-half * 0.9, length * 0.4)
		tip.close()
	}
	return tip
}

function ProjectileShape ({
	path,
	width,
	length,
	fill,
	accent,
}: {
	path: ReturnType<typeof makeProjectilePath>
	width: number
	length: number
	fill: string
	accent: string
}) {
	return (
		<>
			<Path path={path} color={fill} />
			<RoundedRect
				x={-width * 0.22}
				y={length * 0.45}
				width={width * 0.44}
				height={length * 0.2}
				r={2}
				color={accent}
				opacity={0.7}
			/>
		</>
	)
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
	availableWidth,
	availableHeight,
}: GameCanvasProps) {
	const compiled = useMemo(() => compileLevelTimeline(level), [level])

	const layout = useMemo(
		() =>
			computePlayfieldLayout(
				availableWidth,
				availableHeight,
				level.targetRadius,
			),
		[availableHeight, availableWidth, level.targetRadius],
	)

	const {
		canvasWidth,
		canvasHeight,
		centerX,
		centerY,
		targetRadius,
		projectileWidth,
		projectileLength,
		restTipY,
		impactTipY,
	} = layout

	const projectilePath = useMemo(
		() =>
			makeProjectilePath(
				projectileWidth,
				projectileLength,
				projectileTheme.silhouette,
			),
		[projectileLength, projectileTheme.silhouette, projectileWidth],
	)

	const minSeparation = useMemo(
		() => computeMinAngularSeparationDegrees(level),
		[level],
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
		const y = restTipY + (impactTipY - restTipY) * flightProgress.value
		return [{ translateX: centerX }, { translateY: y }]
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
			return {
				x: centerX,
				y: centerY + tipRadiusFromCenter(targetRadius),
			}
		}
		const pose = attachedProjectilePose(
			centerX,
			centerY,
			targetRadius,
			fxLocalAngle,
		)
		return { x: pose.tipX, y: pose.tipY }
	}, [centerX, centerY, fxLocalAngle, targetRadius])

	const particleAngles = useMemo(
		() =>
			Array.from(
				{ length: PARTICLE_COUNT },
				(_, i) => (i / PARTICLE_COUNT) * Math.PI * 2,
			),
		[],
	)

	return (
		<View
			style={[styles.wrap, { width: canvasWidth, height: canvasHeight }]}
			// Avoid parent View clipping handles during rotation.
			collapsable={false}
		>
			<Canvas
				style={{ width: canvasWidth, height: canvasHeight }}
				// Skia canvas must cover the full handle extent; no clipRect.
			>
				<Group transform={[...outerShake]}>
					<Group
						origin={vec(centerX, centerY)}
						transform={targetTransform}
					>
						<Circle
							cx={centerX}
							cy={centerY}
							r={targetRadius + projectileWidth * 0.9}
							color={targetTheme.accent}
							opacity={0.12}
						/>
						<Circle
							cx={centerX}
							cy={centerY}
							r={targetRadius}
							color={targetTheme.core}
						/>
						<Circle
							cx={centerX}
							cy={centerY}
							r={targetRadius * 0.62}
							color={targetTheme.mark}
							style="stroke"
							strokeWidth={2}
							opacity={0.35}
						/>
						<Circle
							cx={centerX}
							cy={centerY}
							r={targetRadius * 0.28}
							color={targetTheme.accent}
							opacity={0.55}
						/>
						<Circle
							cx={centerX}
							cy={centerY}
							r={targetRadius}
							color={targetTheme.ring}
							style="stroke"
							strokeWidth={Math.max(6, projectileWidth * 0.55)}
						/>
						{[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
							const rad = (deg * Math.PI) / 180
							const inner = targetRadius - projectileWidth * 1.2
							const outer = targetRadius - projectileWidth * 0.35
							return (
								<Line
									key={`tick-${deg}`}
									p1={vec(
										centerX + inner * Math.sin(rad),
										centerY - inner * Math.cos(rad),
									)}
									p2={vec(
										centerX + outer * Math.sin(rad),
										centerY - outer * Math.cos(rad),
									)}
									color={targetTheme.mark}
									strokeWidth={deg % 90 === 0 ? 3 : 1.5}
									opacity={deg % 90 === 0 ? 0.9 : 0.45}
								/>
							)
						})}

						{__DEV__ ? (
							<GeometryDebugOverlay
								centerX={centerX}
								centerY={centerY}
								targetRadius={targetRadius}
								attachedProjectiles={attachedProjectiles}
								minSeparationDegrees={minSeparation}
								candidateAngle={fxLocalAngle}
							/>
						) : null}

						{attachedProjectiles.map((projectile) => {
							const pose = attachedProjectilePose(
								centerX,
								centerY,
								targetRadius,
								projectile.angle,
							)
							const isObstacle = projectile.id.startsWith('obstacle')
							return (
								<Group
									key={projectile.id}
									transform={[
										{ translateX: pose.tipX },
										{ translateY: pose.tipY },
										{ rotate: pose.rotationRadians },
									]}
								>
									<ProjectileShape
										path={projectilePath}
										width={projectileWidth}
										length={projectileLength}
										fill={
											isObstacle
												? colors.obstacle
												: projectileTheme.fill
										}
										accent={projectileTheme.accent}
									/>
								</Group>
							)
						})}

						{collisionFlashVisible && fxLocalAngle !== null ? (
							<CollisionMarker
								centerX={centerX}
								centerY={centerY}
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
						<ProjectileShape
							path={projectilePath}
							width={projectileWidth}
							length={projectileLength}
							fill={projectileTheme.fill}
							accent={projectileTheme.accent}
						/>
					</Group>
				) : null}

				{showReadyProjectile ? (
					<Group
						transform={[
							{ translateX: centerX },
							{ translateY: restTipY },
						]}
					>
						<ProjectileShape
							path={projectilePath}
							width={projectileWidth}
							length={projectileLength}
							fill={projectileTheme.fill}
							accent={projectileTheme.accent}
						/>
					</Group>
				) : null}

				<Line
					p1={vec(centerX, centerY + targetRadius + 8)}
					p2={vec(centerX, restTipY)}
					color={colors.border}
					strokeWidth={2}
					opacity={0.7}
				/>
			</Canvas>
		</View>
	)
}

interface GeometryDebugOverlayProps {
	centerX: number
	centerY: number
	targetRadius: number
	attachedProjectiles: AttachedProjectile[]
	minSeparationDegrees: number
	candidateAngle: number | null
}

/**
 * __DEV__-only collision / attachment overlay for real-device QA.
 */
function GeometryDebugOverlay ({
	centerX,
	centerY,
	targetRadius,
	attachedProjectiles,
	minSeparationDegrees,
	candidateAngle,
}: GeometryDebugOverlayProps) {
	const half = minSeparationDegrees / 2
	const inner = targetRadius * 0.92
	const outer = targetRadius * 1.08

	const sectors = attachedProjectiles.map((projectile) => {
		const mid = projectile.angle
		return { id: projectile.id, mid }
	})

	if (candidateAngle !== null) {
		sectors.push({ id: 'candidate', mid: candidateAngle })
	}

	return (
		<>
			{sectors.map((sector) => {
				const left = ((sector.mid - half) * Math.PI) / 180
				const right = ((sector.mid + half) * Math.PI) / 180
				const mid = (sector.mid * Math.PI) / 180
				const isCandidate = sector.id === 'candidate'
				const color = isCandidate ? '#FF6B6B' : '#5EEAD4'
				return (
					<Group key={`dbg-${sector.id}`} opacity={isCandidate ? 0.85 : 0.45}>
						<Line
							p1={vec(
								centerX + inner * Math.sin(left),
								centerY - inner * Math.cos(left),
							)}
							p2={vec(
								centerX + outer * Math.sin(left),
								centerY - outer * Math.cos(left),
							)}
							color={color}
							strokeWidth={1.5}
						/>
						<Line
							p1={vec(
								centerX + inner * Math.sin(right),
								centerY - inner * Math.cos(right),
							)}
							p2={vec(
								centerX + outer * Math.sin(right),
								centerY - outer * Math.cos(right),
							)}
							color={color}
							strokeWidth={1.5}
						/>
						<Circle
							cx={centerX + targetRadius * Math.sin(mid)}
							cy={centerY - targetRadius * Math.cos(mid)}
							r={3}
							color={color}
						/>
					</Group>
				)
			})}
		</>
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
	centerX: number
	centerY: number
	targetRadius: number
	localAngle: number
	projectileWidth: number
	projectileLength: number
}

function CollisionMarker ({
	centerX,
	centerY,
	targetRadius,
	localAngle,
	projectileWidth,
	projectileLength,
}: CollisionMarkerProps) {
	const pose = attachedProjectilePose(
		centerX,
		centerY,
		targetRadius,
		localAngle,
	)

	return (
		<Group
			transform={[
				{ translateX: pose.tipX },
				{ translateY: pose.tipY },
				{ rotate: pose.rotationRadians },
			]}
		>
			<Circle cx={0} cy={0} r={projectileWidth * 0.7} color={colors.danger} />
			<RoundedRect
				x={-projectileWidth / 2}
				y={0}
				width={projectileWidth}
				height={projectileLength}
				r={4}
				color={colors.danger}
				opacity={0.55}
			/>
		</Group>
	)
}

const styles = StyleSheet.create({
	wrap: {
		alignSelf: 'center',
		overflow: 'visible',
	},
})
