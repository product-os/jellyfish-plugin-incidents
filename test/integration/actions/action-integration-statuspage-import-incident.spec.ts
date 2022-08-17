import { testUtils } from '@balena/jellyfish-worker';
import { strict as assert } from 'assert';
import { testUtils as autumndbTestUtils } from 'autumndb';
import nock from 'nock';
import { v4 as uuidv4 } from 'uuid';
import { IncidentContract, incidentsPlugin } from '../../../lib';
import { STATUSPAGE_ENDPOINT } from '../../../lib/actions/action-integration-statuspage-import-incident';

let ctx: testUtils.TestContext;
let hubotUser: any;

beforeAll(async () => {
	ctx = await testUtils.newContext({
		plugins: [incidentsPlugin()],
	});
	hubotUser = await ctx.createUser('hubot');
	nock.cleanAll();
});

afterEach(() => {
	nock.cleanAll();
});

afterAll(async () => {
	await testUtils.destroyContext(ctx);
});

describe('incident update webhooks', () => {
	test('should upsert statuspage and incident contracts', async () => {
		// Nock page and incident details
		const data = {
			page: {
				id: 'foobar',
				name: 'ProductOS',
				subdomain: 'productos',
				domain: 'status.jel.ly.fish',
				page_description: 'buzbaz',
			},
			incident: {
				id: autumndbTestUtils.generateRandomId().split('-')[0],
				status: 'major_outage',
				impact: 'major',
				name: 'ProductOS outage',
			},
		};
		nock(STATUSPAGE_ENDPOINT)
			.get(`/pages/${data.page.id}`)
			.reply(200, data.page)
			.get(`/pages/${data.page.id}/incidents/${data.incident.id}`)
			.reply(200, data.incident);

		await ctx.worker.insertCard(
			ctx.logContext,
			ctx.session,
			ctx.worker.typeContracts['external-event@1.0.0'],
			{
				timestamp: new Date().toISOString(),
				actor: ctx.adminUserId,
				attachEvents: false,
				reason: null,
			},
			{
				slug: `external-event-${uuidv4()}`,
				data: {
					source: 'statuspage',
					headers: {},
					payload: {
						page: {
							id: data.page.id,
							status_description: 'Major System Outage',
						},
						incident: data.incident,
					},
				},
			},
		);
		await ctx.flushAll(ctx.session);

		// Assert the statuspage contract was created
		const statuspage = await ctx.waitForMatch({
			type: 'object',
			required: ['type', 'name', 'data'],
			properties: {
				type: {
					const: 'statuspage@1.0.0',
				},
				name: {
					const: data.page.name,
				},
				data: {
					type: 'object',
					required: ['domain', 'subdomain', 'mirrors', 'description'],
					properties: {
						domain: {
							const: data.page.domain,
						},
						subdomain: {
							const: data.page.subdomain,
						},
						mirrors: {
							type: 'array',
							contains: {
								const: `https://api.statuspage.io/v1/pages/${data.page.id}`,
							},
						},
						description: {
							const: data.page.page_description,
						},
					},
				},
			},
		});

		// Assert the incident contract was created
		const incident = await ctx.waitForMatch({
			type: 'object',
			required: ['type', 'name', 'data'],
			properties: {
				type: {
					const: 'incident@1.0.0',
				},
				name: {
					const: `${statuspage.name} - ${data.incident.name}`,
				},
				data: {
					type: 'object',
					required: ['status', 'description', 'mirrors'],
					properties: {
						status: {
							const: 'open',
						},
						description: {
							const: 'Major System Outage',
						},
						impact: {
							const: data.incident.impact,
						},
						mirrors: {
							type: 'array',
							contains: {
								const: `https://api.statuspage.io/v1/pages/${data.page.id}/incidents/${data.incident.id}`,
							},
						},
					},
				},
			},
		});

		// Assert thread for ping was created and linked
		const thread = await ctx.waitForMatch({
			type: 'object',
			required: ['type', 'name'],
			properties: {
				type: {
					const: 'thread@1.0.0',
				},
				name: {
					const: incident.name,
				},
			},
			$$links: {
				'is of': {
					type: 'object',
					required: ['type', 'id'],
					properties: {
						type: {
							const: 'incident@1.0.0',
						},
						id: {
							const: incident.id,
						},
					},
				},
			},
		});

		// Assert the ping message was created
		await ctx.waitForMatch({
			type: 'object',
			required: ['type', 'data'],
			properties: {
				type: {
					const: 'message@1.0.0',
				},
				data: {
					type: 'object',
					required: ['actor', 'payload'],
					properties: {
						actor: {
							const: hubotUser.id,
						},
						payload: {
							type: 'object',
							required: ['message'],
							properties: {
								message: {
									pattern: '@@balena New incident from Statuspage',
								},
							},
						},
					},
				},
			},
			$$links: {
				'is attached to': {
					type: 'object',
					required: ['type', 'id'],
					properties: {
						type: {
							const: 'thread@1.0.0',
						},
						id: {
							const: thread.id,
						},
					},
				},
			},
		});

		// Simulate incident resolution update
		nock(STATUSPAGE_ENDPOINT)
			.get(`/pages/${data.page.id}`)
			.reply(200, data.page)
			.get(`/pages/${data.page.id}/incidents/${data.incident.id}`)
			.reply(200, {
				id: data.incident.id,
				status: 'resolved',
				impact: data.incident.impact,
				name: data.incident.name,
			});

		await ctx.worker.insertCard(
			ctx.logContext,
			ctx.session,
			ctx.worker.typeContracts['external-event@1.0.0'],
			{
				timestamp: new Date().toISOString(),
				actor: ctx.adminUserId,
				attachEvents: false,
				reason: null,
			},
			{
				slug: `external-event-${uuidv4()}`,
				data: {
					source: 'statuspage',
					headers: {},
					payload: {
						page: {
							id: data.page.id,
							status_description: 'System Resolved',
						},
						incident: {
							id: data.incident.id,
							status: 'resolved',
							impact: data.incident.impact,
							name: data.incident.name,
						},
					},
				},
			},
		);
		await ctx.flushAll(ctx.session);

		// Assert the contract status was updated
		const updated = await ctx.kernel.getContractById<IncidentContract>(
			ctx.logContext,
			ctx.session,
			incident.id,
		);
		assert(updated);
		expect(updated.data.status).toEqual('resolved');
	});
});

