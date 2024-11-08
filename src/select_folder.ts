import { App, SuggestModal, Modal, Notice } from 'obsidian';
import { ExMemoSettings } from './settings';
import { callLLM } from "./utils";
import { confirmDialog } from './utils';
import { t } from "./lang/helpers"


class FolderSuggestModal extends SuggestModal<string> {
    settings: ExMemoSettings
    allowClose: boolean;
    confirmButton: HTMLButtonElement;
    inputValue: string;

    constructor(app: App, settings: ExMemoSettings) {
        super(app);
        this.settings = settings;
        this.inputValue = '';
        this.modalEl.addClass('folder-suggest-modal');

        const buttonContainer = this.modalEl.createDiv('dialog-button-container');
        buttonContainer.addClass('dialog-button-container');
        buttonContainer.addClass('right-aligned'); // 添加样式类名
        this.confirmButton = buttonContainer.createEl('button', {
            text: t('confirm')
        });
        this.confirmButton.addEventListener('click', () => {
            this.onConfirm();
        });
        this.inputEl.addEventListener('input', (e: InputEvent) => {
            this.inputValue = (e.target as HTMLInputElement).value;
        });
    }

    onChooseSuggestion(item: string, evt: MouseEvent): void {
        // abstract method
    }

    onConfirm(): void {
        matchFolder(this.inputValue, this.app, this.settings);
        this.close();
    }

    renderSuggestion(item: string, el: HTMLElement) {
        el.createEl('div', { text: item });
    }

    getSuggestions(query: string): string[] {
        let folders = this.app.vault.getAllFolders();
        folders = folders.filter(folder => folder.path.includes(query));
        for (const excludedFolder of this.settings.selectExcludedFolders) {
            folders = folders.filter(folder => !folder.path.startsWith(excludedFolder));
        }
        let flist = folders.map(folder => folder.path);
        const counts: Record<string, number> = {};
        flist.forEach(item => {
            const count = (item.match(/\//g) || []).length;
            counts[item] = count;
        });
        flist.sort((a, b) => counts[a] - counts[b]);
        if (query === '') {
            flist = [t('allFolders'), ...flist];
        }
        return flist;
    }

    handleKeyDown(evt: KeyboardEvent) {
        if (evt.key === "Tab") {
            let folders = this.app.vault.getAllFolders();
            folders = folders.filter(folder => folder.path.startsWith(this.inputEl.value));
            if (folders.length === 0) {
                return;
            }
            this.inputEl.value = folders[0].path;
        }
    }

    onOpen() {
        super.onOpen();
        this.inputEl.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    onClose() {
        this.inputEl.removeEventListener('keydown', this.handleKeyDown.bind(this));
        super.onClose();
    }

    selectSuggestion(value: string, evt: MouseEvent | KeyboardEvent): void {
        evt.preventDefault();
        this.inputEl.value = value;
        this.inputValue = value;

        const inputEvent = new InputEvent('input', {
            bubbles: true,
            cancelable: true,
        });
        this.inputEl.dispatchEvent(inputEvent);
        this.inputEl.focus();
    }
}

class SelectModal extends Modal {
    /*
    A modal dialog that allows the user to select a folder to move file.
    */
    options: string[];
    constructor(app: App, options: string[]) {
        super(app);
        this.options = options;
    }
    onOpen() {
        let { contentEl } = this;
        contentEl.createEl('h2', { text: t("pleaseSelectFolder")});
        let list = contentEl.createEl('ul');
        this.options.forEach((option) => {
            let li = list.createEl('li');
            li.createEl('a', { text: option, attr: { href: '#' } });
            li.addEventListener('click', (e) => {
                e.preventDefault();
                this.close();
                const activeFile = this.app.workspace.getActiveFile();
                if (!activeFile) {
                    new Notice(t("pleaseOpenFile"));
                    return;
                }
                this.app.vault.rename(activeFile, option + '/' + activeFile.name);
                new Notice(t("migrationSuccess"));
            });
        });
    }
    onClose() {
        let { contentEl } = this;
        contentEl.empty();
    }
}

async function matchFolder(item: string, app: App, settings: ExMemoSettings) {
    const file = app.workspace.getActiveFile()
    if (!file) {
        new Notice(t('pleaseOpenFile'));
        return;
    }
    let folders = app.vault.getAllFolders();
    if (item !== t('allFolders')) {
        let folder = app.vault.getFolderByPath(item);
        if (folder === null || folder === undefined) {
            new Notice(t("folderNotFound") + item);
            return;
        }
        folders = folders.filter((f) => folder && f.path.startsWith(folder.path));
    }
    for (const excludedFolder of settings.selectExcludedFolders) {
        folders = folders.filter(folder => !folder.path.startsWith(excludedFolder));
    }
    let option_list: string[] = [];
    if (folders.length >= 100) {
        const confirm = await confirmDialog(app, item + " " + t("tooManyFolders_1") + folders.length + t("tooManyFolders_2"));
        if (!confirm) {
            return;
        }
    }
    if (folders.length <= 3) {
        option_list = folders.map((folder) => folder.path);
    } else {
        const current_file = file.basename;
        const fm = app.metadataCache.getFileCache(file);
        let req = '';
        if (fm !== null && fm !== undefined && fm.frontmatter !== null && fm.frontmatter !== undefined && fm.frontmatter.description) {
            req = `The current file name is: '${current_file}'. The description is: '${fm.frontmatter.description}'.`
        } else {
            req = `The current file name is: '${current_file}'.`
        }
        req += `
Please help me find the three most suitable directories for storing this file, and return only the directory paths, separated by line breaks.

Below is the list of directory paths:
${folders.map((folder) => folder.path).join('\n')}
`;
        let options = await callLLM(req, settings);
        if (options === "" || options === undefined || options === null) {
            new Notice(t("noResult"));
            return;
        }
        options = options.replace(/`/g, '');
        options = options.trim();
        option_list = options.split('\n');
        option_list = option_list.map((item) => item.trim());
    }
    const selectModal = new SelectModal(app, option_list);
    selectModal.open();
}

export async function insertToDir(app: App, settings: ExMemoSettings) {
    const folderSuggest = new FolderSuggestModal(app, settings);
    folderSuggest.setPlaceholder(t("searchDesc"));
    folderSuggest.open();
}