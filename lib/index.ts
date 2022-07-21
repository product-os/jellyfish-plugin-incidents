import type { PluginDefinition } from '@balena/jellyfish-worker';
import { actions } from './actions';
import { contracts } from './contracts';
export * from './types';

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
		actions,
		contracts,
	};
};
