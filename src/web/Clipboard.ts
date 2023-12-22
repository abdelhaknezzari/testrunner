import { window, env } from "vscode";

class Clipboard {
    async copyJson(json: any) {
        try {
            await env.clipboard.writeText(JSON.stringify(json, null, 2));
        } catch (error) {
            window.showErrorMessage('Failed to copy JSON to clipboard: ' + error);
        }
    }

    async copyString(txt: string) {
        try {
            await env.clipboard.writeText(txt);
        } catch (error) {
            window.showErrorMessage('Failed to copy text to clipboard: ' + error);
        }
    }

}

const clipboard = new Clipboard();
export default clipboard;