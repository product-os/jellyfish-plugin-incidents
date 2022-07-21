import type { ContractDefinition } from 'autumndb';

export const triggeredActionIntegrationStatuspageImportIncident: ContractDefinition =
	{
		slug: 'triggered-action-integration-statuspage-import-incident',
		type: 'triggered-action@1.0.0',
		name: 'Triggered action for importing Statuspage incidents',
		markers: [],
		data: {
			filter: {
				type: 'object',
				required: ['type', 'data'],
				properties: {
					type: {
						const: 'external-event@1.0.0',
					},
					data: {
						type: 'object',
						required: ['source'],
						properties: {
							source: {
								const: 'statuspage',
							},
						},
					},
				},
			},
			action: 'action-integration-statuspage-import-incident@1.0.0',
			target: {
				$eval: 'source.id',
			},
			arguments: {},
		},
	};
