import { OutputChannel, window } from "vscode";
import  chalk from "chalk";

class Channel {
    outputChannel: OutputChannel;

    constructor() {
        this.outputChannel = window.createOutputChannel('CDMTestRunner');
        this.outputChannel.appendLine('Extension CDMTestRunner activated.');
        this.outputChannel.show();
    }

    message(text: string): void {
        console.log(text);
        this.outputChannel.appendLine(text);
        this.outputChannel.show();
    }
    error(errorMessage: string): void {
        console.error(errorMessage);
        this.outputChannel.appendLine(chalk.red(errorMessage));
        this.outputChannel.show();
        window.showErrorMessage(errorMessage);
        
    }

}

const channel = new Channel();
export default channel;