describe('component update webhooks', () => {
	test('should upsert statuspage and incident contracts', async () => {
		// Nock page and incident details
		const data = {
			page: {
				id: 'foobar',
				name: 'ProductOS',
				subdomain: 'productos',
				domain: 'status.jel.ly.fish',
				page_description: 'buzbaz',
			},
			component: {
				id: autumndbTestUtils.generateRandomId().split('-')[0],
				status: 'degraded_performance',
				name: 'Upstream Hosting Provider - Heroku',
			},
		};
		nock(STATUSPAGE_ENDPOINT)
			.get(`/pages/${data.page.id}`)
			.reply(200, data.page)
			.get(`/pages/${data.page.id}/components/${data.component.id}`)
			.reply(200, data.component);

		await ctx.worker.insertCard(
			ctx.logContext,
			ctx.session,
			ctx.worker.typeContracts['external-event@1.0.0'],
			{
				timestamp: new Date().toISOString(),
				actor: ctx.adminUserId,
				attachEvents: false,
				reason: null,
			},
			{
				slug: `external-event-${uuidv4()}`,
				data: {
					source: 'statuspage',
					headers: {},
					payload: {
						page: {
							id: data.page.id,
							status_description: 'Major System Outage',
						},
						component: data.component,
					},
				},
			},
		);
		await ctx.flushAll(ctx.session);

		// Assert the statuspage contract was created
		const statuspage = await ctx.waitForMatch({
			type: 'object',
			required: ['type', 'data'],
			properties: {
				type: {
					const: 'statuspage@1.0.0',
				},
				name: {
					const: data.page.name,
				},
				data: {
					type: 'object',
					required: ['domain', 'subdomain', 'mirrors', 'description'],
					properties: {
						domain: {
							const: data.page.domain,
						},
						subdomain: {
							const: data.page.subdomain,
						},
						mirrors: {
							type: 'array',
							contains: {
								const: `https://api.statuspage.io/v1/pages/${data.page.id}`,
							},
						},
						description: {
							const: data.page.page_description,
						},
					},
				},
			},
		});

		// Assert the incident contract was created
		const incident = await ctx.waitForMatch({
			type: 'object',
			required: ['type', 'name', 'data'],
			properties: {
				type: {
					const: 'incident@1.0.0',
				},
				name: {
					const: `${statuspage.name} - ${data.component.name}: ${data.component.status}`,
				},
				data: {
					type: 'object',
					required: ['status', 'description', 'mirrors'],
					properties: {
						status: {
							const: 'open',
						},
						description: {
							const: 'Major System Outage',
						},
						mirrors: {
							type: 'array',
							contains: {
								const: `https://api.statuspage.io/v1/pages/${data.page.id}/components/${data.component.id}`,
							},
						},
					},
				},
			},
		});

		// Assert thread for ping was created and linked
		const thread = await ctx.waitForMatch({
			type: 'object',
			required: ['type', 'name'],
			properties: {
				type: {
					const: 'thread@1.0.0',
				},
				name: {
					const: incident.name,
				},
			},
			$$links: {
				'is of': {
					type: 'object',
					required: ['type', 'id'],
					properties: {
						type: {
							const: 'incident@1.0.0',
						},
						id: {
							const: incident.id,
						},
					},
				},
			},
		});

		// Assert the ping message was created
		await ctx.waitForMatch({
			type: 'object',
			required: ['type', 'data'],
			properties: {
				type: {
					const: 'message@1.0.0',
				},
				data: {
					type: 'object',
					required: ['actor', 'payload'],
					properties: {
						actor: {
							const: hubotUser.id,
						},
						payload: {
							type: 'object',
							required: ['message'],
							properties: {
								message: {
									pattern: '@@balena New incident from Statuspage',
								},
							},
						},
					},
				},
			},
			$$links: {
				'is attached to': {
					type: 'object',
					required: ['type', 'id'],
					properties: {
						type: {
							const: 'thread@1.0.0',
						},
						id: {
							const: thread.id,
						},
					},
				},
			},
		});

		// Simulate incident resolution update
		nock(STATUSPAGE_ENDPOINT)
			.get(`/pages/${data.page.id}`)
			.reply(200, data.page)
			.get(`/pages/${data.page.id}/components/${data.component.id}`)
			.reply(200, {
				id: data.component.id,
				status: 'operational',
				name: data.component.name,
			});

		await ctx.worker.insertCard(
			ctx.logContext,
			ctx.session,
			ctx.worker.typeContracts['external-event@1.0.0'],
			{
				timestamp: new Date().toISOString(),
				actor: ctx.adminUserId,
				attachEvents: false,
				reason: null,
			},
			{
				slug: `external-event-${uuidv4()}`,
				data: {
					source: 'statuspage',
					headers: {},
					payload: {
						page: {
							id: data.page.id,
							status_description: 'System Resolved',
						},
						component: {
							id: data.component.id,
							status: 'operational',
							name: data.component.name,
						},
					},
				},
			},
		);
		await ctx.flushAll(ctx.session);

		// Assert the contract status was updated
		const updated = await ctx.kernel.getContractById<IncidentContract>(
			ctx.logContext,
			ctx.session,
			incident.id,
		);
		assert(updated);
		expect(updated.data.status).toEqual('resolved');
	});
});
