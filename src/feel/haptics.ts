/**
 * Haptic helpers — respect vibrationEnabled setting.
 */

import * as Haptics from 'expo-haptics'

import { getSettings } from '../storage/settings'

async function run (
	fn: () => Promise<void>,
): Promise<void> {
	if (!getSettings().vibrationEnabled) {
		return
	}
	try {
		await fn()
	} catch {
		// Devices without haptics must not crash.
	}
}

export function hapticThrow (): void {
	void run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light))
}

export function hapticHit (): void {
	void run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light))
}

export function hapticCollision (): void {
	void run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy))
}

export function hapticWin (): void {
	void run(() =>
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
	)
}

export function hapticTap (): void {
	void run(() => Haptics.selectionAsync())
}
