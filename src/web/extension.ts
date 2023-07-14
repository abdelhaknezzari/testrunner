import { ExtensionContext, Uri, commands, window, workspace, debug, FileType } from 'vscode';
import { getFailedScenarios, FailedScenario } from './githubAPI';
import * as Path from 'path';



const getCurrentBranchName = async (folder: string): Promise<string> => {
	const gitHeader = `${folder}/.git/HEAD`;
	const file = await workspace.openTextDocument(gitHeader);
	file.getText();
	return file.getText().trim().split('/heads/').at(-1) as string;
}


interface GherkinTokens {
	path: string,
	file: string,
	featureName: string,
	scenario: string,
	step: string,
	token: string
}

interface FeatureFolder {
	name: string,
	path: string
}


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
		CHROME_MODE: string,
		GIT_TOKEN?: string,
		REPO_URL?: string
	}
}

function correctJson(json: string): string {
	return json
		//  Remove comments
		.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '')
		// but keep http::// urls
		.replace(/"http:\/\/[^"]+"/g, (match) => match.replace(/\/\//g, '\\/\\/'))
		.replace(/\/\*[\s\S]*?\*\//gm, '')
		.replace(/\s/g, '')
		.replace(/\n/g, '')
		.replace(/,(?=,|}|])/g, '');
}

async function readLaunchJsonConfig(path: string): Promise<LaunchConfig> {
	const json = await workspace.openTextDocument(`${path}/.vscode/launch.json`);
	const jsonAsString = correctJson(json.getText());
	return JSON.parse(jsonAsString).configurations.at(0) as LaunchConfig;
}


async function getLaunchConfig(path: string, featureFile: string): Promise<LaunchConfig> {
	const conf = await readLaunchJsonConfig(path);
	conf.args = ['./wdio.conf.js', '--spec', featureFile];
	return conf;
}


async function runIntegrationTests(conf: LaunchConfig): Promise<void> {
	debug.startDebugging(undefined, conf);
}


async function extractScenario(featureFilePath: string, scenarioLine: number): Promise<string> {
	const document = await workspace.openTextDocument(featureFilePath);

	const lines: string[] = document.getText().split("\n");
	const steps = lines.map((step, index) => { return { index, text: step }; });
	const upperStep = steps.find(step => step.index > scenarioLine && (step.text === '' || step.text === '\r'));

	return steps.filter(step => step.index >= scenarioLine && step.index <= (upperStep?.index as number))
		.map(step => step.text)
		.join("\n");
}

function extractScenarios(failedScenarios: FailedScenario[], steps: GherkinTokens[]): string {
	let scenariosText = "";
	for (const scenario of failedScenarios) {
		const stepsOfScenario = steps.filter(step => step.featureName === scenario.feature && step.scenario === scenario.scenario)
			.map(step => step.step)
			.join("\n");
		scenariosText = scenariosText.concat(stepsOfScenario).concat("\n");
	}

	return scenariosText;
}

async function writeScenarioToFeatureFile(filePath: string, content: string): Promise<void> {
	const uri = Uri.file(filePath);
	const encoder = new TextEncoder();
	const data = encoder.encode(content);
	await workspace.fs.writeFile(uri, data);
}

async function readFolders(path: string): Promise<string[]> {

	const featureFolders: string[] = [];
	featureFolders.push(path);
	const entries = await workspace.fs.readDirectory(Uri.file(path));

	const subfolderUris: Uri[] = entries.filter(entry => entry[1] === FileType.Directory)
		.map(entry => Uri.joinPath(Uri.file(path), entry[0]));

	for (const folder of subfolderUris) {
		const subFolders = await readFolders(folder.path);
		featureFolders.push(...subFolders);
	}

	return featureFolders;
}


