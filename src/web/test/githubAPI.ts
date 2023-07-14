
import { getFailedScenarios } from "../githubAPI";

getFailedScenarios("<insert actual branchName>", process.env.REPOSITORY_URL ?? '');


