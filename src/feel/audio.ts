/**
 * Local SFX playback via expo-audio.
 * Respects soundEnabled setting and stops on background.
 */

import {
	createAudioPlayer,
	setAudioModeAsync,
	setIsAudioActiveAsync,
	type AudioPlayer,
	type AudioSource,
} from 'expo-audio'
import { AppState, type AppStateStatus } from 'react-native'

import { getSettings } from '../storage/settings'

type SfxId = 'throw' | 'hit' | 'fail' | 'win' | 'tap'

const SOURCES: Record<SfxId, AudioSource> = {
	throw: require('../../assets/sounds/throw.wav'),
	hit: require('../../assets/sounds/hit.wav'),
	fail: require('../../assets/sounds/fail.wav'),
	win: require('../../assets/sounds/win.wav'),
	tap: require('../../assets/sounds/tap.wav'),
}

const sounds = new Map<SfxId, AudioPlayer>()
let ready = false
let appActive = true

async function ensureReady (): Promise<void> {
	if (ready) {
		return
	}
	await setAudioModeAsync({
		playsInSilentMode: true,
		interruptionMode: 'duckOthers',
		shouldPlayInBackground: false,
		shouldRouteThroughEarpiece: false,
	})
	for (const id of Object.keys(SOURCES) as SfxId[]) {
		const sound = createAudioPlayer(SOURCES[id], {
			keepAudioSessionActive: true,
		})
		sound.volume = 0.85
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
		void sound.seekTo(0).then(() => sound.play())
	} catch {
		// Ignore playback errors — never block gameplay.
	}
}

export async function stopAllSfx (): Promise<void> {
	for (const sound of sounds.values()) {
		sound.pause()
	}
}

export function bindAudioLifecycle (): () => void {
	const onChange = (next: AppStateStatus) => {
		appActive = next === 'active'
		if (!appActive) {
			void stopAllSfx()
			void setIsAudioActiveAsync(false)
		} else {
			void setIsAudioActiveAsync(true)
		}
	}
	const sub = AppState.addEventListener('change', onChange)
	return () => {
		sub.remove()
	}
}

export async function unloadAudio (): Promise<void> {
	for (const sound of sounds.values()) {
		sound.remove()
	}
	sounds.clear()
	ready = false
}
