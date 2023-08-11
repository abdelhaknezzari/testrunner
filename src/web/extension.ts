import { CancellationToken, CompletionItem, CompletionItemProvider, CompletionList, ExtensionContext, Position, ProviderResult, TextDocument, Uri, commands, languages, window } from 'vscode';
import testRunner from './Runner';
import channel from './Channel';
import completer from './Completer';

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

	context.subscriptions.push(
		commands.registerCommand('testRunner.runScenariosAfterwards', async (uri: Uri) => {
			await testRunner.runAfter(uri);
		})
	);

	context.subscriptions.push(
		commands.registerCommand('testRunner.runPreviousScenarios', async (uri: Uri) => {
			await testRunner.runBefore(uri);
		})
	);



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