import { ExtensionContext, Uri, commands, window, workspace } from 'vscode';
import testRunner from './Runner';
import channel from './Channel';
import completer from './Completer';
import config from './Config';

export async function activate(context: ExtensionContext) {


	context.subscriptions.push(
		commands.registerCommand('testRunner.runTillFailedScenario', async (uri: Uri) => {
			await testRunner.runFeatureTillFailedScenario(uri);
		})
	);

	context.subscriptions.push(
		commands.registerCommand('testRunner.runFailedFeature', async (uri: Uri) => {
			await testRunner.runFailedFeature(uri);
		})
	);

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

	context.subscriptions.push(
		commands.registerCommand('testRunner.runScenariosAfterwards', async (uri: Uri) => {
			await testRunner.runAfter(uri);
		})
	);

	// const deactivatedFunctions = process.env.TEST_RUNNER_DEACTIVATED_FUNCTIONS;
	// if(deactivatedFunctions){
	// 	const activateRunTillFailedScenario = !deactivatedFunctions.includes( "runTillFailedScenario");
	// 	commands.executeCommand('setContext', 'showCommandRunTillFailedScenario', activateRunTillFailedScenario);
	// 	const activateRunFailedFeature = !deactivatedFunctions.includes( "runFailedFeature");
	// 	commands.executeCommand('setContext', 'showCommandRunFailedFeature', activateRunFailedFeature);
	// } else {
	// 	commands.executeCommand('setContext', 'showCommandRunTillFailedScenario', true);
	// 	commands.executeCommand('setContext', 'showCommandRunFailedFeature', true);
	// }


	// context.subscriptions.push(
	// 	commands.registerCommand('testRunner.runPreviousScenarios', async (uri: Uri) => {
	// 		await testRunner.runBefore(uri);
	// 	})
	// );



	// context.subscriptions.push(
	// 	languages.registerCompletionItemProvider(
	// 	  { pattern: '**/*.feature' },
	// 	  completer,
	// 	  ' ' 
	// 	)
	//   );


}

export function deactivate() {
	window.showInformationMessage('[CDM Test Runner] Goodbye.');
	channel.message("[CDM Test Runner] Goodbye.");
}