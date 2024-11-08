import { MarkdownView, Notice, App } from 'obsidian';
import { ExMemoSettings } from './settings';
import { callLLM } from "./utils";
import { t } from "./lang/helpers"

export async function insertToMd(app: App, settings: ExMemoSettings) {
    const editor = app.workspace.getActiveViewOfType(MarkdownView)?.editor;
    if (!editor) {
        return;
    }
    const selectedText = editor.getSelection();
    if (!selectedText) {
        new Notice(t("pleaseSelectText"));
        return;
    }
    const selectedTextArray = selectedText.split('\n');
    const content = selectedTextArray.filter((line) => line.trim() !== '');

    let markdown_str = editor.getValue();
    markdown_str.replace(selectedText, "")

    const req = `
Please insert the following content into the appropriate place in the main text. Return the modified main text, and enclose the inserted content with double equals signs (==).
The content to be inserted is as follows:
${content.join('\n')}
The markdown main text is as follows:
${markdown_str}
`;

    let ret = await callLLM(req, settings);
    if (ret === "" || ret === undefined || ret === null) {
        return;
    }
    const markdownMatch = ret.match(/```markdown\s*([\s\S]*?)\s*```/);
    if (markdownMatch) {
        ret = markdownMatch[1];
    }
    editor.setValue(ret + "\n\n" + t('insertContent') + "\n\n" + selectedText);
}
