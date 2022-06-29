import type { Contract } from '@balena/jellyfish-types/build/core';
import {
	Integration,
	IntegrationDefinition,
	SequenceItem,
} from '@balena/jellyfish-worker';
import { v4 as uuidv4 } from 'uuid';

const SLUG = 'nodeping';

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
		const nodepingEvent = (event.data as any).payload.event;
		const nodepingLabel = (event.data as any).payload.label;
		if (nodepingEvent === '' || nodepingLabel === '') {
			this.context.log.warn('Invalid nodeping event', {
				nodepingEvent,
				nodepingLabel,
			});
			return [];
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
						event: (event.data as any).payload.event,
						label: (event.data as any).payload.label,
						status: 'open',
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
