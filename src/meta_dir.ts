import { App, Notice, TFile, TFolder } from 'obsidian';
import { ExMemoSettings } from "./settings";
import { splitIntoTokens, updateFrontMatter, isIndexFile, updateContentBlock, confirmDialog } from './utils';
import { adjustFileMeta, getReq } from './meta';
import { t } from './lang/helpers';

function wildcardToRegex(wildcard: string) {
    let regex = wildcard.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    regex = regex.replace(/\*/g, '.*');
    return new RegExp(regex);
}

function shouldExcludeFile(file: TFile, settings: ExMemoSettings): boolean {
    if (!settings.indexExclude) return false;
    
    const excludeList = settings.indexExclude.split(',').map(s => s.trim()).filter(s => s !== '');
    for (const excludePath of excludeList) {
        const regex = wildcardToRegex(excludePath);
        if (regex.test(file.path)) {
            return true;
        }
    }
    return false;
}

class CancellableNotice extends Notice {
    cancelled = false;
    messageEl: HTMLElement | null = null;
    
    constructor(message: string) {
        super('', 0);
        setTimeout(() => {
            const noticeEl = this.noticeEl;
            if (noticeEl) {
                noticeEl.style.display = 'flex';
                noticeEl.style.flexDirection = 'column';
                noticeEl.style.alignItems = 'center';
                noticeEl.style.gap = '8px';
                noticeEl.style.padding = '8px';

                this.messageEl = document.createElement('div');
                this.messageEl.textContent = message;
                this.messageEl.style.textAlign = 'center';
                noticeEl.appendChild(this.messageEl);

                const cancelButton = document.createElement('button');
                cancelButton.textContent = t('cancel');
                cancelButton.style.minWidth = '60px';
                cancelButton.style.padding = '4px 8px';
                cancelButton.addEventListener('click', () => {
                    this.cancelled = true;
                    this.hide();
                });
                noticeEl.appendChild(cancelButton);
            }
        }, 0);
    }

    updateMessage(message: string) {
        if (this.messageEl) {
            this.messageEl.textContent = message;
        }
    }
}

function checkFileInfo(file: TFile, app: App) {
    const fm = app.metadataCache.getFileCache(file);
    if (fm?.frontmatter?.tags && fm?.frontmatter.description) {
        return true;
    } else {
        return false;
    }
}

