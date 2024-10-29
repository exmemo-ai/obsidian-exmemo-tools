import OpenAI from "openai";
import { App, MarkdownView, Notice, Plugin, SuggestModal } from 'obsidian';
import { ExMemoSettings } from "settings";
import ExMemoToolsPlugin from "main";
import { t } from "./lang/helpers"

export async function callLLM(req: string, settings: ExMemoSettings): Promise<string> {
    let ret = '';
    let info = new Notice(t("llmLoading"), 0);
    //console.log('callLLM:', req);
    const openai = new OpenAI({
        apiKey: settings.llmToken,
        baseURL: settings.llmBaseUrl,
        dangerouslyAllowBrowser: true
    });
    const completion = await openai.chat.completions.create({
        model: settings.llmModelName,
        messages: [
            { "role": "user", "content": req }
        ]
    });
    try {
        if (completion.choices.length > 0) {
            ret = completion.choices[0].message['content'] || ret;
        }
    } catch (error) {
        new Notice(t("llmError") + "\n" + error);
        console.error('Error:', error);
    }
    info.hide();
    return ret
}

function getSelection(app: App) {
    const editor = app.workspace.getActiveViewOfType(MarkdownView)?.editor;
    if (!editor) {
        return '';
    }
    return editor.getSelection();
}

function filterKey(prompts: Record<string, number>, query: string): Record<string, number> {
    return Object.keys(prompts)
        .filter(key => key.includes(query))
        .reduce((result: Record<string, number>, key) => {
            result[key] = prompts[key];
            return result;
        }, {});
}

class LLMModal extends SuggestModal<string> {
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
        this.limit = 20;
    }

    getSuggestions(query: string): string[] | Promise<string[]> {
        let settings: ExMemoSettings = this.plugin.settings;
        let prompts: Record<string, number> = settings.prompts;
        if (query !== '') {
            prompts = filterKey(prompts, query);
        }
        let ret = Object.keys(prompts).sort((a, b) => prompts[b] - prompts[a]);
        if (ret.length === 0) {
            return [query];
        } else {
            return ret;
        }
    }

    renderSuggestion(value: string, el: HTMLElement): void {
        el.createEl('div', { text: value });
    }

    onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent): void {
        if (item === '') {
            new Notice(t("inputPrompt"));
            return
        }
        chat(item, this.app, this.plugin)
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
    let prompts: Record<string, number> = settings.prompts;
    if (prompts[prompt]) {
        prompts[prompt] += 1;
    } else {
        prompts[prompt] = 1;
    }
    settings.prompts = prompts;
    plugin.saveSettings();
}

export async function llmAssistant(app: App, plugin: ExMemoToolsPlugin) {
    let text = getSelection(app);
    if (text === '') {
        new Notice(t("pleaseSelectText"));
        return
    }
    new LLMModal(app, plugin).open();
}