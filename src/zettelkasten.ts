import { App, Notice, TFile, MarkdownView } from 'obsidian';
import { ExMemoSettings } from './settings';
import { t } from "./lang/helpers";
import { ensureString } from './utils';
import { FeatureExtractor } from './feature_extractor';

export class ZettelkastenCard {
    id: string;
    title: string;
    content: string;
    isFromSelection: boolean;

    constructor(isFromSelection: boolean = false, title: string = "", source: string = "", content: string = '') {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
        
        const timestamp = `${year}${month}${day}${hours}${minutes}${seconds}${milliseconds}`;
        const suffix = isFromSelection ? "1" : "0";
        this.id = `${timestamp}-${suffix}`;
        this.title = title;
        this.content = content;
        this.isFromSelection = isFromSelection;
    }

    format(): string {

        //console.log("Formatting ZettelkastenCard:", this.id, this.title, this.content);
        const contentPoints = this.content.trim()
            .split('\n')
            .map(line => line.trim())
            //.filter(line => line !== '')
            .map(line => `> ${line}`)
            .join('\n');
        
        return `> [!zk ${this.id}] ${this.title}
${contentPoints}`;
    }

    static parse(cardString: string): ZettelkastenCard | null {
        const titleRegex = /> \[!zk (\d+)-([01])\] (.+)/;
        const titleMatch = cardString.match(titleRegex);
        
        if (!titleMatch) return null;
        
        const timestamp = titleMatch[1];
        const selectionFlag = titleMatch[2];
        const title = titleMatch[3];
        const isFromSelection = selectionFlag === "1";
        
        const lines = cardString.split('\n');
        const contentLines: string[] = [];
        let i = 1;
        
        while (i < lines.length && lines[i].startsWith('>')) {
            contentLines.push(lines[i].replace(/^> /, ''));
            i++;
        }
        
        const content = contentLines.join('\n');        
        const card = new ZettelkastenCard(isFromSelection, title, '', content);
        card.id = `${timestamp}-${selectionFlag}`;
        return card;
    }
}

export class CardManager {
    private app: App;
    private settings: ExMemoSettings;
    private file: TFile;

    constructor(app: App, file: TFile, settings: ExMemoSettings) {
        this.app = app;
        this.file = file;
        this.settings = settings;
    }

    async readExistingCards(): Promise<ZettelkastenCard[]> {
        const fileContent = await this.app.vault.read(this.file);
        const cardRegex = /> \[!zk \d+-[01]\].+\n(?:>.+\n)+/g;
        const matches = fileContent.match(cardRegex);
        
        if (!matches) return [];
        
        const cards: ZettelkastenCard[] = [];
        for (const cardString of matches) {
            const card = ZettelkastenCard.parse(cardString);
            if (card) {
                cards.push(card);
            }
        }
        
        return cards;
    }

    private getFrontmatterEndPosition(content: string): number {
        const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/;
        const match = content.match(frontmatterRegex);
        if (match) {
            return match[0].length;
        }
        return 0;
    }

    private removeNonSelectionCards(content: string): string {
        const cardRegex = /> \[!zk \d+-[0]\].+\n(?:>.*\n)+/g;
        return content.replace(cardRegex, '');
    }    

    async writeCards(cards: ZettelkastenCard[]): Promise<void> {
        let fileContent = await this.app.vault.read(this.file);
        let newContent = fileContent;
        
        const hasNonSelectionCards = cards.some(card => !card.isFromSelection);
        if (hasNonSelectionCards) {
            newContent = this.removeNonSelectionCards(fileContent);
        }
        
        const zettelContent = cards.map(card => card.format()).join('\n\n');
       
        if (this.settings.insertCardsAt === 'before') {
            const frontmatterEndPos = this.getFrontmatterEndPosition(newContent);
            newContent = newContent.slice(0, frontmatterEndPos) + zettelContent + '\n\n' + newContent.slice(frontmatterEndPos);
        } else {
            newContent = newContent + '\n\n' + zettelContent;
        }
        
        newContent = newContent.replace(/\n{3,}/g, '\n\n');
        await this.app.vault.modify(this.file, newContent);
    }

