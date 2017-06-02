import { ChildProcess, fork } from "child_process";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";

const previewUri = vscode.Uri.parse("ungit://view");
const localPath = path.join(__dirname, "..", "..", "node_modules", "ungit", "bin", "ungit");
const globalPath = "ungit";
let child: ChildProcess;

export class TextDocumentContentProvider implements vscode.TextDocumentContentProvider {
    private onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
    private ungitReady = false;

    get onDidChange(): vscode.Event<vscode.Uri> {
        return this.onDidChangeEmitter.event;
    }

    set ready(ready: boolean) {
        this.ungitReady = ready;
        this.onDidChangeEmitter.fire(previewUri);
    }

    public provideTextDocumentContent(uri: vscode.Uri): string {
        if (this.ungitReady) {
            return this.getUngitHtml();
        } else {
            return this.getLoadingHtml();
        }
    }

    private getLoadingHtml(): string {
        const imagePath = path.join(__dirname, "..", "..", "images", "logo.png");
        return `
        <div style="position: fixed; height: 100%; width: 100%; background: #252833; display: flex; justify-content: space-around; flex-direction: column; align-items: center;">
            <image src="${imagePath}" />
            <h1 style="color: #d8d8d8;">
                Loading ...
            </h1>
        </div>
        `;
    }

    private getUngitHtml(): string {
        const location = vscode.workspace.rootPath || "";
        const url = `http://localhost:8448/#/repository?path=${location}`;
        return `
        <div style="position: fixed; height: 100%; width: 100%;">
            <iframe src="${url}" style="border: none;" height="100%" width="100%"></iframe>
        </div>
        `;
    }
}

function executeCommand(provider: TextDocumentContentProvider): void {
    let errorMessage = "";
    vscode.commands.executeCommand("vscode.previewHtml", previewUri, vscode.ViewColumn.Two, "Ungit").then((success) => {
        return;
    }, (reason: string) => {
        vscode.window.showErrorMessage(reason);
    });

    const useGlobal = vscode.workspace.getConfiguration("ungit").get<boolean>("useGlobal");
    const modulePath = useGlobal ? globalPath : localPath;
    child = fork(modulePath, ["-b=0"], { silent: true });
    child.stdout.on("data", (message: Buffer) => {
        const started = message.toString().indexOf("## Ungit started ##") !== -1;
        if (started) {
            provider.ready = true;
        }
    });
    child.stderr.on("data", (message: Buffer) => {
        errorMessage += message.toString() + os.EOL;
    });
    child.on("exit", () => {
        if (errorMessage) {
            if (useGlobal) {
                const message = "Unable to start global Ungit. Check the global installation or switch to the bundled installation.";
                vscode.window.showErrorMessage(`${message}${os.EOL}${errorMessage}`);
            } else {
                vscode.window.showErrorMessage(`Unable to start Ungit.${os.EOL}${errorMessage}`);
            }
        }
    });
}

export function activate(context: vscode.ExtensionContext): void {
    const provider = new TextDocumentContentProvider();
    const registration = vscode.workspace.registerTextDocumentContentProvider("ungit", provider);
    const disposable = vscode.commands.registerCommand("extension.ungit", () => {
        executeCommand(provider);
    });
    context.subscriptions.push(disposable, registration);
}

export function deactivate(): void {
    child.kill();
}
