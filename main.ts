import { Editor, MarkdownView, Plugin, Notice } from 'obsidian';
import { DEFAULT_SETTINGS, ExMemoSettings, ExMemoSettingTab } from 'settings';
import { adjustMdMeta } from 'meta';
import { insertToDir } from 'select_folder';
import { callLLM, llmAssistant } from 'llm';
import { t } from "./lang/helpers"

export default class ExMemoToolsPlugin extends Plugin {
    settings: ExMemoSettings;
    async onload() {
        await this.loadSettings();
        this.addCommand({
            id: 'exmemo-tools-adjust-meta',
            name: t('exmemoAdjustMeta'),
            editorCallback: (editor: Editor, view: MarkdownView) => {
                adjustMdMeta(this.app, this.settings);
            }
        });
        this.addCommand({
            id: 'exmemo-tools-insert-dir',
            name: t('exmemoSelectFolder'),
            editorCallback: (editor: Editor, view: MarkdownView) => {
                insertToDir(this.app, this.settings);
            }
        });
        this.addCommand({
            id: 'exmemo-tools-insert-md',
            name: t('exmemoInsertMd'),
            editorCallback: (editor: Editor, view: MarkdownView) => {
                this.insertToMd()
            }
        });
        this.addCommand({
            id: 'exmemo-tools-llm',
            name: t('exmemoLLMAssistant'),
            editorCallback: (editor: Editor, view: MarkdownView) => {
                llmAssistant(this.app, this);
            }
        });
        this.addSettingTab(new ExMemoSettingTab(this.app, this));
    }
    onunload() {
    }
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}
	async saveSettings() {
		await this.saveData(this.settings);
	}
    async insertToMd() {
        const editor = this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
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
Please insert the following content into the appropriate place in the main text. Return the modified main text, and enclose the inserted content in double hashtags for emphasis.
The content to be inserted is as follows:
${content.join('\n')}
The markdown main text is as follows:
${markdown_str}
`;        

        let ret = await callLLM(req, this.settings);
        editor.setValue(ret + "\n\n\n" + selectedText);
    }
}
