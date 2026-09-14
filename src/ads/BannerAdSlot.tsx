/**
 * Reserved-height banner slot for non-gameplay screens.
 * No-fill / errors keep layout stable — never crashes the screen.
 */

import { useEffect, useRef, useState } from 'react'
import { Dimensions, StyleSheet, View } from 'react-native'

import {
	bannerUnitForPlacement,
	type YandexBannerPlacement,
} from './config'
import {
	BannerAdSize,
	BannerView,
	createAdRequest,
	type AdRequestParams,
} from './nativeBridge'

const RESERVED_HEIGHT = 56

interface BannerAdSlotProps {
	placement: YandexBannerPlacement
}

export function BannerAdSlot ({ placement }: BannerAdSlotProps) {
	const mountedRef = useRef(true)
	const [size, setSize] = useState<BannerAdSize | null>(null)
	const [failed, setFailed] = useState(false)
	const [adRequest, setAdRequest] = useState<AdRequestParams | null>(null)

	useEffect(() => {
		mountedRef.current = true
		let cancelled = false
		const width = Math.floor(Dimensions.get('window').width)
		void (async () => {
			try {
				const nextSize = await BannerAdSize.stickySize(width)
				if (cancelled || !mountedRef.current) {
					return
				}
				setSize(nextSize)
				setAdRequest(createAdRequest(bannerUnitForPlacement(placement)))
			} catch {
				if (!cancelled && mountedRef.current) {
					setFailed(true)
				}
			}
		})()
		return () => {
			cancelled = true
			mountedRef.current = false
		}
	}, [placement])

	return (
		<View style={styles.slot} accessibilityElementsHidden={failed}>
			{size && adRequest && !failed ? (
				<BannerView
					size={size}
					adRequest={adRequest}
					style={styles.banner}
					onAdFailedToLoad={() => {
						if (mountedRef.current) {
							setFailed(true)
						}
					}}
				/>
			) : null}
		</View>
	)
}

const styles = StyleSheet.create({
	slot: {
		minHeight: RESERVED_HEIGHT,
		width: '100%',
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
	},
	banner: {
		alignSelf: 'center',
	},
})
