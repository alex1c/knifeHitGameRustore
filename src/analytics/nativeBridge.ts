/**
 * Native AppMetrica bridge — isolated for Jest mocks.
 */

import AppMetrica from '@appmetrica/react-native-analytics'

import { APPMETRICA_API_KEY } from './config'

export function activateAppMetricaNative (): void {
	AppMetrica.activate({
		apiKey: APPMETRICA_API_KEY,
		sessionTimeout: 120,
		firstActivationAsUpdate: false,
	})
}

export function reportAppMetricaEventNative (
	name: string,
	params?: Record<string, string | number | boolean>,
): void {
	if (params) {
		AppMetrica.reportEvent(name, params)
		return
	}
	AppMetrica.reportEvent(name)
}
