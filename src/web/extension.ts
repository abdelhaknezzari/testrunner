import { ExtensionContext, Uri, commands, window} from 'vscode';
import testRunner from './Runner';
import channel from './Channel';


export function activate(context: ExtensionContext) {
	context.subscriptions.push(
		commands.registerCommand('testRunner.runCurrentFeature', async (uri: Uri) => {
          await testRunner.runFeature(uri);
		})
	);

	context.subscriptions.push(
		commands.registerCommand('testRunner.runCurrentScenario', async (uri: Uri) => {
			await testRunner.runScenario(uri);
		})
	);

	context.subscriptions.push(
		commands.registerCommand('testRunner.runPullReqestFailingScenarios', async (uri: Uri) => {
			await testRunner.runPullRequest(uri);
		})
	);
}

export function deactivate() {
	window.showInformationMessage('[CDM Test Runner] Goodbye.');
    channel.message("[CDM Test Runner] Goodbye.");
}