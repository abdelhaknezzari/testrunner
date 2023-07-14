
import { getFailedScenarios } from "../githubAPI";

getFailedScenarios("poc/placeholder1", process.env.REPOSITORY_URL ?? '');


