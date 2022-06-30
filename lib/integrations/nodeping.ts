import type { Contract } from '@balena/jellyfish-types/build/core';
import {
	Integration,
	IntegrationDefinition,
	SequenceItem,
} from '@balena/jellyfish-worker';
import { v4 as uuidv4 } from 'uuid';
import type { IncidentContract } from '../types';

const SLUG = 'nodeping';
const CHECKS_ENDPOINT = 'https://api.nodeping.com/api/v1/checks';

interface NodepingPayload {
	event: string;
	label: string;
	id: PerformanceServerTiming;
	[k: string]: unknown;
}

export class NodepingIntegration implements Integration {
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
		const payload = event.data.payload as NodepingPayload;
		if (!payload.event || !payload.label || !payload.id) {
			this.context.log.warn('Invalid Nodeping event', {
				payload: event.data.payload,
			});
			return [];
		}

		// If event is "up", attempt to update an existing "down" incident
		const status = payload.event === 'up' ? 'resolved' : 'open';
		const mirrorId = `${CHECKS_ENDPOINT}/${payload.id}`;
		if (status === 'resolved') {
			const incident = (await this.context.getElementByMirrorId(
				'incident@1.0.0',
				mirrorId,
			)) as IncidentContract;
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
		}

		// Otherwise create a new incident contract
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
						service: payload.label,
						status,
						mirrors: [mirrorId],
					},
				},
			},
		];
	}
}

export const nodepingIntegrationDefinition: IntegrationDefinition = {
	slug: SLUG,

	initialize: async (options) => new NodepingIntegration(options),
	isEventValid: (_logContext, _token, _rawEvent, _headers): boolean => {
		// TODO: Add proper signature validation
		return true;
	},
};
