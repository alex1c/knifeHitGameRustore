/**
 * Local SFX playback via expo-av.
 * Respects soundEnabled setting and stops on background.
 */

import { Audio, type AVPlaybackSource } from 'expo-av'
import { AppState, type AppStateStatus } from 'react-native'

import { getSettings } from '../storage/settings'

type SfxId = 'throw' | 'hit' | 'fail' | 'win' | 'tap'

const SOURCES: Record<SfxId, AVPlaybackSource> = {
	throw: require('../../assets/sounds/throw.wav'),
	hit: require('../../assets/sounds/hit.wav'),
	fail: require('../../assets/sounds/fail.wav'),
	win: require('../../assets/sounds/win.wav'),
	tap: require('../../assets/sounds/tap.wav'),
}

const sounds = new Map<SfxId, Audio.Sound>()
let ready = false
let appActive = true

async function ensureReady (): Promise<void> {
	if (ready) {
		return
	}
	await Audio.setAudioModeAsync({
		playsInSilentModeIOS: true,
		staysActiveInBackground: false,
		shouldDuckAndroid: true,
		playThroughEarpieceAndroid: false,
	})
	for (const id of Object.keys(SOURCES) as SfxId[]) {
		const { sound } = await Audio.Sound.createAsync(SOURCES[id], {
			shouldPlay: false,
			volume: 0.85,
		})
		sounds.set(id, sound)
	}
	ready = true
}

export async function initAudio (): Promise<void> {
	try {
		await ensureReady()
	} catch {
		ready = false
	}
}

export async function playSfx (id: SfxId): Promise<void> {
	if (!appActive || !getSettings().soundEnabled) {
		return
	}
	try {
		await ensureReady()
		const sound = sounds.get(id)
		if (!sound) {
			return
		}
		await sound.setPositionAsync(0)
		await sound.playAsync()
	} catch {
		// Ignore playback errors — never block gameplay.
	}
}

export async function stopAllSfx (): Promise<void> {
	for (const sound of sounds.values()) {
		try {
			await sound.stopAsync()
		} catch {
			// ignore
		}
	}
}

export function bindAudioLifecycle (): () => void {
	const onChange = (next: AppStateStatus) => {
		appActive = next === 'active'
		if (!appActive) {
			void stopAllSfx()
		}
	}
	const sub = AppState.addEventListener('change', onChange)
	return () => {
		sub.remove()
	}
}

export async function unloadAudio (): Promise<void> {
	for (const sound of sounds.values()) {
		try {
			await sound.unloadAsync()
		} catch {
			// ignore
		}
	}
	sounds.clear()
	ready = false
}
