// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config')
const expoConfig = require('eslint-config-expo/flat')

module.exports = defineConfig([
	expoConfig,
	{
		ignores: ['dist/*', 'node_modules/*', '.expo/*', 'jest.setup.js'],
	},
	{
		rules: {
			'import/no-unresolved': 'off',
		},
	},
	{
		// Reanimated SharedValue `.value` writes are intentional mutation APIs.
		files: ['src/hooks/useGameController.ts', 'src/components/GameCanvas.tsx'],
		rules: {
			'react-hooks/immutability': 'off',
		},
	},
])
