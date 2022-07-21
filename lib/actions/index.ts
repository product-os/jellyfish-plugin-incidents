import type { ActionDefinition } from '@balena/jellyfish-worker';
import { actionIntegrationStatuspageImportIncident } from './action-integration-statuspage-import-incident';

export const actions: ActionDefinition[] = [
	actionIntegrationStatuspageImportIncident,
];
