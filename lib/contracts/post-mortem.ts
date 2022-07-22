import type { ContractDefinition } from 'autumndb';

export const postMortem: ContractDefinition = {
	slug: 'post-mortem',
	name: 'Post-mortem',
	type: 'type@1.0.0',
	markers: [],
	data: {
		schema: {
			type: 'object',
			required: ['data'],
			properties: {
				name: {
					type: 'string',
				},
				data: {
					type: 'object',
					properties: {
						title: {
							title: 'Title',
							type: ['string', 'null'],
						},
						details: {
							title: 'Details',
							type: 'string',
						},
					},
				},
			},
		},
	},
};
