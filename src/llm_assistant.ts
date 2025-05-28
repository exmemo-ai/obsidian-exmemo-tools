import { App, MarkdownView, Notice, SuggestModal, Modal } from 'obsidian';
import { ExMemoSettings, LLMResultMode } from "./settings";
import { callLLM } from "./llm_utils";
import ExMemoToolsPlugin from "./main";
import { t } from "./lang/helpers";
import { sortPromptsByPriority } from "./prompts";
import { addPrompt } from "./prompts";

function getSelection(app: App) {
    const editor = app.workspace.getActiveViewOfType(MarkdownView)?.editor;
    if (!editor) {
        return '';
    }
    return editor.getSelection();
}

function filterKey(prompts: Record<string, { count: number, lastAccess: number, priority: number|null }>, query: string) {
    let result = query ? 
        Object.fromEntries(
            Object.entries(prompts).filter(([key]) => key.includes(query))
        ) : prompts;
    
    return Object.keys(result).sort((a, b) => sortPromptsByPriority(result, a, b));
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

class LLMResultModal extends Modal {
    plugin: ExMemoToolsPlugin;
    text: string;
    result: string;
    remember: boolean = false;
    
    constructor(app: App, plugin: ExMemoToolsPlugin, text: string, result: string) {
        super(app);
        this.plugin = plugin;
        this.text = text;
        this.result = result;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('llm-result-container');
        
        contentEl.createEl('h3', { text: t("chooseAction") });
        
        const buttonsDiv = contentEl.createDiv('llm-result-buttons');
        buttonsDiv.addClass('llm-result-modal-buttons');
        
        const appendButton = buttonsDiv.createEl('button', { text: t("appendToSelection") });
        appendButton.addEventListener('click', () => this.handleMode(LLMResultMode.APPEND));
        
        const prependButton = buttonsDiv.createEl('button', { text: t("prependToSelection") });
        prependButton.addEventListener('click', () => this.handleMode(LLMResultMode.PREPEND));
        
        const replaceButton = buttonsDiv.createEl('button', { text: t("replaceSelection") });
        replaceButton.addEventListener('click', () => this.handleMode(LLMResultMode.REPLACE));
        
        const rememberDiv = contentEl.createDiv('llm-mode-remember');
        const checkbox = rememberDiv.createEl('input', { type: 'checkbox' });
        checkbox.addEventListener('change', (e) => {
            this.remember = (e.target as HTMLInputElement).checked;
        });
        rememberDiv.createSpan({ text: t("rememberChoice") });
    }
    
    async handleMode(mode: LLMResultMode) {
        const editor = this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
        if (!editor) return;
        
        applyLLMResult(editor, this.text, this.result, mode);
        
        if (this.remember) {
            this.plugin.settings.llmResultMode = mode;
            await this.plugin.saveSettings();
        }
        
        this.close();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

function applyLLMResult(editor: any, text: string, result: string, mode: LLMResultMode): void {
    switch (mode) {
        case LLMResultMode.APPEND:
            editor.replaceSelection(text + "\n\n" + result + "\n");
            break;
        case LLMResultMode.PREPEND || LLMResultMode.UNKNOWN:
            editor.replaceSelection(result + "\n\n" + text);
            break;
        case LLMResultMode.REPLACE:
            editor.replaceSelection(result);
            break;
    }
}

async function chat(prompt: string, app: App, plugin: ExMemoToolsPlugin) {
    let settings: ExMemoSettings = plugin.settings;
    let text = getSelection(app);
    let req = `Prompt:
${prompt}

Content:
${text}`;

    let ret = await callLLM(req, settings);
    let editor = app.workspace.getActiveViewOfType(MarkdownView)?.editor;
    if (!editor) {
        return;
    }
    
    if (settings.llmResultMode !== LLMResultMode.UNKNOWN) {
        applyLLMResult(editor, text, ret, settings.llmResultMode);
    } else {
        new LLMResultModal(app, plugin, text, ret).open();
    }
    
    await addPrompt(plugin, prompt, 1);
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