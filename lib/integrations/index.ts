import type { IntegrationDefinition, Map } from '@balena/jellyfish-worker';
import { nodepingIntegrationDefinition } from './nodeping';

export const integrations: Map<IntegrationDefinition> = {
	nodeping: nodepingIntegrationDefinition,
};
