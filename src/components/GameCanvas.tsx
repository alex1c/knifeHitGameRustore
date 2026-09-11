/**
 * Prototype game scene rendered with React Native Skia.
 * Visual rotation uses Reanimated shared values — no React setState per frame.
 */

import { StyleSheet, useWindowDimensions, View } from 'react-native'
import {
	Canvas,
	Circle,
	Group,
	Line,
	RoundedRect,
	useClock,
	vec,
} from '@shopify/react-native-skia'
import { useDerivedValue } from 'react-native-reanimated'

import type { AttachedProjectile, LevelConfig } from '../game/models'
import { colors } from '../theme'

interface GameCanvasProps {
	level: LevelConfig
	attachedProjectiles: AttachedProjectile[]
	/** Visual rotation speed in degrees per second (presentation only). */
	visualSpeedDegreesPerSecond: number
	direction: LevelConfig['direction']
}

export function GameCanvas ({
	attachedProjectiles,
	visualSpeedDegreesPerSecond,
	direction,
}: GameCanvasProps) {
	const { width } = useWindowDimensions()
	const clock = useClock()

	const size = Math.min(width - 32, 360)
	const center = size / 2
	const targetRadius = size * 0.32
	const projectileLength = size * 0.14
	const projectileWidth = size * 0.045

	const signedSpeed =
		direction === 'clockwise'
			? visualSpeedDegreesPerSecond
			: -visualSpeedDegreesPerSecond

	// Derived transform updates on the UI thread without React re-renders.
	const targetTransform = useDerivedValue(() => {
		'worklet'
		const radians = ((clock.value / 1000) * signedSpeed * Math.PI) / 180
		return [{ rotate: radians }]
	})

	return (
		<View style={[styles.wrap, { width: size, height: size * 1.35 }]}>
			<Canvas style={{ width: size, height: size * 1.35 }}>
				{/* Central rotating target + attached markers */}
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
					{/* Crosshair ticks for range / target aesthetic */}
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
									color={colors.obstacle}
								/>
							</Group>
						)
					})}
				</Group>

				{/* Idle projectile at the bottom — throw loop arrives in Phase 2 */}
				<RoundedRect
					x={center - projectileWidth / 2}
					y={size * 1.12}
					width={projectileWidth}
					height={projectileLength}
					r={4}
					color={colors.projectile}
				/>
				{/* Subtle aim guide */}
				<Line
					p1={vec(center, center + targetRadius + 12)}
					p2={vec(center, size * 1.12)}
					color={colors.border}
					strokeWidth={2}
				/>
			</Canvas>
		</View>
	)
}

const styles = StyleSheet.create({
	wrap: {
		alignSelf: 'center',
	},
})
