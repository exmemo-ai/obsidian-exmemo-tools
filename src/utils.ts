import { App, TFile, MarkdownView, Modal, Notice, getAllTags } from 'obsidian';
import OpenAI from "openai";
import { ExMemoSettings } from "./settings";
import { t } from "./lang/helpers"

export async function callLLM(req: string, settings: ExMemoSettings): Promise<string> {
    let ret = '';
    let info = new Notice(t("llmLoading"), 0);
    //console.log('callLLM:', req.length, 'chars', req);
    //console.warn('callLLM:', settings.llmBaseUrl, settings.llmToken);
    const openai = new OpenAI({
        apiKey: settings.llmToken,
        baseURL: settings.llmBaseUrl,
        dangerouslyAllowBrowser: true
    });
    try {
        const completion = await openai.chat.completions.create({
            model: settings.llmModelName,
            messages: [
                { "role": "user", "content": req }
            ]
        });
        if (completion.choices.length > 0) {
            ret = completion.choices[0].message['content'] || ret;
        }
    } catch (error) {
        new Notice(t("llmError") + "\n" + error as string);
        console.warn('Error:', error as string);
    }
    info.hide();
    return ret
}

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

function splitIntoTokens(str: string) {
    const regex = /[\u4e00-\u9fa5]|[a-zA-Z0-9]+|[\.,!?;，。！？；#]|[\n]/g;
    const tokens = str.match(regex);
    return tokens || [];
}

function joinTokens(tokens: any) {
    let result = '';
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (token === '\n') {
            result += token;
        } else if (/[\u4e00-\u9fa5]|[\.,!?;，。！？；#]/.test(token)) {
            result += token;
        } else {
            result += (i > 0 ? ' ' : '') + token;
        }
    }
    return result.trim();
}

export async function loadTags(app: App): Promise<Record<string, number>> {
    // use getAllTags from obsidian API
    const tagsMap: Record<string, number> = {};
    this.app.vault.getMarkdownFiles().forEach((file: TFile) => {
        const cachedMetadata = this.app.metadataCache.getFileCache(file);
        if (cachedMetadata) {
            let tags = getAllTags(cachedMetadata);
            if (tags) {
                tags.forEach((tag) => {
                    let tagName = tag;
                    if (tagName.startsWith('#')) {
                        tagName = tagName.slice(1);
                    }
                    if (tagsMap[tagName]) {
                        tagsMap[tagName]++;
                    } else {
                        tagsMap[tagName] = 1;
                    }
                });
            }
        }
    });
    return tagsMap;
}

export async function getContent(app: App, file: TFile | null, limit: number = 1000, method: string = "head_only"): Promise<string> {
    let content_str = '';
    if (file !== null) { // read from file
        content_str = await app.vault.read(file);
    } else { // read from active editor
        const editor = app.workspace.getActiveViewOfType(MarkdownView)?.editor;
        if (!editor) {
            return '';
        }
        content_str = editor.getSelection();
        content_str = content_str.trim();
        if (content_str.length === 0) {
            content_str = editor.getValue();
        }
    }
    if (content_str.length === 0) {
        return '';
    }
    const tokens = splitIntoTokens(content_str);
    //console.log('token_count', tokens.length);
    if (tokens.length > limit && limit > 0) {
        if (method === "head_tail") {
            const left = Math.round(limit * 0.8);
            const right = Math.round(limit * 0.2);
            const leftTokens = tokens.slice(0, left);
            const rightTokens = tokens.slice(-right);
            content_str = joinTokens(leftTokens) + '\n...\n' + joinTokens(rightTokens);
        } else if (method === "head_only") {
            content_str = joinTokens(tokens.slice(0, limit)) + "...";
        } else if (method === "heading") {
            let lines = content_str.split('\n');
            lines = lines.filter(line => line.trim() !== '');

            let new_lines: string[] = [];
            let captureNextParagraph = false;
            for (let line of lines) {
                if (line.startsWith('#')) {
                    new_lines.push(line);
                    captureNextParagraph = true;
                }
                else if (captureNextParagraph && line.trim() !== '') {
                    const lineTokens = splitIntoTokens(line);
                    new_lines.push(joinTokens(lineTokens.slice(0, 30)) + '...'); // 30 tokens
                    captureNextParagraph = false;
                }
            }
            content_str = new_lines.join('\n');
            const totalTokens = splitIntoTokens(content_str);
            if (totalTokens.length > limit) {
                content_str = joinTokens(totalTokens.slice(0, limit));
            } else {
                let remainingTokens = limit - totalTokens.length;
                let head = joinTokens(tokens.slice(0, remainingTokens)) + "...";
                content_str = `Outline: \n${content_str}\n\nBody: ${head}`;
            }
        }
    }
    return content_str;
}

export function updateFrontMatter(file: TFile, app: App, key: string, value: any, method: string) {
    app.fileManager.processFrontMatter(file, (frontmatter) => {
        if (value === undefined || value === null) {
            return;
        }
        if (method === `append`) {
            let old_value = frontmatter[key];
            if (typeof value === 'string') {
                if (old_value === undefined) {
                    old_value = '';
                }
                frontmatter[key] = old_value + value;
            } else if (Array.isArray(value)) {
                if (old_value === undefined) {
                    old_value = [];
                }
                const new_value = old_value.concat(value);
                const unique_value = Array.from(new Set(new_value));
                frontmatter[key] = unique_value;
            }
        } else if (method === `update`) {
            frontmatter[key] = value;
        } else { // keep: keep_if_exists
            let old_value = frontmatter[key];
            if (old_value !== undefined) {
                return;
            }
            frontmatter[key] = value;
        }
    });
}
