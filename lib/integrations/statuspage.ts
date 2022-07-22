import type {
	Integration,
	IntegrationDefinition,
	SequenceItem,
} from '@balena/jellyfish-worker';
import _ from 'lodash';
import * as skhema from 'skhema';

const SLUG = 'statuspage';

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

	public async translate(): Promise<SequenceItem[]> {
		return [];
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
