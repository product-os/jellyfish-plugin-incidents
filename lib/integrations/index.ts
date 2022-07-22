import type { IntegrationDefinition, Map } from '@balena/jellyfish-worker';
import { statuspageIntegrationDefinition } from './statuspage';

export const integrations: Map<IntegrationDefinition> = {
	statuspage: statuspageIntegrationDefinition,
};
