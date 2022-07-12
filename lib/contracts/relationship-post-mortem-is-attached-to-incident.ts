import type { RelationshipContractDefinition } from 'autumndb';

export const relationshipPostMortemIsAttachedToIncident: RelationshipContractDefinition =
	{
		slug: 'relationship-post-mortem-is-attached-to-incident',
		type: 'relationship@1.0.0',
		name: 'is attached to',
		data: {
			inverseName: 'has attached',
			title: 'Post-mortem',
			inverseTitle: 'Incident',
			from: {
				type: 'post-mortem',
			},
			to: {
				type: 'incident',
			},
		},
	};
