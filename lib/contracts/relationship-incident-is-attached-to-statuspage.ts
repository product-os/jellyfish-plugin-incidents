import type { RelationshipContractDefinition } from 'autumndb';

export const relationshipIncidentIsAttachedToStatuspage: RelationshipContractDefinition =
	{
		slug: 'relationship-incident-is-attached-to-statuspage',
		type: 'relationship@1.0.0',
		name: 'is attached to',
		data: {
			inverseName: 'has attached',
			title: 'Incident',
			inverseTitle: 'Statuspage',
			from: {
				type: 'incident',
			},
			to: {
				type: 'statuspage',
			},
		},
	};