    async shouldGenerateCards(): Promise<boolean> {
        if (!this.settings.regenerateExistingCards) {
            const existingCards = await this.readExistingCards();
            for (const card of existingCards) {
                if (!card.isFromSelection) {
                    return false;
                }
            }
        }
        return true;
    }
}

export async function extractZettelkasten(app: App, settings: ExMemoSettings) {
    //console.log("Extracting Zettelkasten...");
    const activeFile = app.workspace.getActiveFile();
    if (!activeFile) {
        new Notice(t('pleaseOpenFile'));
        return;
    }

    if (activeFile.extension !== 'md') {
        new Notice(t('currentFileNotMarkdown'));
        return;
    }

    try {
        const editor = app.workspace.getActiveViewOfType(MarkdownView)?.editor;
        if (!editor) {
            new Notice(t('noActiveEditor'));
            return '';
        }
        const selection = editor.getSelection();
        let content = selection;
        let isFromSelection = false;
        
        if (!selection || selection.trim() === '') {
            content = await app.vault.read(activeFile);
            isFromSelection = false;
        } else {
            isFromSelection = true;
        }
        await createZettelkasten(app, content, activeFile, settings, true, isFromSelection);
    } catch (error) {
        console.error("Error extracting zettelkasten:", error);
    }
}

export async function batchCreateZettelkasten(app: App, files: TFile[], settings: ExMemoSettings) {
    // 暂时未使用
    let successCount = 0;
    let failCount = 0;
    
    for (const file of files) {
        if (file.extension !== 'md') continue;
        
        try {
            const content = await app.vault.read(file);
            await createZettelkasten(app, content, file, settings, false, false);
            successCount++;
        } catch (error) {
            console.error(`Error processing file ${file.path}:`, error);
            failCount++;
        }
    }    
    new Notice(t('batchZettelkastenComplete').replace('{successCount}', successCount.toString()).replace('{failCount}', failCount.toString()));
}

async function createZettelkasten(app: App, content: string, sourceFile: TFile, settings: ExMemoSettings, showNotice = true, isFromSelection = false) {
    try {
        const cardManager = new CardManager(app, sourceFile, settings);
        if (!isFromSelection && !await cardManager.shouldGenerateCards()) {
            if (showNotice) {
                new Notice(t('cardsAlreadyExist'));
            }
            return;
        }
        
        let fileTitle = null;
        if (!isFromSelection) {
            const fm = app.metadataCache.getFileCache(sourceFile);
            let frontMatter = fm?.frontmatter || {};
            fileTitle = frontMatter[settings.metaTitleFieldName]
        }
        
        const card = await processContentWithLLM(app, content, fileTitle, settings, isFromSelection, showNotice);
        await cardManager.writeCards([card]);
        
        if (showNotice) {
            new Notice(t('zettelkastenCreated'));
        }
    } catch (error) {
        console.error("Error creating zettelkasten:", error);
        if (showNotice) {
            new Notice(t('errorExtractingZettelkasten'));
        }
    }
}

async function processContentWithLLM(app: App, content: string, sourceTitle: string|null, settings: ExMemoSettings, isFromSelection: boolean = false, showNotice: boolean = true): Promise<ZettelkastenCard> {
    const card = new ZettelkastenCard(isFromSelection);
    const limit = 200

    try {
        const truncate = !isFromSelection
        const extractor = new FeatureExtractor(content, app, settings, truncate);
        const card_format = `Please extract one card, return plain text`
        const card_prompt = settings.zettelkastenPrompt || t('defaultZettelkastenPrompt');
        if (!sourceTitle) {
            extractor.addFeature('title', settings.metaTitlePrompt, [], true, false);
        }
        extractor.addFeature('content', card_format + ': ' + card_prompt, [], true, false);

        const success = await extractor.extract(true, showNotice);        
        if (success) {
            const results = extractor.getAllFeatures();
            card.title = results.title || sourceTitle;
            card.content = ensureString(results.content) || content.substring(0, limit);
        } else {
            card.content = content.substring(0, limit);
        }
    } catch (error) {
        console.error("Error processing content with LLM:", error);
        card.content = content.substring(0, limit);
    }
    return card;
}
