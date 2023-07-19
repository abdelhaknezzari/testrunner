import axios from 'axios';
import { workspace } from 'vscode';
import Config from './Config';
import channel from './Channel';

export interface FailedScenario {
    feature: string;
    scenario: string;
}

interface GithubApiResult {
    data: GithubAPIData[];
}

interface GithubAPIData {
    head: {
        ref: string;
    };
    number: number;
    body: string;

}

export async function getCurrentBranchName(path: string): Promise<string> {
	const gitHeader = `${Config.getRoot(path)}/.git/HEAD`;
	const file = await workspace.openTextDocument(gitHeader);
	file.getText();
	return file.getText().trim().split('/heads/').at(-1) as string;
}

// Requires environment variable: GITHUB_TOKEN (requires repository scopes)
export async function getFailedScenarios(path: string, repositoryApiUrl: string,token:string):Promise<FailedScenario[]> {
    const branchName = await getCurrentBranchName(path);
    console.log("Retrieving failed scenarios for branch" + branchName);

    const branchId = await getBranchIdFromName(branchName, repositoryApiUrl,token);
    if (branchId === -1) {
        channel.error(`Branch ${branchName} with url ${repositoryApiUrl} could not be found!`);
        process.exit(1);
    }

    const comments = await getCommentsForBranch(repositoryApiUrl, branchId,token);
    const pipelineReportComments = await commentsShouldStartWith("## Pipeline Report", comments as GithubAPIData[]);
    const pipelineReportString = pipelineReportComments[0].body;

    const scenarios = splitByScenario(pipelineReportString);

    const failedScenarios: FailedScenario[] = [];

    for (const scenario of scenarios) {
        const scenarioName = getScenarioName(scenario);
        if (!scenarioName) {
            continue;
        }

        const featureName = getFeatureNameFrom(scenario);

        failedScenarios.push({
            feature: featureName,
            scenario: scenarioName
        });

    }

    console.log(`Found ${failedScenarios.length} failed scenarios`);
    return failedScenarios;

}


const getOpenPullRequests =  async (baseUrl:string,token:string):Promise<GithubApiResult|undefined>=> {
      try{
        const url = `${baseUrl}/pulls?state=open`;
        const response = await axios.get(url, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            }
          });
          return response;
    } catch(error){
        channel.error(error as string);
    }
} 


async function getBranchIdFromName(branchName: string, repositoryUrl: string,token:string): Promise<number> {
    const response = await getOpenPullRequests(repositoryUrl,token);

    const resultList = (response as GithubApiResult)?.data;
    const branch = resultList.filter((result) => result.head.ref === branchName);
    if (branch.length === 0) {
        channel.error(`No branch found for ${branchName}`);
        return -1;
    }
    const branchId = branch[0].number;
    channel.message(`Branch id found: ${branchId}`);
    return branchId;
}

async function getCommentsForBranch(repositoryUrl: string, branchId: number,token:string): Promise<GithubAPIData[]|undefined> {
    const url = `${repositoryUrl}/issues/${branchId}/comments`;
    // ## Pipeline Report
    try{
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            }
        });
        return (response as GithubApiResult).data;
    } catch(error){
        channel.error(error as string);
    }
}

async function commentsShouldStartWith(filterCriteria: string, comments: GithubAPIData[]): Promise<GithubAPIData[]> {
    const filteredComment = comments.filter((comment) => {
        return comment.body.startsWith(filterCriteria);
    });
    return filteredComment;
}

function splitByScenario(stringToSplit: string): string[] {
    // 1. Split by --- (each scenario)
    return stringToSplit.split("---");
}

function getScenarioName(scenario: string): string {
    // 2. Regex for scenario name: \|Scenario\|(.*)\|   and trim()
    const scenarioRegex = /\|Scenario\|(.*)\| /gm;
    const scenarioName = scenarioRegex.exec(scenario);
    if (scenarioName !== null && scenarioName.length > 1) {
        return scenarioName[1].trim();
    }
    return "";
}

function getFeatureNameFrom(scenario: string): string {
    // 2. Regex for scenario name: \|Scenario\|(.*)\|   and trim()
    const featureRegex = /\|.?Feature\|(.*)\| /gm;
    const featureName = featureRegex.exec(scenario);
    if (featureName !== null && featureName.length > 1) {
        return featureName[1].trim();
    }
    return "";
}
