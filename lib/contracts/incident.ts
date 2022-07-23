import type { ContractDefinition } from 'autumndb';
import _ from 'lodash';

export const statusOptions = [
	'open',
	'investigating',
	'identified',
	'monitoring',
	'resolved',
	'archived',
];

export const incident: ContractDefinition = {
	slug: 'incident',
	name: 'Incident',
	type: 'type@1.0.0',
	markers: [],
	data: {
		schema: {
			type: 'object',
			required: ['data'],
			properties: {
				data: {
					type: 'object',
					properties: {
						status: {
							title: 'Status',
							type: 'string',
							default: statusOptions[0],
							enum: statusOptions,
							enumNames: statusOptions.map(_.startCase),
						},
						description: {
							title: 'Description',
							type: 'string',
						},
						impact: {
							title: 'Impact',
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
