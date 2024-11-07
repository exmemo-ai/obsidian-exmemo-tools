import { Editor, MarkdownView, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, ExMemoSettings, ExMemoSettingTab } from './settings';
import { adjustMdMeta } from './meta';
import { insertToDir } from './select_folder';
import { llmAssistant } from './llm';
import { insertToMd } from './edit_md';
import { t } from "./lang/helpers"

export default class ExMemoToolsPlugin extends Plugin {
    settings: ExMemoSettings;
    async onload() {
        await this.loadSettings();
        this.addCommand({
            id: 'adjust-meta',
            name: t('exmemoAdjustMeta'),
            editorCallback: (editor: Editor, view: MarkdownView) => {
                adjustMdMeta(this.app, this.settings);
            }
        });
        this.addCommand({
            id: 'insert-dir',
            name: t('exmemoSelectFolder'),
            editorCallback: (editor: Editor, view: MarkdownView) => {
                insertToDir(this.app, this.settings);
            }
        });
        this.addCommand({
            id: 'insert-md',
            name: t('exmemoInsertMd'),
            editorCallback: (editor: Editor, view: MarkdownView) => {
                insertToMd(this.app, this.settings);
            }
        });
        this.addCommand({
            id: 'llm-assistant',
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
}
