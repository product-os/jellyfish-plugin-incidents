import { defaultEnvironment as environment } from '@balena/jellyfish-environment';
import {
	Integration,
	IntegrationDefinition,
	SequenceItem,
} from '@balena/jellyfish-worker';
import type { Contract } from 'autumndb';
import axios from 'axios';
import _ from 'lodash';
import * as skhema from 'skhema';
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
		// Validate webhook payload
		const payload = event.data.payload as IncidentUpdatePayload;
		const remoteIncident = await axios({
			method: 'GET',
			url: `${STATUSPAGE_ENDPOINT}/pages/${environment.integration.statuspage.pageId}/incidents/${payload.incident.id}`,
		});
		if (
			remoteIncident.status !== 200 ||
			remoteIncident.data.status !== payload.incident.status
		) {
			this.context.log.warn('Statuspage incident status mismatch', {
				pageId: environment.integration.statuspage.pageId,
				incidentId: payload.incident.id,
				remoteStatus: remoteIncident.data.status,
				webhookStatus: payload.incident.status,
			});
			return [];
		}

		// Upsert incident contract
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
	isEventValid: (_logConext, _token, rawEvent, _headers): boolean => {
		if (
			skhema.isValid(
				{
					type: 'object',
					required: ['page', 'incident'],
					properties: {
						page: {
							type: 'object',
							required: ['id', 'status_description'],
							properties: {
								id: {
									type: 'string',
								},
								status_description: {
									type: 'string',
								},
							},
						},
						incident: {
							type: 'object',
							required: ['id', 'status'],
							properties: {
								id: {
									type: 'string',
								},
								status: {
									type: 'string',
								},
							},
						},
					},
				},
				JSON.parse(rawEvent),
			)
		) {
			return true;
		}

		return false;
	},
};
