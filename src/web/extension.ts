import { ExtensionContext, Uri, commands, window, workspace, debug } from 'vscode';


interface LaunchConfig {
		name: string,
		type: string,
		request: string,
		autoAttachChildProcesses: boolean,
		program: string,
		console: string,
		args: string[],
		env: {
			DEBUG: boolean,
			skipInstrument: boolean,
			MAX_PARALLEL_INSTANCES: number,
			YOUR_OS: string,
			ABSOLUTE_PATH_TO_BACKEND: string,
			CHROME_MODE: string
		}
}

function correctJson(json:string):string {
	return json
		.replace(/\/\/.*$/gm, '')
		.replace(/\/\*[\s\S]*?\*\//gm, '')
		.replace(/\s/g, '')
		.replace(/\n/g, '')
		.replace(/,(?=,|}|])/g, '');
}

async function readLaunchJsonConfig(path: string) : Promise<LaunchConfig> {
	const json = await workspace.openTextDocument(`${path}/.vscode/launch.json`);
	const jsonAsString = correctJson(json.getText());
	return JSON.parse(jsonAsString).configurations.at(0) as LaunchConfig;
}


async function getLaunchConfig( path: string,featureFile: string ):Promise<LaunchConfig>  {
	const conf = await readLaunchJsonConfig(path);
	conf.args = ['./wdio.conf.js','--spec',featureFile];
	return conf;
}


async function runIntegrationTests(path: string, featureFile: string): Promise<void> {
	const conf = await getLaunchConfig(path, featureFile );
	debug.startDebugging(undefined, conf);
}


async function extractScenario(featureFilePath: string, scenarioLine: number): Promise<string> {
	const document = await workspace.openTextDocument(featureFilePath);

	const lines: string[] = document.getText().split("\n");
	const steps = lines.map((step, index) => { return { index, text: step }; });
	const upperStep = steps.find(step => step.index > scenarioLine && ( step.text === '' || step.text === '\r'  ) );

	return steps.filter(step => step.index >= scenarioLine && step.index <= (upperStep?.index as number))
		.map(step => step.text)
		.join("\n");
}

async function writeScenarioToFeatureFile(filePath: string, content: string): Promise<void> {
	const uri = Uri.file(filePath);
	const encoder = new TextEncoder();
	const data = encoder.encode(content);
	await workspace.fs.writeFile(uri, data);
}

export function activate(context: ExtensionContext) {
	context.subscriptions.push(
		commands.registerCommand('testRunner.runCurrentFeature', async (uri: Uri) => {
			const featureFilePath = uri.path;
			const featureFile = featureFilePath.split('/features/').at(1)?.split("/").at(-1) as string;
			await runIntegrationTests(featureFilePath.split('/features/').at(0) as string, featureFile);
		})
	);

	context.subscriptions.push(
		commands.registerCommand('testRunner.runCurrentScenario', async (uri: Uri) => {
			const lineNbr = window?.activeTextEditor?.selection?.active?.line as number;
			const featureFilePath = uri.path;

			const testFeatureFile = featureFilePath.split('/features/').at(0)?.concat('/features/Testing.feature') as string;
			const scenarioText = await extractScenario(featureFilePath, lineNbr);
			
			await writeScenarioToFeatureFile(testFeatureFile, 'Feature: testing\n'.concat('\n').concat(scenarioText));
			await runIntegrationTests(featureFilePath.split('/features/').at(0) as string, 'Testing.feature');
		})
	);
}


export function deactivate() {
	window.showInformationMessage('[Cucumber Step Definition Generator] Goodbye.');
}