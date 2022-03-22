import type { ContractDefinition } from '@balena/jellyfish-types/build/core';
import { contractMixins } from '@balena/jellyfish-worker';

const slug = 'incident';
const type = 'type@1.0.0';
const statusOptions = [
	'open',
	'investigating',
	'identified',
	'monitoring',
	'resolved',
	'archived',
];

export const incident: ContractDefinition = contractMixins.mixin(
	contractMixins.withEvents(slug, type),
	contractMixins.asPipelineItem(slug, type, statusOptions),
)({
	slug,
	name: 'Incident',
	type,
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
						description: {
							title: 'Description',
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
					'ui:order': ['status', 'title', 'description', '*'],
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
						'ui:order': ['status', 'title', 'description', '*'],
					},
				},
			},
		},
		indexed_fields: [['data.status']],
	},
});
