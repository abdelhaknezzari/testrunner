import axios from 'axios';

interface FailedScenario {
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

// Requires environment variable: GITHUB_TOKEN (requires repository scopes)
export async function getFailedScenarios(branchName: string, repositoryApiUrl: string) {
    console.log("Retrieving failed scenarios for branch" + branchName);


    const branchId = await getBranchIdFromName(branchName, repositoryApiUrl);
    if (branchId === -1) {
        console.error(`Branch ${branchName} with url ${repositoryApiUrl} could not be found!`);
        process.exit(1);
    }

    const comments = await getCommentsForBranch(repositoryApiUrl, branchId);
    const pipelineReportComments = await commentsShouldStartWith("## Pipeline Report", comments);
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

async function getBranchIdFromName(branchName: string, repositoryUrl: string): Promise<number> {
    const url = `${repositoryUrl}/pulls?state=open`;

    const response = await axios.get(url, {
        headers: {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
            "Content-Type": "application/json",
        }
    }).then((response) => {
        return response;
    }).catch((error) => {
        console.error(`Request was not successful: ${error}`);
        return -1;
    });

    const resultList = (response as GithubApiResult).data;
    const branch = resultList.filter((result) => result.head.ref === branchName);
    if (branch.length === 0) {
        console.error(`No branch found for ${branchName}`);
        return -1;
    }
    const branchId = branch[0].number;
    console.log(`Branch id found: ${branchId}`);
    return branchId;
}

async function getCommentsForBranch(repositoryUrl: string, branchId: number): Promise<GithubAPIData[]> {
    const url = `${repositoryUrl}/issues/${branchId}/comments`;
    // ## Pipeline Report
    const response = await axios.get(url, {
        headers: {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
            "Content-Type": "application/json",
        }
    }).then((response) => {
        return response;
    }).catch((error) => {
        console.error(`Request was not successful: ${error}`);
        return -1;
    });

    return (response as GithubApiResult).data;
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
