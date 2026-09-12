/**
 * Bridges feel events → audio + haptics without touching game rules.
 */

import { useEffect } from 'react'

import { playSfx } from './audio'
import { subscribeFeel } from './events'
import {
	hapticCollision,
	hapticHit,
	hapticThrow,
	hapticWin,
} from './haptics'

export function useFeelFeedback (): void {
	useEffect(() => {
		return subscribeFeel((event) => {
			switch (event.type) {
				case 'throwStarted':
					void playSfx('throw')
					hapticThrow()
					break
				case 'successfulHit':
					void playSfx('hit')
					hapticHit()
					break
				case 'collision':
					void playSfx('fail')
					hapticCollision()
					break
				case 'levelWon':
					void playSfx('win')
					hapticWin()
					break
				case 'retry':
				case 'levelStarted':
					break
				default:
					break
			}
		})
	}, [])
}
