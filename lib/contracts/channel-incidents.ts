import type { ContractDefinition } from '@balena/jellyfish-types/build/core';

export const channelIncidents: ContractDefinition = {
	slug: 'channel-incidents',
	name: 'Incidents',
	type: 'channel@1.0.0',
	markers: ['org-balena'],
	data: {
		filter: {
			name: 'Incident contracts',
			schema: {
				type: 'object',
				additionalProperties: true,
				required: ['type'],
				properties: {
					type: {
						type: 'string',
						const: 'incident@1.0.0',
					},
				},
			},
		},
	},
};
