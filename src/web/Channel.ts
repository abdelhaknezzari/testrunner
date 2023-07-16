import { OutputChannel, window } from "vscode";

class Channel {
    outputChannel: OutputChannel;

    constructor() {
        this.outputChannel = window.createOutputChannel('CDMTestRunner');
        this.outputChannel.appendLine('Extension CDMTestRunner activated.');
        this.outputChannel.show();
    }

    message(text: string): void {
        this.outputChannel.appendLine(text);
        this.outputChannel.show();
    }
}

const channel = new Channel();
export default channel;