/**
 * Marks active gameplay for ad policy guards while the screen is focused.
 */

import { useCallback } from 'react'
import { useFocusEffect } from '@react-navigation/native'

import { useAdsContext } from './AdsProvider'

export function useGameplayAdGuard (): void {
	const { setActiveGameplay } = useAdsContext()
	useFocusEffect(
		useCallback(() => {
			setActiveGameplay(true)
			return () => {
				setActiveGameplay(false)
			}
		}, [setActiveGameplay]),
	)
}
