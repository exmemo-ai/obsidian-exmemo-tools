import { App, Editor, MarkdownView, Plugin, TFolder, Menu, Notice } from 'obsidian';
import { DEFAULT_SETTINGS, ExMemoSettings } from './settings';
import { ExMemoSettingTab } from './settings_tab';
import { optDir } from './meta_dir';
import { isIndexFile } from './utils';
import { adjustFileMeta } from './meta';
import { insertToDir } from './select_folder';
import { llmAssistant } from './llm_assistant';
import { insertToMd } from './edit_md';
import { t } from "./lang/helpers"
import { generateNextSentence } from './next_sentence';

export default class ExMemoToolsPlugin extends Plugin {
    settings: ExMemoSettings;
    async onload() {
        await this.loadSettings();
        this.addCommand({
            id: 'adjust-meta',
            name: t('exmemoAdjustMeta'),
            editorCallback: (editor: Editor, view: MarkdownView) => {
                this.adjustCurrentFileMeta(this.app, this.settings);
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
        this.addCommand({
            id: 'generate-next',
            name: t('exmemoGenerateNext'),
            editorCallback: (editor: Editor, view: MarkdownView) => {
                generateNextSentence(this.app, this.settings);
            }
        });
        this.addSettingTab(new ExMemoSettingTab(this.app, this));

        this.registerEvent(
            this.app.workspace.on('file-menu', (menu: Menu, file) => {
                if (file instanceof TFolder) {
                    menu.addItem((item) => {
                        item
                            .setTitle(t('createIndex'))
                            .setIcon('plus')
                            .onClick(async () => {
                                await optDir(file, this.app, this.settings);
                            });
                    });
                }
            })
        );
    }
    onunload() {
    }
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}
	async saveSettings() {
		await this.saveData(this.settings);
	}
    async adjustCurrentFileMeta(app : App, settings: ExMemoSettings) {
        const file = app.workspace.getActiveFile();
        if (!file) {
            new Notice(t('pleaseOpenFile'));
            return;
        }
        if (file.extension !== 'md') {
            new Notice(t('currentFileNotMarkdown'));
            return;
        }
        const force = settings.metaUpdateMethod === 'force';
        if (isIndexFile(file, settings)) {
            const parent = app.vault.getAbstractFileByPath(file.path)?.parent;
            if (parent instanceof TFolder) {
                await optDir(parent, app, settings);
            }
        } else {
            await adjustFileMeta(file, app, settings, force, true, true, false);
        }
    }    
}
