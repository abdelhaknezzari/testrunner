import { CompletionItem } from "vscode";
import feature from "./Feature";

import { GherkinStepToken } from "./GherkinTypes";
import clipboard from "./Clipboard";

class Search {

    tokenToExclude:string[] = ['and','then','when','given','the','a'];

    isTokenExcluded(word:string):boolean {
       return this.tokenToExclude.indexOf(word) !== -1; 
    }

    async findSteps(search: string, path: string): Promise<CompletionItem[]> {

        const searchWords = search.split(" ").map( word=> word.toLowerCase()).filter( word => !this.isTokenExcluded(word) );
   
        const tokens: GherkinStepToken[] = [];

        const featureFiles = await feature.readFeatureFiles(feature.getRoot(path).concat('/features'));

        const steps = await feature.readFeatureSteps(featureFiles);

        for (const step of steps) {
            const words = step.step.split(" ");
            const lemmatizedWords = words;
            if (!lemmatizedWords) {
                continue;
            }
            for (const word of lemmatizedWords) {
                if (word === "" || word === " " || this.isTokenExcluded(word) ) {
                    continue;
                }
                if(searchWords.some(srsch => word.toLowerCase() === srsch )){
                    const hh = 0;
                }

                tokens.push({
                    path: step.path,
                    file: step.file,
                    featureName: step.featureName,
                    scenario: step.scenario,
                    step: step.step,
                    token: word,
                    hit: searchWords.some(srsch => word.toLowerCase() === srsch ) ? 1 : 0
                });
            }
        }


        interface GroupedData {
            [key: string]: number;
        }


        const groupedData = tokens.reduce((acc: GroupedData, item: GherkinStepToken) => {
            const key = JSON.stringify({
                scenario: item.scenario,
                step: item.step
            });
            if (!acc[key]) {
                acc[key] = 0;
            }
            acc[key] += item?.hit as number;
            return acc;
        }, {});


        const vals = Object.values(groupedData);
        const keys = Object.keys(groupedData);

        const sumarize = [];

        for (let idx = 0; idx < keys.length; idx++) {
            sumarize.push(
                {
                    step: JSON.parse(keys[idx])?.step,
                    hit: vals[idx]
                }
            );
        }

        // Step 4: Sort the summarized data by 'nbrHit'
        const sortedData = sumarize.sort((a, b) => b.hit - a.hit);
        await clipboard.copyJson(sortedData);
        
        const items : CompletionItem[] = [];
        for (let i = 0; i < 10; i++) {
            items.push(new CompletionItem(sortedData[i].step));
          }
       return items;
    }



}

const search = new Search();

export default search;