import type { ContractDefinition } from 'autumndb';

export const channelPostMortems: ContractDefinition = {
	slug: 'channel-post-mortems',
	name: 'Post-mortems',
	type: 'channel@1.0.0',
	markers: ['org-balena'],
	data: {
		filter: {
			name: 'Post-mortem contracts',
			schema: {
				type: 'object',
				additionalProperties: true,
				required: ['type'],
				properties: {
					type: {
						type: 'string',
						const: 'post-mortem@1.0.0',
					},
				},
			},
		},
	},
};
