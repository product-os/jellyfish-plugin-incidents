import { defaultPlugin } from '@balena/jellyfish-plugin-default';
import { productOsPlugin } from '@balena/jellyfish-plugin-product-os';
import { testUtils as workerTestUtils } from '@balena/jellyfish-worker';
import _ from 'lodash';
import path from 'path';
import { incidentsPlugin } from '../../lib';
import webhooks from './webhooks';

let ctx: workerTestUtils.TestContext;

beforeAll(async () => {
	ctx = await workerTestUtils.newContext({
		plugins: [productOsPlugin(), defaultPlugin(), incidentsPlugin()],
	});
	await workerTestUtils.translateBeforeAll(ctx);
});

afterEach(async () => {
	await workerTestUtils.translateAfterEach(ctx);
});

afterAll(() => {
	workerTestUtils.translateAfterAll();
	return workerTestUtils.destroyContext(ctx);
});

describe('nodeping-translate', () => {
	for (const testCaseName of Object.keys(webhooks)) {
		const testCase = webhooks[testCaseName];
		const expected = {
			head: testCase.expected.head,
			tail: _.sortBy(testCase.expected.tail, workerTestUtils.tailSort),
		};
		for (const variation of workerTestUtils.getVariations(testCase.steps, {
			permutations: false,
		})) {
			if (variation.combination.length !== testCase.steps.length) {
				continue;
			}

			test(`(${variation.name}) ${testCaseName}`, async () => {
				await workerTestUtils.webhookScenario(
					ctx,
					{
						steps: variation.combination,
						prepareEvent: async (event: any): Promise<any> => {
							return event;
						},
						offset:
							_.findIndex(testCase.steps, _.first(variation.combination)) + 1,
						headIndex: testCase.headIndex || 0,
						original: testCase.steps,
						ignoreUpdateEvents: true,
						expected: _.cloneDeep(expected),
						name: testCaseName,
						variant: variation.name,
					},
					{
						source: 'nodeping',
						baseUrl: 'https://nodeping.com',
						uriPath: /.*/,
						basePath: path.join(__dirname, 'webhooks'),
						isAuthorized: () => {
							return true;
						},
						head: {
							ignore: {
								incident: ['slug'],
							},
						},
					},
				);
			});
		}
	}
});
