import { CompletionItem, CompletionList, CompletionItemProvider, TextDocument, Position, CancellationToken, ProviderResult, CancellationTokenSource, workspace } from "vscode";

import search from "./Search";

 class Completer implements CompletionItemProvider {
	 provideCompletionItems(
	  document: TextDocument,
	  position: Position,
	  token: CancellationToken
	): ProviderResult<CompletionItem[] | CompletionList> {

       const steps = document.getText().split('\n');
       const text = (document?.getText().split('\n')?.at(position?.line)?.trim()) as string;
    

       return  search.findSteps(text ,document.uri.path);
	}
  }
 const completer = new Completer();
 export default completer;