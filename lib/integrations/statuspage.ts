import { defaultEnvironment } from '@balena/jellyfish-environment';
import type {
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
		// Validate webhook Statuspage page ID
		const payload = event.data.payload as IncidentUpdatePayload;
		if (!defaultEnvironment.integration.statuspage.pages[payload.page.id]) {
			this.context.log.warn('Webhook from unknown Statuspage', {
				pageId: payload.page.id,
			});
			return [];
		}

		// Get statuspage contract
		const sequence: SequenceItem[] = [];
		const statuspageMirrorId = `${STATUSPAGE_ENDPOINT}/pages/${payload.page.id}`;
		const statuspage = await this.context.getElementByMirrorId(
			'statuspage@1.0.0',
			statuspageMirrorId,
		);

		// Add statuspage contract to sequence if it doesn't exist
		if (!statuspage) {
			try {
				const remoteStatuspage = await axios({
					method: 'GET',
					url: `${STATUSPAGE_ENDPOINT}/pages/${payload.page.id}`,
					headers: {
						Authorization: `OAuth ${
							defaultEnvironment.integration.statuspage.pages[payload.page.id]
						}`,
					},
				});
				sequence.push({
					time: new Date(),
					actor: await this.context.getActorId({
						handle: this.options.defaultUser,
					}),
					card: {
						type: 'statuspage@1.0.0',
						slug: `statuspage-${payload.page.id}`,
						data: {
							name: remoteStatuspage.data.name || '',
							description: remoteStatuspage.data.page_description || '',
							domain: remoteStatuspage.data.domain || '',
							subdomain: remoteStatuspage.data.subdomain || '',
							mirrors: [statuspageMirrorId],
						},
					},
				});
			} catch (error: any) {
				this.context.log.warn('Failed to get Statuspage details', {
					pageId: payload.page.id,
					incidentId: payload.incident.id,
					error: {
						code: error.code,
						message: error.data.message,
						status: error.response.status,
						statusText: error.response.statusText,
					},
				});
				return [];
			}
		}

		// Validate webhook incident ID and status
		try {
			const response = await axios({
				method: 'GET',
				url: `${STATUSPAGE_ENDPOINT}/pages/${payload.page.id}/incidents/${payload.incident.id}`,
				headers: {
					Authorization: `OAuth ${
						defaultEnvironment.integration.statuspage.pages[payload.page.id]
					}`,
				},
			});
			if (response.data.status !== payload.incident.status) {
				this.context.log.warn('Statuspage incident status mismatch', {
					pageId: payload.page.id,
					incidentId: payload.incident.id,
					remoteStatus: response.data.status,
					webhookStatus: payload.incident.status,
				});
				return [];
			}
		} catch (error: any) {
			this.context.log.warn('Failed to get Statuspage incident details', {
				pageId: payload.page.id,
				incidentId: payload.incident.id,
				error: {
					code: error.code,
					message: error.data.message,
					status: error.response.status,
					statusText: error.response.statusText,
				},
			});
			return [];
		}

		const status = statusOptions.includes(payload.incident.status)
			? payload.incident.status
			: 'open';
		const incidentMirrorId = `${STATUSPAGE_ENDPOINT}/pages/${payload.page.id}/incidents/${payload.incident.id}`;
		const incident = await this.context.getElementByMirrorId(
			'incident@1.0.0',
			incidentMirrorId,
		);
		if (incident) {
			// Add updated incident to sequence
			incident.data.status = status;
			sequence.push({
				time: new Date(),
				actor: await this.context.getActorId({
					handle: this.options.defaultUser,
				}),
				card: incident,
			});
		} else {
			// Add new incident to sequence
			const incidentSlug = `incident-${uuidv4()}`;
			sequence.push({
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
						mirrors: [incidentMirrorId],
					},
				},
			});

			// Add link to sequence
			sequence.push({
				time: new Date(),
				actor: await this.context.getActorId({
					handle: this.options.defaultUser,
				}),
				card: {
					type: 'link@1.0.0',
					slug: `link-statuspage-${payload.page.id}-has-attached-${incidentSlug}`,
					name: 'has attached',
					data: {
						inverseName: 'is attached to',
						from: {
							id: statuspage
								? statuspage.id
								: {
										$eval: 'cards[0].id',
								  },
							type: 'statuspage@1.0.0',
						},
						to: {
							id: statuspage
								? {
										$eval: 'cards[0].id',
								  }
								: {
										$eval: 'cards[1].id',
								  },
							type: 'incident@1.0.0',
						},
					},
				},
			});
		}

		return sequence;
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
