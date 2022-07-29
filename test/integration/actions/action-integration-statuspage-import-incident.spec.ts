import { testUtils } from '@balena/jellyfish-worker';
import { strict as assert } from 'assert';
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

describe('action-integration-statuspage-import-incident', () => {
	test('should upsert statuspage and incident contracts', async () => {
		// Nock page and incident details
		nock(STATUSPAGE_ENDPOINT)
			.get('/pages/foobar')
			.reply(200, {
				id: 'foobar',
				name: 'ProductOS',
				subdomain: 'productos',
				domain: 'status.jel.ly.fish',
				page_description: 'buzbaz',
			})
			.get('/pages/foobar/incidents/yf8nfxmhb2jg')
			.reply(200, {
				id: 'yf8nfxmhb2jg',
				status: 'major_outage',
				impact: 'major',
				name: 'ProductOS outage',
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
							id: 'foobar',
							status_description: 'Major System Outage',
						},
						incident: {
							id: 'yf8nfxmhb2jg',
							status: 'major_outage',
							impact: 'major',
							name: 'ProductOS outage',
						},
					},
				},
			},
		);
		await ctx.flushAll(ctx.session);

		// Assert the statuspage contract was created
		await ctx.waitForMatch({
			type: 'object',
			required: ['type', 'data'],
			properties: {
				type: {
					const: 'statuspage@1.0.0',
				},
				data: {
					type: 'object',
					required: ['name', 'domain', 'subdomain', 'mirrors', 'description'],
					properties: {
						name: {
							const: 'ProductOS',
						},
						domain: {
							const: 'status.jel.ly.fish',
						},
						subdomain: {
							const: 'productos',
						},
						mirrors: {
							type: 'array',
							contains: {
								const: 'https://api.statuspage.io/v1/pages/foobar',
							},
						},
						description: {
							const: 'buzbaz',
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
					const: 'ProductOS outage',
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
							const: 'major',
						},
						mirrors: {
							type: 'array',
							contains: {
								const:
									'https://api.statuspage.io/v1/pages/foobar/incidents/yf8nfxmhb2jg',
							},
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
									const: '@@reliability New incident from Statuspage',
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
							const: 'incident@1.0.0',
						},
						id: {
							const: incident.id,
						},
					},
				},
			},
		});

		// Simulate incident resolution update
		nock(STATUSPAGE_ENDPOINT)
			.get('/pages/foobar')
			.reply(200, {
				id: 'foobar',
				name: 'ProductOS',
				subdomain: 'productos',
				domain: 'status.jel.ly.fish',
				page_description: 'buzbaz',
			})
			.get('/pages/foobar/incidents/yf8nfxmhb2jg')
			.reply(200, {
				id: 'yf8nfxmhb2jg',
				status: 'resolved',
				impact: 'minor',
				name: 'ProductOS outage',
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
							id: 'foobar',
							status_description: 'System Resolved',
						},
						incident: {
							id: 'yf8nfxmhb2jg',
							status: 'resolved',
							impact: 'minor',
							name: 'ProductOS outage',
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
		expect(updated.data.impact).toEqual('minor');
	});
});
