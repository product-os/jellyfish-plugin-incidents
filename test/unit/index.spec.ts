import { channelsPlugin } from '@balena/jellyfish-plugin-channels';
import { defaultPlugin } from '@balena/jellyfish-plugin-default';
import { PluginManager } from '@balena/jellyfish-worker';
import { incidentsPlugin } from '../../lib/index';

const pluginManager = new PluginManager([
	defaultPlugin(),
	channelsPlugin(),
	incidentsPlugin(),
]);

test('Expected contracts are loaded', () => {
	const contracts = pluginManager.getCards();
	expect(contracts['incident'].name).toEqual('Incident');
	expect(contracts['channel-incidents'].name).toEqual('Incidents');
	expect(contracts['post-mortem'].name).toEqual('Post-mortem');
	expect(contracts['channel-post-mortems'].name).toEqual('Post-mortems');
});
