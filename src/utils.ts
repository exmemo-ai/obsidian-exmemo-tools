import { App, TFile, MarkdownView, Modal, Notice, getAllTags } from 'obsidian';
import OpenAI from "openai";
import { ExMemoSettings } from "./settings";
import { t } from "./lang/helpers"

export async function callLLM(req: string, settings: ExMemoSettings, showNotice: boolean = true): Promise<string> {
    let ret = '';
    let info = null;
    if (showNotice) {
        info = new Notice(t("llmLoading"), 0);
    }
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
    if (info) {
        info.hide();
    }
    return ret
}

class ConfirmModal extends Modal {
    private resolvePromise: (value: boolean | undefined) => void;
    private message: string;
    private yesText: string;
    private noText: string;
    private resolved: boolean;

    constructor(app: App, message: string, onResolve: (value: boolean | undefined) => void, yesText?: string, noText?: string) {
        super(app);
        this.message = message;
        this.resolvePromise = onResolve;
        this.yesText = yesText || t("yes");
        this.noText = noText || t("no");
        this.resolved = false;
    }

    onOpen() {
        this.titleEl.setText(t("confirm"));

        const paragraphs = this.message.split('\n');
        paragraphs.forEach(text => {
            if (text.trim()) {
                this.contentEl.createEl('p', { text });
            }
        });

        const buttonContainer = this.contentEl.createEl('div', { cls: 'dialog-button-container' });

        const yesButton = buttonContainer.createEl('button', { text: this.yesText });
        yesButton.onclick = () => {
            this.resolved = true;
            this.close();
            this.resolvePromise(true);
        };

        const noButton = buttonContainer.createEl('button', { text: this.noText });
        noButton.onclick = () => {
            this.resolved = true;
            this.close();
            this.resolvePromise(false);
        };
    }

    onClose() {
        if (!this.resolved) {
            this.resolvePromise(undefined);
        }
    }
}

export async function confirmDialog(app: App, message: string, yesText?: string, noText?: string): Promise<boolean | undefined> {
    return new Promise((resolve) => {
        const modal = new ConfirmModal(app, message, resolve, yesText, noText);
        modal.open();
    });
}

export function splitIntoTokens(str: string) {
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

const MAX_TAGS_COUNT = 30;

export async function simplifyTokens(allTags: string[], app: App, settings: ExMemoSettings): Promise<string[] | null> {
    const tag_string = allTags.join(',');
    const tokenCount = splitIntoTokens(tag_string).length;
    const message = t("simplifyTagsConfirm").replace("{count}", tokenCount.toString());
    
    const shouldSimplify = await confirmDialog(app, message);
    if (!shouldSimplify) {
        return null;
    }

    const prompt = t("simplifyTagsPrompt").replace("{count}", MAX_TAGS_COUNT.toString());
    const result = await callLLM(prompt + "\n\n" + allTags.join('\n'), settings, true);    
    if (!result) {
        return null;
    }

    return result.split('\n').filter(t => t.trim());
}

export async function loadTags(app: App, settings: ExMemoSettings): Promise<Record<string, number>> {
    const tagsMap: Record<string, number> = {};
    app.vault.getMarkdownFiles().forEach((file: TFile) => {
        const cachedMetadata = app.metadataCache.getFileCache(file);
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

    const allTags = Object.keys(tagsMap);
    if (allTags.length > MAX_TAGS_COUNT) {
        const simplifiedTags = await simplifyTokens(allTags, app, settings);
        if (simplifiedTags) {
            const newTagsMap: Record<string, number> = {};
            simplifiedTags.forEach(tag => {
                newTagsMap[tag] = tagsMap[tag] || 1;
            });
            return newTagsMap;
        }
    }

    return tagsMap;
}

export function updateContentBlock(content: string, blockTitle: string, newContent: string): string {
    const blockRegex = new RegExp(`## ${blockTitle}[\\s\\S]*?(?=##|$)`);
    const hasBlock = blockRegex.test(content);

    if (hasBlock) {
        return content.replace(blockRegex, `${newContent}\n\n`);
    } else {
        return content.trim() + '\n\n' + newContent + '\n';
    }
}

export function getContentBlock(content: string, blockTitle: string): string {
    const regex = new RegExp(`## ${blockTitle}[\\s\\S]*?(?=##|$)`);
    const match = content.match(regex);
    if (match) {
        return match[0].replace(new RegExp(`## ${blockTitle}\n?`), '').trim();
    }
    return '';
}

export async function getContent(app: App, file: TFile | null, settings: ExMemoSettings, includeMeta: boolean = false): Promise<string> {
    let content_str = '';
    if (file !== null) {
        content_str = await app.vault.read(file);
        if (settings && isIndexFile(file, settings)) {
            const detailContent = getContentBlock(content_str, t('fileDetail'));
            if (detailContent) {
                content_str = detailContent;
            }
        } else if (!includeMeta && content_str.startsWith('---')) {
            const endMetaIndex = content_str.indexOf('---', 3);
            if (endMetaIndex !== -1) {
                content_str = content_str.substring(endMetaIndex + 3).trim();
            }
        }
    } else {
        const editor = app.workspace.getActiveViewOfType(MarkdownView)?.editor;
        if (!editor) {
            return '';
        }
        content_str = editor.getSelection();
        content_str = content_str.trim();
        if (content_str.length === 0) {
            content_str = editor.getValue();
            if (!includeMeta && content_str.startsWith('---')) {
                const endMetaIndex = content_str.indexOf('---', 3);
                if (endMetaIndex !== -1) {
                    content_str = content_str.substring(endMetaIndex + 3).trim();
                }
            }
        }
    }

    if (content_str.length === 0) {
        return '';
    }

    if (!settings?.metaIsTruncate) {
        return content_str;
    }

    const tokens = splitIntoTokens(content_str);
    if (settings?.metaMaxTokens > 0 && tokens.length > settings.metaMaxTokens) {
        const method = settings.metaTruncateMethod;
        if (method === "head_tail") {
            const left = Math.round(settings.metaMaxTokens * 0.8);
            const right = Math.round(settings.metaMaxTokens * 0.2);
            const leftTokens = tokens.slice(0, left);
            const rightTokens = tokens.slice(-right);
            content_str = joinTokens(leftTokens) + '\n...\n' + joinTokens(rightTokens);
        } else if (method === "head_only") {
            content_str = joinTokens(tokens.slice(0, settings.metaMaxTokens)) + "...";
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
            if (totalTokens.length > settings.metaMaxTokens) {
                content_str = joinTokens(totalTokens.slice(0, settings.metaMaxTokens));
            } else {
                let remainingTokens = settings.metaMaxTokens - totalTokens.length;
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

export function isIndexFile(file: TFile, settings: ExMemoSettings) {
    if (file.basename.startsWith(settings.defaultIndexString)) {
        return true;
    } else {
        return false;
    }
}