import { contractMixins } from '@balena/jellyfish-worker';
import type { ContractDefinition } from 'autumndb';

const slug = 'incident';
const type = 'type@1.0.0';
export const statusOptions = [
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
				data: {
					type: 'object',
					properties: {
						service: {
							title: 'Title',
							type: 'string',
							fullTextSearch: true,
						},
						description: {
							title: 'Description',
							type: 'string',
							fullTextSearch: true,
						},
						mirrors: {
							type: 'array',
							items: {
								type: 'string',
							},
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
