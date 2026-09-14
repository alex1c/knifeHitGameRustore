/**
 * Analytics adapter — semantic mapping + failure isolation.
 */

import AppMetrica from '@appmetrica/react-native-analytics'

import {
	initAnalytics,
	resetAnalyticsForTests,
	trackEvent,
} from '../../src/analytics/adapter'
import { APPMETRICA_API_KEY } from '../../src/analytics/config'

describe('analytics adapter', () => {
	beforeEach(() => {
		resetAnalyticsForTests()
		jest.clearAllMocks()
	})

	it('activates with production API key', () => {
		initAnalytics()
		expect(AppMetrica.activate).toHaveBeenCalledWith(
			expect.objectContaining({ apiKey: APPMETRICA_API_KEY }),
		)
	})

	it('maps semantic events', () => {
		trackEvent('campaign_level_start', { level: 3, mode: 'campaign' })
		expect(AppMetrica.reportEvent).toHaveBeenCalledWith(
			'campaign_level_start',
			expect.objectContaining({ level: 3, mode: 'campaign' }),
		)
	})

	it('swallows SDK exceptions', () => {
		;(AppMetrica.reportEvent as jest.Mock).mockImplementationOnce(() => {
			throw new Error('native down')
		})
		expect(() => trackEvent('app_open')).not.toThrow()
	})

	it('dedupes rapid identical semantic events', () => {
		trackEvent('learning_open')
		trackEvent('learning_open')
		expect(AppMetrica.reportEvent).toHaveBeenCalledTimes(1)
	})
})
