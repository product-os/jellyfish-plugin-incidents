import type { ContractDefinition } from 'autumndb';

export const statuspage: ContractDefinition = {
	slug: 'statuspage',
	name: 'Statuspage Page',
	type: 'type@1.0.0',
	markers: [],
	data: {
		schema: {
			type: 'object',
			required: ['data'],
			properties: {
				data: {
					type: 'object',
					required: ['subdomain'],
					properties: {
						name: {
							type: 'string',
						},
						description: {
							type: 'string',
						},
						domain: {
							type: 'string',
						},
						subdomain: {
							type: 'string',
						},
						mirrors: {
							type: 'array',
							items: {
								type: 'string',
							},
						},
					},
				},
			},
		},
	},
};
