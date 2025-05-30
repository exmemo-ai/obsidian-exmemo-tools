import { App, Editor, MarkdownView, Plugin, TFolder, Menu, Notice, TFile } from 'obsidian';
import { DEFAULT_SETTINGS, ExMemoSettings } from './settings';
import { ExMemoSettingTab } from './settings_tab';
import { createDirIndex, updateFilesMetadata, createTempIndex, updateIndex } from './index_generator';
import { isIndexFile } from './utils';
import { adjustFileMeta } from './meta';
import { insertToDir } from './select_folder';
import { llmAssistant } from './llm_assistant';
import { insertToMd } from './edit_md';
import { t } from "./lang/helpers"
import { generateNextSentence } from './next_sentence';
import { extractZettelkasten } from './zettelkasten';

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
            id: 'extract-zettelkasten',
            name: t('exmemoCreateZettelkasten'),
            editorCallback: (editor: Editor, view: MarkdownView) => {
                extractZettelkasten(this.app, this.settings);
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
                                await createDirIndex(file, this.app, this.settings);
                            });
                    });
                }
            })
        );

        this.registerEvent(
            this.app.workspace.on("search:results-menu", (menu: Menu, leaf: any) => {
                menu.addItem((item) => {
                    item
                    .setIcon("tag")
                    .setTitle(t("addPropsToSearchResults"))
                    .onClick(async () => {
                        console.log("Add props to search results clicked");
                        let files = this.getFilesFromSearch(leaf);
                        if (!files.length) {
                        new Notice(t("noFilesToProcess"), 4000);
                        return;
                        }
                        await updateFilesMetadata(files, this.app, this.settings); // 250528, add output file name
                    });
                });
            })
        );
        this.registerEvent(
            this.app.workspace.on("search:results-menu", (menu: Menu, leaf: any) => {
              menu.addItem((item) => {
                item
                  .setIcon("list")
                  .setTitle(t("createIndexFromSearch"))
                  .onClick(async () => {
                    console.log("Create Index file");
                    let files = this.getFilesFromSearch(leaf);
                    if (!files.length) {
                      new Notice(t("noFilesToProcess"), 4000);
                      return;
                    }
                    await createTempIndex(files, this.app, this.settings, leaf?.searchQuery?.query);
                  });
              });
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
            await updateIndex(file, app, settings, true);
        } else {
            await adjustFileMeta(file, app, settings, force, true, true, false);
        }
    }    
    getFilesFromSearch(leaf: any) {
        let files: TFile[] = [];
        leaf.dom.vChildren.children.forEach((e: any) => {
          files.push(e.file);
        });
        return files;
    }    
}
