import type { ViewContractDefinition } from 'autumndb';

export const viewAllIncidents: ViewContractDefinition = {
	slug: 'view-all-incidents',
	name: 'Incidents',
	type: 'view@1.0.0',
	markers: ['org-balena'],
	data: {
		allOf: [
			{
				name: 'All incidents',
				schema: {
					type: 'object',
					properties: {
						type: {
							type: 'string',
							const: 'incident@1.0.0',
						},
					},
					additionalProperties: true,
					required: ['type'],
				},
			},
		],
	},
};
