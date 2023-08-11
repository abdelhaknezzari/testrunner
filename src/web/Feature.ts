import { FileType, Uri, workspace } from "vscode";
import { FailedScenario } from "./githubAPI";
import { FeatureFolder, GherkinStepToken } from "./GherkinTypes";



class Feature {

    async createScenario(uri: Uri, lineNbr: number) {
        const testFeatureFile = this.getRoot(uri.path).concat('/features/Testing.feature');

        const scenarioName = await feature.getScenarioName(uri, lineNbr);

        const steps = await feature.readFeatureSteps([{ name: this.getFeature(uri.path), path: uri.path }]);

        const scenarioText = feature.extractScenarios([{ feature: this.getFeature(uri.path), scenario: scenarioName, line: lineNbr }], steps);

        await this.writeScenarioToFeatureFile(testFeatureFile, 'Feature: testing\n'.concat('\n').concat(scenarioText));
    }

    async extractScenario(featureFilePath: string, scenarioLine: number): Promise<string> {
        const steps = await this.getSteps(featureFilePath);

        const upperStep = this.getStepByLine(steps, scenarioLine);

        return steps.filter(step => step.index >= scenarioLine && step.index <= (upperStep?.index as number))
            .map(step => step.text)
            .join("\n");
    }

    getStepByLine(steps: { index: number; text: string; }[], scenarioLine: number) {
        return steps.find(step => step.index === scenarioLine);
    }

    async getSteps(featureFilePath: string) {
        const document = await workspace.openTextDocument(featureFilePath);

        const lines: string[] = document.getText().split("\n");
        const steps = lines.map((step, index) => { return { index, text: step }; });
        return steps;
    }

    extractScenarios(failedScenarios: FailedScenario[], steps: GherkinStepToken[]): string {
        let scenariosText = "";
        for (const scenario of failedScenarios) {
            let stepsOfScenario = steps.filter(step => step.featureName === scenario.feature && step.scenario === scenario.scenario)
                .map(step => step.step)
                .join("\n");
            if (stepsOfScenario === '') {
                const stepsOfFeature = steps.filter(step => step.featureName === scenario.feature);
                const scenarioName = stepsOfFeature.at(scenario.line);
                if (scenarioName) {
                    stepsOfScenario = steps.filter(step => step.featureName === scenario.feature && step.scenario === scenarioName.scenario)
                        .map(step => step.step)
                        .join("\n");
                }
            }
            scenariosText = scenariosText.concat(stepsOfScenario).concat("\n");
        }

        return scenariosText;
    }

    async writeScenarioToFeatureFile(filePath: string, content: string): Promise<void> {
        const uri = Uri.file(filePath);
        const encoder = new TextEncoder();
        const data = encoder.encode(content);
        await workspace.fs.writeFile(uri, data);
    }

    async readFolders(path: string): Promise<string[]> {

        const featureFolders: string[] = [];
        featureFolders.push(path);
        const entries = await workspace.fs.readDirectory(Uri.file(path));

        const subfolderUris: Uri[] = entries.filter(entry => entry[1] === FileType.Directory)
            .map(entry => Uri.joinPath(Uri.file(path), entry[0]));

        for (const folder of subfolderUris) {
            const subFolders = await this.readFolders(folder.path);
            featureFolders.push(...subFolders);
        }

        return featureFolders;
    }

    async readFeatureFiles(path: string): Promise<FeatureFolder[]> {
        try {
            const folders = await this.readFolders(path);
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

    getRoot(featureFilePath: string): string {
        return featureFilePath.split('/features/').at(0) as string;
    }

    getFeature(featureFilePath: string): string {
        return featureFilePath.split('/features/').at(1)?.split("/").at(-1) as string;
    }

    async getScenarioName(uri: Uri, lineNbr: number) {
        const steps = await this.getSteps(uri.path);
        const scenario = this.getStepByLine(steps, lineNbr);
        const scenarioName = scenario?.text.trim().replace("Scenario:", "").replace("Scenario Outline:", "").trim() as string;
        return scenarioName;
    }


    async createFeature(uri: Uri, failedScenarios: FailedScenario[]) {
        const testFeatureFile = this.getRoot(uri.path).concat('/features/Testing.feature');
        let featureFiles = await this.readFeatureFiles(this.getRoot(uri.path).concat('/features'));
        const failedFeatures = failedScenarios.map(scn => scn.feature);

        featureFiles = featureFiles.filter(feature => failedFeatures.indexOf(feature.name) !== -1);

        const steps = await this.readFeatureSteps(featureFiles);

        const scenariosText = this.extractScenarios(failedScenarios, steps);

        await this.writeScenarioToFeatureFile(testFeatureFile, 'Feature: testing\n'.concat('\n').concat(scenariosText));
    }


    async readFeatureSteps(files: FeatureFolder[]): Promise<GherkinStepToken[]> {
        let gherkinSteps: GherkinStepToken[] = [];
        for (const file of files) {

            const document = await workspace.openTextDocument(file.path);
            const lines: string[] = document.getText().split("\n");

            let scenario = "";
            for (const line of lines) {
                let step = line.trim();

                if (step.startsWith('@') || step.startsWith('#')) {
                    continue;
                }


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

    getCurrentLine(): string {
        return " ";
    }


}

const feature = new Feature();

export default feature;