async function readFeatureFiles(path: string): Promise<FeatureFolder[]> {
	try {
		const folders = await readFolders(path);
		const featureFiles: FeatureFolder[] = [];

		for (const folder of folders) {
			const files = await workspace.fs.readDirectory(Uri.file(folder));
			const otherFiles = files.filter(entry => entry[1] === FileType.File && entry[0].endsWith('.feature'))
				.map(entry => {
					return {
						path: folder.concat('/').concat(entry[0]),
						name: entry[0]
					};
				}
				);
			featureFiles.push(...otherFiles);

		}

		return featureFiles;
	} catch (error) {
		console.error('Error reading subfolders:', error);
	}
	return [];
}

async function readFeatureSteps(files: FeatureFolder[]): Promise<GherkinTokens[]> {
	let gherkinSteps: GherkinTokens[] = [];
	for (const file of files) {

		const document = await workspace.openTextDocument(file.path);
		const lines: string[] = document.getText().split("\n");

		let scenario = "";
		for (const line of lines) {
			let step = line.trim();

			if (step.startsWith('Scenario:') || step.startsWith('Scenario Outline:')) {
				scenario = step.replace("Scenario Outline:", "").replace("Scenario:", "").trim();
			}
			const scn = scenario;
			gherkinSteps.push({
				path: file.path,
				featureName: file.name,
				step: step,
				scenario: scn,
				file: '',
				token: ''
			});
		}
	}
	return gherkinSteps;
}

export function activate(context: ExtensionContext) {
	context.subscriptions.push(
		commands.registerCommand('testRunner.runCurrentFeature', async (uri: Uri) => {
			const featureFilePath = uri.path;
			const featureFile = featureFilePath.split('/features/').at(1)?.split("/").at(-1) as string;
			const conf = await getLaunchConfig(featureFilePath.split('/features/').at(0) as string, featureFile);
			await runIntegrationTests(conf);
		})
	);

	context.subscriptions.push(
		commands.registerCommand('testRunner.runCurrentScenario', async (uri: Uri) => {
			const lineNbr = window?.activeTextEditor?.selection?.active?.line as number;
			const featureFilePath = uri.path;

			const testFeatureFile = featureFilePath.split('/features/').at(0)?.concat('/features/Testing.feature') as string;
			const scenarioText = await extractScenario(featureFilePath, lineNbr);
			const conf = await getLaunchConfig(featureFilePath.split('/features/').at(0) as string, 'Testing.feature');

			await writeScenarioToFeatureFile(testFeatureFile, 'Feature: testing\n'.concat('\n').concat(scenarioText));
			await runIntegrationTests(conf);
		})
	);

	context.subscriptions.push(
		commands.registerCommand('testRunner.runPullReqestFailingScenarios', async (uri: Uri) => {
			const lineNbr = window?.activeTextEditor?.selection?.active?.line as number;
			const featureFilePath = uri.path;
			const testFeatureFile = featureFilePath.split('/features/').at(0)?.concat('/features/Testing.feature') as string;

			const conf = await getLaunchConfig(featureFilePath.split('/features/').at(0) as string, 'Testing.feature');


			const currentBranchName = await getCurrentBranchName(featureFilePath.split('/features/').at(0) as string);
			const failedScenarios = await getFailedScenarios(currentBranchName, conf.env.REPO_URL as string, conf.env.GIT_TOKEN as string);

			let featureFiles = await readFeatureFiles(featureFilePath.split('/features/').at(0)?.concat('/features') as string);
			const failedFeatures = failedScenarios.map(scn => scn.feature);

			featureFiles = featureFiles.filter(feature => failedFeatures.indexOf(feature.name) !== -1);

			const steps = await readFeatureSteps(featureFiles);


			const scenariosText = extractScenarios(failedScenarios, steps);

			await writeScenarioToFeatureFile(testFeatureFile, 'Feature: testing\n'.concat('\n').concat(scenariosText));
			await runIntegrationTests(conf);
		})
	);
}


export function deactivate() {
	window.showInformationMessage('[Cucumber Step Definition Generator] Goodbye.');
}