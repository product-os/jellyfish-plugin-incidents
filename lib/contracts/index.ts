import type { ContractDefinition } from 'autumndb';
import { channelIncidents } from './channel-incidents';
import { incident } from './incident';
import { postMortem } from './post-mortem';
import { relationshipIncidentIsAttachedToStatuspage } from './relationship-incident-is-attached-to-statuspage';
import { relationshipPostMortemIsAttachedToIncident } from './relationship-post-mortem-is-attached-to-incident';
import { statuspage } from './statuspage';
import { triggeredActionIntegrationStatuspageImportIncident } from './triggered-action-integration-statuspage-import-incident';

export const contracts: ContractDefinition[] = [
	channelIncidents,
	incident,
	postMortem,
	relationshipIncidentIsAttachedToStatuspage,
	relationshipPostMortemIsAttachedToIncident,
	statuspage,
	triggeredActionIntegrationStatuspageImportIncident,
];
