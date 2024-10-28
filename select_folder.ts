import { App, SuggestModal, Modal, Notice } from 'obsidian';
import { ExMemoSettings } from 'settings';
import { callLLM } from 'llm';
import { t } from "./lang/helpers"

export async function confirmDialog(app: App, message: string): Promise<boolean> {
    return new Promise((resolve) => {
        const modal = new Modal(app);
        modal.titleEl.setText(t("confirm"));
        modal.contentEl.createEl('p', { text: message });
        const buttonContainer = modal.contentEl.createEl('div', { cls: 'dialog-button-container' });
    
        const yesButton = buttonContainer.createEl('button', { text: t("yes") });
        yesButton.onclick = () => {
            modal.close();
            resolve(true);
        };
    
        const noButton = buttonContainer.createEl('button', { text: t("no") });
        noButton.onclick = () => {
            modal.close();
            resolve(false);
        };

        modal.open();
    });
}

class FolderSuggestModal extends SuggestModal<string> {
    settings: ExMemoSettings
    allowClose: boolean;

    constructor(app: App, settings: ExMemoSettings) {
        super(app);
        this.settings = settings;
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
        flist = [t('allFolders'), ...flist];
        return flist;
    }

    onChooseSuggestion(item: string, evt: MouseEvent): void {
        matchFolder(item, this.app, this.settings);
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
}

class SelectModal extends Modal {
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
    let folders = app.vault.getAllFolders();
    if (item !== t('allFolders')) {
        let folder = app.vault.getFolderByPath(item);
        if (folder === null || folder === undefined) {
            return;
        }
        folders = folders.filter((f) => f.path.startsWith(folder.path));
    }
    let option_list: string[] = [];
    if (folders.length >= 100) {
        const confirm = await confirmDialog(app, t("tooManyFolders_1") + folders.length + t("tooManyFolders_2"));
        if (!confirm) {
            return;
        }
    }
    if (folders.length <= 3) {
        option_list = folders.map((folder) => folder.path);
    } else {
        const file = app.workspace.getActiveFile()
        if (!file) {
            new Notice(t('pleaseOpenFile'));
            return;
        }
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