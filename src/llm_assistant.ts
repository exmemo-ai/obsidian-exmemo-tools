import { App, MarkdownView, Notice, SuggestModal } from 'obsidian';
import { ExMemoSettings } from "./settings";
import { callLLM } from "./utils";
import ExMemoToolsPlugin from "./main";
import { t } from "./lang/helpers";


function getSelection(app: App) {
    const editor = app.workspace.getActiveViewOfType(MarkdownView)?.editor;
    if (!editor) {
        return '';
    }
    return editor.getSelection();
}

function filterKey(prompts: Record<string, { count: number, lastAccess: number }>, query: string) {
    let result: Record<string, { count: number, lastAccess: number }> = prompts;
    if (query !== '') {
        result = {};
        Object.keys(prompts).forEach(key => {
            if (key.includes(query)) {
                result[key] = prompts[key];
            }
        });    
    }
    let ret = Object.keys(result).sort((a, b) => {
        if (prompts[b].count === prompts[a].count) {
            return prompts[b].lastAccess - prompts[a].lastAccess;
        }
        return prompts[b].count - prompts[a].count;
    });
    return ret;
}

class LLMQuickModal extends SuggestModal<string> {
    plugin: ExMemoToolsPlugin;

    constructor(app: App, plugin: ExMemoToolsPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        let { inputEl } = this;
        inputEl.type = 'text';
        inputEl.placeholder = t("inputPrompt");
        this.inputEl.dispatchEvent(new Event('input'));
        this.limit = 30;
    }

    getSuggestions(query: string): string[] | Promise<string[]> {
        let settings: ExMemoSettings = this.plugin.settings;
        let ret = filterKey(settings.llmPrompts, query);
        if (ret.length === 0) {
            return [query];
        } else {
            return ret;
        }
    }

    renderSuggestion(value: string, el: HTMLElement): void {
        const div = el.createEl('div', { text: value });
        div.addClass('custom-suggestion-item');
    }

    onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent): void {
        if (item === '') {
            new Notice(t("inputPrompt"));
            return
        }
        chat(item, this.app, this.plugin)
    }
}

class LLMEditModal extends LLMQuickModal {
    chatButton: HTMLButtonElement;

    constructor(app: App, plugin: ExMemoToolsPlugin) {
        super(app, plugin);
        this.modalEl.addClass('folder-suggest-modal');

        const buttonContainer = this.modalEl.createDiv('dialog-button-container');
        buttonContainer.addClass('dialog-button-container');
        buttonContainer.addClass('right-aligned');
        this.chatButton = buttonContainer.createEl('button', {
            text: t('chatButton')
        });
        this.chatButton.addEventListener('click', () => this.triggerChat());
    }

    onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent): void {
        // replace parent method
    }

    selectSuggestion(value: string, evt: MouseEvent | KeyboardEvent): void {
        evt.preventDefault();
        this.inputEl.value = value;

        const inputEvent = new InputEvent('input', {
            bubbles: true,
            cancelable: true,
        });
        
        this.inputEl.dispatchEvent(inputEvent);
        this.inputEl.focus();
    }

    triggerChat() {
        let prompt = this.inputEl.value;
        if (prompt === '') {
            new Notice(t("inputPrompt"));
            return;
        }
        chat(prompt, this.app, this.plugin);
        this.close();
    }
}

async function chat(prompt: string, app: App, plugin: ExMemoToolsPlugin) {
    let settings: ExMemoSettings = plugin.settings;
    let text = getSelection(this.app);
    let req = `Prompt:
${prompt}

Content:
${text}`;

    let ret = await callLLM(req, settings);
    let editor = app.workspace.getActiveViewOfType(MarkdownView)?.editor;
    if (!editor) {
        return;
    }
    editor.replaceSelection(
        text + "\n\n" + ret + "\n"
    );
    let prompts: Record<string, { count: number, lastAccess: number }> = settings.llmPrompts;
    if (prompts[prompt]) {
        prompts[prompt].count += 1;
        prompts[prompt].lastAccess = Date.now();
    } else {
        prompts[prompt] = { count: 1, lastAccess: Date.now() };
    }
    settings.llmPrompts = prompts;
    plugin.saveSettings();
}

export async function llmAssistant(app: App, plugin: ExMemoToolsPlugin) {
    let text = getSelection(app);
    if (text === '') {
        new Notice(t("pleaseSelectText"));
        return
    }
    if (plugin.settings.llmDialogEdit) {
        new LLMEditModal(app, plugin).open();
    } else {
        new LLMQuickModal(app, plugin).open();
    }
}