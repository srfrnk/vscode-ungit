import * as assert from "assert";
import * as vscode from "vscode";
import * as ungitExtension from "../src/extension";

suite("TextDocumentContentProvider", () => {
    test("provideTextDocumentContent returns loading screen", () => {
        const previewUri = vscode.Uri.parse("ungit://view");
        const provider = new ungitExtension.TextDocumentContentProvider();
        assert.ok(provider.provideTextDocumentContent(previewUri).indexOf("iframe") === -1);
    });

    test("provideTextDocumentContent returns iframe when ready", () => {
        const previewUri = vscode.Uri.parse("ungit://view");
        const provider = new ungitExtension.TextDocumentContentProvider();
        provider.ready = true;
        assert.ok(provider.provideTextDocumentContent(previewUri).indexOf("iframe") !== -1);
    });
});

suite("Configuration", () => {
    test("configuration is default", () => {
        const useGlobal = vscode.workspace.getConfiguration("ungit").get<boolean>("useGlobal");
        assert.strictEqual(useGlobal, false);
    });
});
