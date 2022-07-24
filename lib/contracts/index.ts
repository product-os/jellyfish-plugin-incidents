import type { ContractDefinition } from 'autumndb';
import { incident } from './incident';
import { postMortem } from './post-mortem';
import { relationshipIncidentIsAttachedToStatuspage } from './relationship-incident-is-attached-to-statuspage';
import { relationshipPostMortemIsAttachedToIncident } from './relationship-post-mortem-is-attached-to-incident';
import { statuspage } from './statuspage';
import { triggeredActionIntegrationStatuspageImportIncident } from './triggered-action-integration-statuspage-import-incident';
import { viewAllIncidents } from './view-all-incidents';

export const contracts: ContractDefinition[] = [
	incident,
	postMortem,
	relationshipIncidentIsAttachedToStatuspage,
	relationshipPostMortemIsAttachedToIncident,
	statuspage,
	triggeredActionIntegrationStatuspageImportIncident,
	viewAllIncidents,
];