async function waitForMetadataCache(app: App, file: TFile, maxAttempts: number = 10): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
        const fm = app.metadataCache.getFileCache(file);
        if (fm?.frontmatter?.description) {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

async function getDirIndexFile(dir: TFolder, app: App, settings: ExMemoSettings, create: boolean=true): Promise<TFile | null> {
    const dir_path = dir.path;
    const dir_name = dir.name;
    const file_name = `${dir_path}/${settings.defaultIndexString}${dir_name}.md`;
    let abstractFile = app.vault.getAbstractFileByPath(file_name);
    if (!abstractFile || !(abstractFile instanceof TFile)) {
        if (!create) return null;
        //console.log('createIndexFile', file_name);
        await app.vault.create(file_name, '');
        abstractFile = app.vault.getAbstractFileByPath(file_name);
        if (!abstractFile || !(abstractFile instanceof TFile)) {
            console.log('failed to create file')
            return null;
        }
    }
    return abstractFile;
}

export async function optDir(dir: any, app: App, settings: ExMemoSettings): Promise<void> {
    // 统计文件和目录
    const files = app.vault.getMarkdownFiles()
        .filter(file => file.path.startsWith(dir.path+'/'))
        .filter(file => !shouldExcludeFile(file, settings));
    
    let dirs = app.vault.getAllLoadedFiles()
        .filter(f => f.path.startsWith(dir.path+'/')
            && f instanceof TFolder) as TFolder[];
    
    // 按照路径深度排序
    dirs.sort((a, b) => {
        const depthA = a.path.split('/').length;
        const depthB = b.path.split('/').length;
        return depthB - depthA;
    });

    let total = 0;
    let count = 0;
    for (const file of files) {
        const hasInfo = checkFileInfo(file, app);
        const isIndex = isIndexFile(file, settings);
        total += 1;
        if (!hasInfo && !isIndex) {
            count += 1;
        }
    }
    const dirCount = dirs.length + 1; // +1 为当前目录
    //console.log('total:', total, 'count:', count, 'dirs:', dirCount);

    // 构建确认消息
    let confirmMessage = '';
    if (count > 0) {
        confirmMessage += t('foundFilesNeedProcess')
            .replace('{total}', total.toString())
            .replace('{count}', count.toString()) + '\n\n';
    }
    confirmMessage += t('foundDirsNeedIndex').replace('{dirs}', dirCount.toString());

    if (count > 0) {
        let estimatedTokens = 0;
        for (const file of files) {
            if (!checkFileInfo(file, app)) {
                const req = await getReq(file, app, settings);
                const tokens = splitIntoTokens(req);
                estimatedTokens += tokens.length + 100;
            }
        }
        // 加入生成索引的预计token
        estimatedTokens += dirCount * 1000;
        confirmMessage += '\n\n' + t('estimatedTokens')
            .replace('{tokens}', Math.ceil(estimatedTokens).toString());
    }

    // 确认对话框
    const shouldExtract = await confirmDialog(app, confirmMessage, t("extract"), t("skip"));

    if (shouldExtract === undefined) {
        new Notice(t('processCancelled'));
        return;
    }

    // 处理文件
    if (count > 0 && shouldExtract) {
        const notice = new CancellableNotice(`${t('processingFiles')}: 0/${count}`);
        let processed = 0;

        for (const file of files) {
            if (notice.cancelled) {
                new Notice(t('processCancelled'));
                return;
            }

            const hasInfo = checkFileInfo(file, app);
            const isIndex = isIndexFile(file, settings);
            if (!hasInfo && !isIndex) {
                await adjustFileMeta(file, app, settings, false, false, true, true);
                await waitForMetadataCache(app, file);
                processed++;
                notice.updateMessage(`${t('processingFiles')}: ${processed}/${count}`);
            }
        }
        notice.hide();        
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // 处理目录索引
    const indexNotice = new CancellableNotice(`${t('generatingIndex')}: 0/${dirCount}`);
    let indexProcessed = 0;

    // 处理子目录
    for (const d of dirs) {
        if (indexNotice.cancelled) {
            new Notice(t('processCancelled'));
            indexNotice.hide();
            return;
        }
        if (d instanceof TFolder) {
            await writeIndex(d, app, settings, shouldExtract);
            indexProcessed++;
            indexNotice.updateMessage(`${t('generatingIndex')}: ${indexProcessed}/${dirCount}`);
        }
    }

    // 处理当前目录
    if (!indexNotice.cancelled) {
        await writeIndex(dir, app, settings, shouldExtract);
        indexProcessed++;
        indexNotice.updateMessage(`${t('generatingIndex')}: ${indexProcessed}/${dirCount}`);
        indexNotice.hide();
        new Notice(t('processCompleteWithIndex')
            .replace('{count}', shouldExtract ? count.toString() : '0')
            .replace('{dirs}', indexProcessed.toString()));
    }
}

interface DirEntry {
    name: string;
    path: string;
    isDir: boolean;
    tags?: string[];
    description?: string;
    indexFile?: TFile | null;
    file?: TFile;
}

async function writeIndex(dir: any, app: App, settings: ExMemoSettings, useLLM: boolean = true) {
    // 1. Collect all entry information
    let entries: DirEntry[] = [];
    
    // Collect and sort subdirectory information
    let subDirs = app.vault.getAllLoadedFiles()
        .filter(f => f.parent === dir && f instanceof TFolder) as TFolder[];
    subDirs.sort((a, b) => a.name.localeCompare(b.name));

    for (const subDir of subDirs) {
        const indexFile = await getDirIndexFile(subDir, app, settings, false);
        const fm = indexFile ? app.metadataCache.getFileCache(indexFile) : null;
        entries.push({
            name: subDir.name,
            path: subDir.path,
            isDir: true,
            tags: fm?.frontmatter?.tags || [],
            description: fm?.frontmatter?.description || t('noDescription'),
            indexFile: indexFile
        });
    }

    // Collect and sort file information
    let files = app.vault.getMarkdownFiles()
        .filter(file => file.parent === dir)
        .filter(file => !shouldExcludeFile(file, settings))
        .filter(file => !isIndexFile(file, settings));
    files.sort((a, b) => a.basename.localeCompare(b.basename));

    for (const file of files) {
        const fm = app.metadataCache.getFileCache(file);
        entries.push({
            name: file.basename,
            path: file.path,
            isDir: false,
            tags: fm?.frontmatter?.tags || [],
            description: fm?.frontmatter?.description || t('noDescription'),
            file: file
        });
    }

    // 2. Collect all tags
    let tags = {} as {[key: string]: number};
    for (const entry of entries) {
        for (const tag of entry.tags || []) {
            tags[tag] = (tags[tag] || 0) + 1;
        }
    }

    // 3. Get or create index file
    let abstractFile = await getDirIndexFile(dir, app, settings);
    if (!abstractFile || !(abstractFile instanceof TFile)) {
        console.log('failed to get file');
        return;
    }

    // 4. Update tags
    let tags_sorted = Object.keys(tags).sort((a, b) => tags[b] - tags[a]);
    tags_sorted = [t('moc'), ...tags_sorted];
    updateFrontMatter(abstractFile, app, 'tags', tags_sorted, 'append');

    // 5. Generate file list and detail content
    const fileList = entries.map(entry => {
        if (entry.isDir) {
            const link = entry.indexFile ? 
                `- [${entry.name}](${entry.indexFile.path})` :
                `- ${entry.name}`;
            return link;
        } else {
            return `- [${entry.name}](${entry.path})`;
        }
    }).join('\n');

    const fileDetail = entries.map(entry => {
        const link = entry.isDir && entry.indexFile ?
            `- [${entry.name}](${entry.indexFile.path})` :
            entry.isDir ?
                `- ${entry.name}` :
                `- [${entry.name}](${entry.path})`;
        return `${link}\n  - ${entry.description}`;
    }).join('\n');

    // 6. Update file content
    let content = await app.vault.read(abstractFile);
    
    const fileListBlock = '## ' + t('fileList') + '\n' + fileList;
    content = updateContentBlock(content, t('fileList'), fileListBlock);
    
    const fileDescBlock = '## ' + t('fileDetail') + '\n' + fileDetail;
    content = updateContentBlock(content, t('fileDetail'), fileDescBlock);

    // 7. Save file and generate description
    await app.vault.modify(abstractFile, content);
    await adjustFileMeta(abstractFile, app, settings, false, false, useLLM, false);
}


