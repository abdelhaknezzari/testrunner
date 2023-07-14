import { ExtensionContext, Uri, commands, window, workspace, debug, FileType } from 'vscode';
import axios, { AxiosResponse } from 'axios';



const getCurrentBranchName = async (folder:string):Promise<String> => {
	const gitHeader = `${folder}/.git/HEAD`;
	const file = await workspace.openTextDocument(gitHeader);
	file.getText();
	return file.getText().trim().split('/heads/').at(-1) as string;
}

const pingGit =  async (token:string)=> {
	const url = 'https://github.tools.sap/api/v3/repos/CALMBuild/cdm-features-ui/pulls?state=open';
	const response = await axios.get(url, {
		headers: {
		  Authorization: `Bearer ${token}`,
		  "Content-Type": "application/json",
		}
	  });
	  return response;
} 


interface GherkinTokens {
	path: string,
	file: string,
	scenario: string,
	step: string,
	token: string
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
		GIT_TOKEN?:string
	}
}

function correctJson(json: string): string {
	return json
		.replace(/\/\/.*$/gm, '')
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


async function runIntegrationTests(conf:LaunchConfig): Promise<void> {
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

async function writeScenarioToFeatureFile(filePath: string, content: string): Promise<void> {
	const uri = Uri.file(filePath);
	const encoder = new TextEncoder();
	const data = encoder.encode(content);
	await workspace.fs.writeFile(uri, data);
}


async function readFeatureFiles(path: string): Promise<string[]> {
	try {
		const entries = await workspace.fs.readDirectory(Uri.file(path));
		const featureFiles: string[] = entries.filter(entry => entry[1] === FileType.File && entry[0].endsWith('.feature'))
			.map(entry => path.concat('/').concat(entry[0]));

		const subfolderUris: Uri[] = entries.filter(entry => entry[1] === FileType.Directory)
			.map(entry => Uri.joinPath(Uri.file(path), entry[0]));


		for (const uri of subfolderUris) {
			const files = await workspace.fs.readDirectory(uri);
			const otherFiles = files.filter(entry => entry[1] === FileType.File && entry[0].endsWith('.feature'))
				.map(entry => uri.path.concat('/').concat(entry[0]));
			featureFiles.push(...otherFiles);
		}
		return featureFiles;
	} catch (error) {
		console.error('Error reading subfolders:', error);
	}
	return [];
}

async function readFeatureTkens(files: string[]): Promise<GherkinTokens[]> {
	let gherkinSteps: GherkinTokens[] = [];
	for (const file of files) {
		let gherkin: GherkinTokens = {
			path: '',
			file: '',
			scenario: '',
			step: '',
			token: ''
		};
		const document = await workspace.openTextDocument(file);
		const lines: string[] = document.getText().split("\n");
		gherkin.path = file;

		for (const line of lines) {
			let scenario = '';
			if (line.trimStart().startsWith('Scenario:')) {
				scenario = line;
			}
			gherkin.step = line;
			gherkin.scenario = scenario;
			gherkinSteps.push(gherkin);
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
			//'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' 
			const testFeatureFile = featureFilePath.split('/features/').at(0)?.concat('/features/Testing.feature') as string;
			const scenarioText = await extractScenario(featureFilePath, lineNbr);
			const conf = await getLaunchConfig(featureFilePath.split('/features/').at(0) as string, 'Testing.feature');

			const currentBranchName = await getCurrentBranchName(featureFilePath.split('/features/').at(0) as string);
			const pingRes = await pingGit( conf.env.GIT_TOKEN as string);

			const featureFiles = await readFeatureFiles(featureFilePath.split('/features/').at(0)?.concat('/features') as string);
			const steps = await readFeatureTkens(featureFiles);

			await writeScenarioToFeatureFile(testFeatureFile, 'Feature: testing\n'.concat('\n').concat(scenarioText));
				await runIntegrationTests(conf);
		})
	);
}


export function deactivate() {
	window.showInformationMessage('[Cucumber Step Definition Generator] Goodbye.');
}