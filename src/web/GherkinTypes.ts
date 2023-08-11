export interface FeatureFolder {
	name: string,
	path: string
}

export interface GherkinStepToken {
	path: string,
	file: string,
	featureName: string,
	scenario: string,
	step: string,
	lineNbr?:int,
	token: string,
	hit?:int,
}
