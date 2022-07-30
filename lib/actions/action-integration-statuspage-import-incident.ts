import { defaultEnvironment as environment } from '@balena/jellyfish-environment';
import type {
	ActionDefinition,
	ActionHandlerRequest,
	WorkerContext,
} from '@balena/jellyfish-worker';
import { strict as assert } from 'assert';
import type {
	AutumnDBSession,
	Contract,
	ContractSummary,
	TypeContract,
} from 'autumndb';
import axios, { AxiosResponse } from 'axios';
import type { Operation } from 'fast-json-patch';
import _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { statusOptions } from '../contracts/incident';
import type { IncidentContract, StatuspageContract } from '../types';

export const STATUSPAGE_ENDPOINT = 'https://api.statuspage.io/v1';

interface UpdatePayload {
	page: {
		id: string;
		status_description: string;
		[k: string]: string;
	};
	incident?: {
		status: string;
		id: string;
		impact: string;
		name: string;
		[k: string]: string;
	};
	component?: {
		status: string;
		id: string;
		name: string;
		[k: string]: string;
	};
	[k: string]: unknown;
}

/**
 * Attempt to get a contract using a mirror value
 *
 * @param context - worker context
 * @param type - contract type
 * @param id - mirror ID
 * @returns contract or null
 */
async function getByMirrorId(
	context: WorkerContext,
	type: string,
	id: string,
): Promise<Contract | null> {
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

async function httpStatuspage(
	token: string,
	path: string,
): Promise<AxiosResponse> {
	return axios({
		method: 'GET',
		url: `${STATUSPAGE_ENDPOINT}${path}`,
		headers: {
			Authorization: `OAuth ${token}`,
		},
	});
}

/**
 * Decide internal incident status based on external status
 *
 * @param externalStatus - external incident status
 * @returns internal status string
 */
export function getStatus(externalStatus: string): string {
	if (externalStatus === 'operational') {
		return 'resolved';
	}
	return statusOptions.includes(externalStatus) ? externalStatus : 'open';
}

/**
 * Validate incoming Statuspage incident webhook payloads
 *
 * @param payload - parsed webhook payload
 */
async function validateIncidentWebhook(payload: UpdatePayload): Promise<void> {
	if (!payload.incident) {
		return;
	}
	const response = await httpStatuspage(
		environment.integration.statuspage.pages[payload.page.id],
		`/pages/${payload.page.id}/incidents/${payload.incident.id}`,
	);
	assert(
		response.data.status === payload.incident.status &&
			response.data.impact === payload.incident.impact &&
			response.data.name === payload.incident.name,
		new Error(
			`Statuspage incident mismatch: ${JSON.stringify(
				{
					page: payload.page.id,
					incident: payload.incident.id,
					status: payload.incident.status,
					remoteStatus: response.data.status,
					impact: payload.incident.impact,
					remoteImpact: response.data.impact,
					name: payload.incident.name,
					remoteName: response.data.name,
				},
				null,
				2,
			)}`,
		),
	);
}

/**
 * Validate incoming Statuspage component webhook payloads
 *
 * @param payload - parsed webhook payload
 */
async function validateComponentWebhook(payload: UpdatePayload): Promise<void> {
	if (!payload.component) {
		return;
	}
	const response = await httpStatuspage(
		environment.integration.statuspage.pages[payload.page.id],
		`/pages/${payload.page.id}/components/${payload.component.id}`,
	);
	assert(
		response.data.status === payload.component.status &&
			response.data.name === payload.component.name,
		new Error(
			`Statuspage component mismatch: ${payload.page.id}, ${payload.component.id}`,
		),
	);
}

/**
 * Link an incident to a statuspage and add ping message to its timeline
 *
 * @param context - worker context
 * @param session - execution session
 * @param request - action handler request
 * @param statuspage - statuspage contract
 * @param incident - incident contract
 */
async function initIncident(
	context: WorkerContext,
	session: AutumnDBSession,
	request: ActionHandlerRequest,
	statuspage: StatuspageContract,
	incident: IncidentContract,
): Promise<void> {
	// Link incident to statuspage
	await context.insertCard(
		session,
		context.cards['link@1.0.0'] as TypeContract,
		{
			timestamp: request.timestamp,
			attachEvents: false,
		},
		{
			slug: `link-statuspage-${statuspage.id}-has-attached-${incident.slug}`,
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

	// Actor to create ping message with
	let actor = request.actor;
	const hubot = await context.getCardBySlug(
		context.privilegedSession,
		'user-hubot@1.0.0',
	);
	if (hubot) {
		actor = hubot.id;
	}

	// Add message with ping to incident timeline
	await context.insertCard(
		session,
		context.cards['action-request@1.0.0'] as TypeContract,
		{
			timestamp: request.timestamp,
			attachEvents: false,
		},
		{
			data: {
				actor,
				context: request.logContext,
				action: 'action-create-event@1.0.0',
				card: incident.id,
				type: incident.type,
				epoch: new Date().valueOf(),
				timestamp: request.timestamp,
				input: {
					id: incident.id,
				},
				arguments: {
					type: 'message',
					payload: {
						message: '@@reliability New incident from Statuspage',
					},
				},
			},
		},
	);
}

/**
 * Create incident contract from incident update webhook payload
 *
 * @param context - worker context
 * @param session - execution session
 * @param request - action handler request
 * @param payload - parsed webhook payload
 * @param statuspage - statuspage contract
 * @returns incident contract summary
 */
async function fromIncidentPayload(
	context: WorkerContext,
	session: AutumnDBSession,
	request: ActionHandlerRequest,
	payload: UpdatePayload,
	statuspage: StatuspageContract,
): Promise<ContractSummary> {
	assert(payload.incident);
	const status = getStatus(payload.incident.status);
	const incidentMirrorId = `${STATUSPAGE_ENDPOINT}/pages/${payload.page.id}/incidents/${payload.incident.id}`;
	let incident = (await getByMirrorId(
		context,
		'incident',
		incidentMirrorId,
	)) as IncidentContract;
	if (incident) {
		const patch: Operation[] = [];
		if (incident.data.status !== status) {
			patch.push({
				op: 'replace',
				path: '/data/status',
				value: status,
			});
		}
		if (incident.data.impact !== payload.incident.impact) {
			patch.push({
				op: 'replace',
				path: '/data/impact',
				value: payload.incident.impact,
			});
		}
		if (incident.name !== payload.incident.name) {
			patch.push({
				op: 'replace',
				path: '/name',
				value: payload.incident.name,
			});
		}
		await context.patchCard(
			session,
			context.cards['incident@1.0.0'] as TypeContract,
			{
				timestamp: request.timestamp,
				attachEvents: true,
				actor: request.actor,
			},
			incident,
			patch,
		);
	} else {
		// Create new incident
		incident = (await context.insertCard(
			session,
			context.cards['incident@1.0.0'] as TypeContract,
			{
				timestamp: request.timestamp,
				attachEvents: true,
				actor: request.actor,
			},
			{
				name: payload.incident.name || '',
				slug: `incident-${uuidv4()}`,
				data: {
					description: payload.page.status_description,
					status,
					mirrors: [incidentMirrorId],
					impact: payload.incident.impact,
				},
			},
		)) as IncidentContract;
		await initIncident(context, session, request, statuspage, incident);
	}

	return {
		id: incident.id,
		type: incident.type,
		version: incident.version,
		slug: incident.slug,
	};
}

/**
 * Create incident contract from component update webhook payload
 *
 * @param context - worker context
 * @param session - execution session
 * @param request - action handler request
 * @param payload - parsed webhook payload
 * @param statuspage - statuspage contract
 * @returns incident contract summary
 */
async function fromComponentPayload(
	context: WorkerContext,
	session: AutumnDBSession,
	request: ActionHandlerRequest,
	payload: UpdatePayload,
	statuspage: StatuspageContract,
): Promise<ContractSummary> {
	assert(payload.component);
	const status = getStatus(payload.component.status);
	const incidentMirrorId = `${STATUSPAGE_ENDPOINT}/pages/${payload.page.id}/components/${payload.component.id}`;
	let incident = (await getByMirrorId(
		context,
		'incident',
		incidentMirrorId,
	)) as IncidentContract;
	if (incident) {
		const patch: Operation[] = [];
		if (incident.data.status !== status) {
			patch.push({
				op: 'replace',
				path: '/data/status',
				value: status,
			});
		}
		if (incident.name !== payload.component.name) {
			patch.push({
				op: 'replace',
				path: '/name',
				value: payload.component.name,
			});
		}
		await context.patchCard(
			session,
			context.cards['incident@1.0.0'] as TypeContract,
			{
				timestamp: request.timestamp,
				attachEvents: true,
				actor: request.actor,
			},
			incident,
			patch,
		);
	} else {
		// Create new incident
		incident = (await context.insertCard(
			session,
			context.cards['incident@1.0.0'] as TypeContract,
			{
				timestamp: request.timestamp,
				attachEvents: true,
				actor: request.actor,
			},
			{
				name: payload.component.name || '',
				slug: `incident-${uuidv4()}`,
				data: {
					description: payload.page.status_description,
					status,
					mirrors: [incidentMirrorId],
				},
			},
		)) as IncidentContract;
		await initIncident(context, session, request, statuspage, incident);
	}

	return {
		id: incident.id,
		type: incident.type,
		version: incident.version,
		slug: incident.slug,
	};
}

const handler: ActionDefinition['handler'] = async (
	session,
	context,
	contract,
	request,
) => {
	// Validate webhook Statuspage page ID
	const payload = contract.data.payload as UpdatePayload;
	const token = environment.integration.statuspage.pages[payload.page.id];
	assert(
		token,
		new Error(`Webhook from unknown Statuspage: ${payload.page.id}`),
	);

	// Try to get statuspage contract
	const statuspageMirrorId = `${STATUSPAGE_ENDPOINT}/pages/${payload.page.id}`;
	let statuspage = (await getByMirrorId(
		context,
		'statuspage',
		statuspageMirrorId,
	)) as StatuspageContract;

	// Create statuspage contract if it doesn't exist
	if (!statuspage) {
		const remoteStatuspage = await httpStatuspage(
			token,
			`/pages/${payload.page.id}`,
		);
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
	}

	// Validate webhook
	await Promise.all([
		await validateIncidentWebhook(payload),
		await validateComponentWebhook(payload),
	]);

	// Upsert incident contract
	if (payload.incident) {
		return fromIncidentPayload(context, session, request, payload, statuspage);
	} else {
		return fromComponentPayload(context, session, request, payload, statuspage);
	}
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
