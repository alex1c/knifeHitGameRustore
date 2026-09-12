/**
 * Single stats accounting path from presentation feel events.
 * Controllers must emit feel events once per semantic action — no double notes.
 */

import { useEffect } from 'react'

import { subscribeFeel } from '../feel/events'
import { useModesContext } from '../storage/ModesProvider'

export function useStatsFromFeel (): void {
	const { noteThrowStarted, noteSuccessfulHit, noteCollision } =
		useModesContext()

	useEffect(() => {
		return subscribeFeel((event) => {
			switch (event.type) {
				case 'throwStarted':
					noteThrowStarted()
					break
				case 'successfulHit':
					noteSuccessfulHit()
					break
				case 'collision':
					noteCollision()
					break
				default:
					break
			}
		})
	}, [noteCollision, noteSuccessfulHit, noteThrowStarted])
}
