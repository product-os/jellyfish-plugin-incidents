import { PluginManager } from '@balena/jellyfish-worker';
import { incidentsPlugin } from '../../lib/index';

const pluginManager = new PluginManager([incidentsPlugin()]);

test('Expected contracts are loaded', () => {
	const contracts = pluginManager.getCards();
	expect(contracts['incident'].name).toEqual('Incident');
	expect(contracts['post-mortem'].name).toEqual('Post-mortem');
	expect(contracts['channel-incidents'].name).toEqual('Incidents');
});
