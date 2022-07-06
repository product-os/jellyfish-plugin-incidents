import type { ContractDefinition } from 'autumndb';
import { channelIncidents } from './channel-incidents';
import { channelPostMortems } from './channel-post-mortems';
import { incident } from './incident';
import { postMortem } from './post-mortem';

export const contracts: ContractDefinition[] = [
	channelIncidents,
	channelPostMortems,
	incident,
	postMortem,
];
