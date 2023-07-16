import { Uri, debug, window } from "vscode";
import Feature from "./Feature";
import config, { LaunchConfig } from "./Config";
import { FailedScenario, getCurrentBranchName, getFailedScenarios } from "./githubAPI";
import feature from "./Feature";
import channel from "./Channel";


class TestRunner {
    async runIntegrationTests(conf: LaunchConfig | undefined): Promise<void> {
        if(!conf){
            channel.message(`Empty configuration: wrong launch.json`);
            return;
        }
        channel.message(`Start Running Scenarios`);
        debug.startDebugging(undefined, conf);
    }

    async runFeature(uri: Uri) {
        channel.message(`Run scenario ${uri.path}`);
        channel.message(`Retrieve configuration`);
        const conf = await config.getLaunchConfig(uri.path);
        await this.runIntegrationTests(conf);
    }

    async runScenario(uri: Uri) {
        const lineNbr = window?.activeTextEditor?.selection?.active?.line as number;

        await feature.createScenario(uri, lineNbr);
        channel.message(`Create Scenario Testing.feature`);

        channel.message(`Read configuration`);
        const conf = await config.getLaunchConfig(uri.path, 'Testing.feature');
   
        await this.runIntegrationTests(conf);
    }


    async runPullRequest(uri: Uri) {
        const conf = await config.getLaunchConfig(uri.path, 'Testing.feature');
        if (!conf) {
            channel.message(`Empty configuration: wrong launch.json`);
            return;
        }

        channel.message(`Read configuration`);

        const failedScenarios =  await getFailedScenarios(uri.path, conf.env.REPO_URL as string, conf.env.GIT_TOKEN as string);
        channel.message(`Read Failed scenarios from GitHub`);

        await feature.createFeature(uri, failedScenarios);
        channel.message(`Create Scenario Testing.feature`);

        await this.runIntegrationTests(conf);
    }
}

const testRunner = new TestRunner();
export default testRunner;

