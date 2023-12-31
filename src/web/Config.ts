import { workspace } from "vscode";
import channel from "./Channel";

export interface LaunchConfig {
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
        REPO_URL?: string,
        NEED_MOCK_SERVER?: string
    }
}

class Config {
    getRoot(featureFilePath: string): string {
        const rootPath = featureFilePath.split('/features/').at(0) as string;
        return rootPath.includes('webapps') ? featureFilePath.split('/webapps/').at(0) as string : rootPath;
    }

    getFeature(featureFilePath: string): string {
        return featureFilePath.split('/features/').at(1)?.split("/").at(-1) as string;
    }

    correctJson(json: string): string {
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

    async readLaunchJsonConfig(path: string): Promise<LaunchConfig> {
        const json = await workspace.openTextDocument(`${path}/.vscode/launch.json`);
        const jsonAsString = this.correctJson(json.getText());
        return JSON.parse(jsonAsString).configurations.at(0) as LaunchConfig;
    }

    needMockServer(scenarioText:string): boolean {
        return scenarioText.includes("mock service") || scenarioText.includes("createEntityWithRelation");
    }

    async getLaunchConfig(path: string, feature = "", scenarioText = ""): Promise<LaunchConfig | undefined> {
        try {
            const root = this.getRoot(path);
            const featureFile = feature === "" ? this.getFeature(path) : feature;

            const conf = await this.readLaunchJsonConfig(root);

            if (!conf.hasOwnProperty('env')) {
                channel.message(`The file launch.json does not contain field of 'env', add the missing field`);
                return conf;
            }

            conf.args = ['./wdio.conf.js', '--spec', featureFile];

            if (!conf.hasOwnProperty('env')) {
                channel.message(`The file launch.json does not contain field of 'env', add the missing field`);
                return conf;
            }

            conf.env.NEED_MOCK_SERVER = this.needMockServer(scenarioText) ? 'true' : 'false';
            return conf;
        } catch (error) {
            channel.message(error as string);
        }
    }

}

const config = new Config;

export default config;