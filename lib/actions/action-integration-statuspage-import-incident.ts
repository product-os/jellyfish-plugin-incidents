import { defaultEnvironment } from '@balena/jellyfish-environment';
import type { ActionDefinition, WorkerContext } from '@balena/jellyfish-worker';
import { getLogger } from '@balena/jellyfish-logger';
import type { TypeContract } from 'autumndb';
import axios from 'axios';
import _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { statusOptions } from '../contracts/incident';
import type { IncidentContract, StatuspageContract } from '../types';

const logger = getLogger(__filename);
export const STATUSPAGE_ENDPOINT = 'https://api.statuspage.io/v1';

async function getByMirrorId(context: WorkerContext, type: string, id: string) {
	const [result] = await context.query(
		context.privilegedSession,
		{
			type: 'object',
			required: ['type', 'data'],
			additionalProperties: true,
			properties: {
				type: {
					const: `${type}@1.0.0`,
				},
				data: {
					type: 'object',
					required: ['mirrors'],
					additionalProperties: true,
					properties: {
						mirrors: {
							type: 'array',
							contains: {
								const: id,
							},
						},
					},
				},
			},
		},
		{
			limit: 1,
		},
	);
	return result;
}

// TODO: Expand payload definition to handle more information
interface IncidentUpdatePayload {
	page: {
		id: string;
		status_description: string;
		[k: string]: string;
	};
	incident: {
		status: string;
		id: string;
		[k: string]: string;
	};
	[k: string]: unknown;
}

const handler: ActionDefinition['handler'] = async (
	session,
	context,
	contract,
	request,
) => {
	// Validate webhook Statuspage page ID
	const payload = contract.data.payload as IncidentUpdatePayload;
	if (!defaultEnvironment.integration.statuspage.pages[payload.page.id]) {
		logger.warn(request.logContext, 'Webhook from unknown Statuspage', {
			pageId: payload.page.id,
		});
		return {
			id: contract.id,
			type: contract.type,
			version: contract.version,
			slug: contract.slug,
		};
	}

	// Get statuspage contract
	const statuspageMirrorId = `${STATUSPAGE_ENDPOINT}/pages/${payload.page.id}`;
	let statuspage = (await getByMirrorId(
		context,
		'statuspage',
		statuspageMirrorId,
	)) as StatuspageContract;

	// Create statuspage contract if it doesn't exist
	if (!statuspage) {
		try {
			const remoteStatuspage = await axios({
				method: 'GET',
				url: `${STATUSPAGE_ENDPOINT}/pages/${payload.page.id}`,
				headers: {
					Authorization: `OAuth ${
						defaultEnvironment.integration.statuspage.pages[payload.page.id]
					}`,
				},
			});
			statuspage = (await context.insertCard(
				session,
				context.cards['statuspage@1.0.0'] as TypeContract,
				{
					timestamp: request.timestamp,
					attachEvents: true,
					actor: request.actor,
				},
				{
					slug: `statuspage-${payload.page.id}`,
					data: {
						name: remoteStatuspage.data.name || '',
						description: remoteStatuspage.data.page_description || '',
						domain: remoteStatuspage.data.domain || '',
						subdomain: remoteStatuspage.data.subdomain || '',
						mirrors: [statuspageMirrorId],
					},
				},
			)) as StatuspageContract;
		} catch (error: any) {
			logger.warn(request.logContext, 'Failed to get Statuspage details', {
				pageId: payload.page.id,
				incidentId: payload.incident.id,
				error: {
					code: error.code,
					message: error.data.message,
					status: error.response.status,
					statusText: error.response.statusText,
				},
			});
			return {
				id: contract.id,
				type: contract.type,
				version: contract.version,
				slug: contract.slug,
			};
		}
	}

	// Validate webhook incident ID and status
	try {
		const response = await axios({
			method: 'GET',
			url: `${STATUSPAGE_ENDPOINT}/pages/${payload.page.id}/incidents/${payload.incident.id}`,
			headers: {
				Authorization: `OAuth ${
					defaultEnvironment.integration.statuspage.pages[payload.page.id]
				}`,
			},
		});
		if (response.data.status !== payload.incident.status) {
			logger.warn(request.logContext, 'Statuspage incident status mismatch', {
				pageId: payload.page.id,
				incidentId: payload.incident.id,
				remoteStatus: response.data.status,
				webhookStatus: payload.incident.status,
			});
			return {
				id: contract.id,
				type: contract.type,
				version: contract.version,
				slug: contract.slug,
			};
		}
	} catch (error: any) {
		logger.warn(
			request.logContext,
			'Failed to get Statuspage incident details',
			{
				pageId: payload.page.id,
				incidentId: payload.incident.id,
				error: {
					code: error.code,
					message: error.data.message,
					status: error.response.status,
					statusText: error.response.statusText,
				},
			},
		);
		return {
			id: contract.id,
			type: contract.type,
			version: contract.version,
			slug: contract.slug,
		};
	}

	// Upsert incident contract
	const status = statusOptions.includes(payload.incident.status)
		? payload.incident.status
		: 'open';
	const incidentMirrorId = `${STATUSPAGE_ENDPOINT}/pages/${payload.page.id}/incidents/${payload.incident.id}`;
	let incident = (await getByMirrorId(
		context,
		'incident',
		incidentMirrorId,
	)) as IncidentContract;
	if (incident) {
		await context.patchCard(
			session,
			context.cards['incident@1.0.0'] as TypeContract,
			{
				timestamp: request.timestamp,
				attachEvents: true,
				actor: request.actor,
			},
			incident,
			[
				{
					path: '/data/status',
					op: 'replace',
					value: status,
				},
			],
		);
	} else {
		// Add new incident to sequence
		const incidentSlug = `incident-${uuidv4()}`;
		incident = (await context.insertCard(
			session,
			context.cards['incident@1.0.0'] as TypeContract,
			{
				timestamp: request.timestamp,
				attachEvents: true,
				actor: request.actor,
			},
			{
				slug: `incident-${uuidv4()}`,
				data: {
					description: payload.page.status_description,
					status,
					mirrors: [incidentMirrorId],
				},
			},
		)) as IncidentContract;

		// Link incident to statuspage
		await context.insertCard(
			session,
			context.cards['link@1.0.0'] as TypeContract,
			{
				timestamp: request.timestamp,
				attachEvents: false,
			},
			{
				slug: `link-statuspage-${payload.page.id}-has-attached-${incidentSlug}`,
				name: 'has attached',
				data: {
					inverseName: 'is attached to',
					from: {
						id: statuspage.id,
						type: statuspage.type,
					},
					to: {
						id: incident.id,
						type: incident.type,
					},
				},
			},
		);
	}

	return {
		id: incident.id,
		type: incident.type,
		version: incident.version,
		slug: incident.slug,
	};
};

export const actionIntegrationStatuspageImportIncident: ActionDefinition = {
	handler,
	contract: {
		slug: 'action-integration-statuspage-import-incident',
		version: '1.0.0',
		type: 'action@1.0.0',
		data: {
			filter: {
				type: 'object',
				required: ['type', 'data'],
				properties: {
					type: {
						type: 'string',
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
			arguments: {},
		},
	},
};
