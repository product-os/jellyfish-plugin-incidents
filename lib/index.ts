import type { PluginDefinition } from '@balena/jellyfish-worker';
import { contracts } from './contracts';

// tslint:disable-next-line: no-var-requires
const { version } = require('../package.json');

/**
 * The Jellyfish Incidents plugin.
 */
export const incidentsPlugin = (): PluginDefinition => {
	return {
		slug: 'plugin-incidents',
		name: 'Incidents Plugin',
		version,
		contracts,
		requires: [
			{
				slug: 'plugin-default',
				version: '>=27.x',
			},
		],
	};
};
