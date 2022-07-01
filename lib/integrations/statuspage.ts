import type { Contract } from '@balena/jellyfish-types/build/core';
import {
	Integration,
	IntegrationDefinition,
	SequenceItem,
} from '@balena/jellyfish-worker';
import _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { statusOptions } from '../contracts/incident';

const SLUG = 'statuspage';
const STATUSPAGE_ENDPOINT = 'https://api.statuspage.io/v1';

// TODO: Expand payload definition to handle more information
interface IncidentUpdatePayload {
	page: {
		id: string;
		status_description: string;
		[k: string]: string;
	};
	incident: {
		status: string;
		id: string;
		[k: string]: string;
	};
	[k: string]: unknown;
}

export class StatuspageIntegration implements Integration {
	public slug = SLUG;

	// TS-TODO: Use proper types
	public context: any;
	public options: any;

	// TS-TODO: Use proper types
	constructor(options: any) {
		this.options = options;
		this.context = this.options.context;
	}

	public async destroy() {
		return Promise.resolve();
	}

	public async mirror(): Promise<SequenceItem[]> {
		return [];
	}

	public async translate(event: Contract): Promise<SequenceItem[]> {
		const payload = event.data.payload as IncidentUpdatePayload;
		const status = statusOptions.includes(payload.incident.status)
			? payload.incident.status
			: 'open';
		const mirrorId = `${STATUSPAGE_ENDPOINT}/pages/${payload.page.id}/incidents/${payload.incident.id}`;
		const incident = await this.context.getElementByMirrorId(
			'incident@1.0.0',
			mirrorId,
		);
		if (incident) {
			incident.data.status = status;
			return [
				{
					time: new Date(),
					actor: await this.context.getActorId({
						handle: this.options.defaultUser,
					}),
					card: incident,
				},
			];
		}

		return [
			{
				time: new Date(),
				actor: await this.context.getActorId({
					handle: this.options.defaultUser,
				}),
				card: {
					type: 'incident@1.0.0',
					slug: `incident-${uuidv4()}`,
					data: {
						description: payload.page.status_description,
						status,
						mirrors: [mirrorId],
					},
				},
			},
		];
	}
}

export const statuspageIntegrationDefinition: IntegrationDefinition = {
	slug: SLUG,

	initialize: async (options) => new StatuspageIntegration(options),
	isEventValid: (_logContext, _token, rawEvent, _headers): boolean => {
		// TODO: Add proper signature validation
		console.log('rawEvent:', rawEvent);
		if (_.has(rawEvent, ['data', 'payload', 'incident'])) {
			return true;
		}
		return false;
	},
};
