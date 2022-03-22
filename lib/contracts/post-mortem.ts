import type { ContractDefinition } from '@balena/jellyfish-types/build/core';

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
							fullTextSearch: true,
						},
						details: {
							title: 'Details',
							type: 'string',
							fullTextSearch: true,
						},
					},
				},
			},
		},
		uiSchema: {
			fields: {
				data: {
					'ui:order': ['title', 'details', '*'],
				},
			},
			edit: {
				$ref: '#/data/uiSchema/definitions/form',
			},
			create: {
				$ref: '#/data/uiSchema/edit',
			},
			definitions: {
				form: {
					data: {
						'ui:order': ['title', 'details', '*'],
					},
				},
			},
		},
	},
};
