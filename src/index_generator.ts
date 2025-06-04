import { App, Notice, TFile, TFolder } from 'obsidian';
import { ExMemoSettings } from "./settings";
import { splitIntoTokens, updateFrontMatter, isIndexFile, updateContentBlock, confirmDialog } from './utils';
import { adjustFileMeta, getReq } from './meta';
import { t } from './lang/helpers';
import { CardManager } from './zettelkasten';

function wildcardToRegex(wildcard: string) {
    let regex = wildcard.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    regex = regex.replace(/\*/g, '.*');
    return new RegExp(regex);
}

function shouldExclude(file: TFile|TFolder, exclude: string|null): boolean {
    if (!exclude) return false;
    
    const excludeList = exclude.split(',').map(s => s.trim()).filter(s => s !== '');
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
    private _messageEl: HTMLElement;
    
    constructor(message: string) {
        super('', 0);
        this._messageEl = document.createElement('div');
        setTimeout(() => {
            const noticeEl = this.noticeEl;
            if (noticeEl) {
                noticeEl.style.display = 'flex';
                noticeEl.style.flexDirection = 'column';
                noticeEl.style.alignItems = 'center';
                noticeEl.style.gap = '8px';
                noticeEl.style.padding = '8px';

                this._messageEl.textContent = message;
                this._messageEl.style.textAlign = 'center';
                noticeEl.appendChild(this._messageEl);

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
        this._messageEl.textContent = message;
    }
}

function checkFileInfo(file: TFile, app: App, needTags: boolean = true): boolean {
    const fm = app.metadataCache.getFileCache(file);
    if ((!needTags && fm?.frontmatter?.description) || (needTags && fm?.frontmatter?.tags && fm?.frontmatter?.description)) {
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

async function processFiles(files: TFile[], app: App, settings: ExMemoSettings, shouldExtract: boolean): Promise<number> {
    // 过滤需要处理的文件
    const filesToProcess = files.filter(file => {
        const hasInfo = checkFileInfo(file, app);
        const isIdx = isIndexFile(file, settings);
        return !hasInfo && !isIdx;
    });
    
    const fileCount = filesToProcess.length;
    
    if (fileCount > 0 && shouldExtract) {
        const notice = new CancellableNotice(`${t('processingFiles')}: 0/${fileCount}`);
        let processed = 0;

        for (const file of filesToProcess) {
            if (notice.cancelled) {
                new Notice(t('processCancelled'));
                return processed;
            }

            await adjustFileMeta(file, app, settings, false, false, true, true);
            await waitForMetadataCache(app, file);
            processed++;
            notice.updateMessage(`${t('processingFiles')}: ${processed}/${fileCount}`);
        }
        notice.hide();        
        await new Promise(resolve => setTimeout(resolve, 500));
        return fileCount;
    }
    
    return 0;
}

async function estimateTokens(files: TFile[], dirs: TFolder[], app: App, settings: ExMemoSettings): Promise<{fileCount: number, dirCount: number, total: number, estimatedTokens: number}> {
    const debug = false;
    let total = files.length;
    let fileCount = 0;
    let estimatedTokens = 0;
    
    for (const file of files) {
        const hasInfo = checkFileInfo(file, app);
        const isIndex = isIndexFile(file, settings);
        if (!hasInfo && !isIndex) {
            fileCount += 1;
            const req = await getReq(file, app, settings);
            if (req && req.length > 0) {
                const tokens = splitIntoTokens(req);
                estimatedTokens += tokens.length + 100;
                if (debug) console.log(file.path, 'tokens:', tokens.length, "+100");
            }
        }
    }
    
    let dirCount = 0;
    if (dirs.length > 0) {
        for (const d of dirs) {
            const indexFile = await getDirIndexFile(d, app, settings, false);
            if (indexFile) {
                const hasInfo = checkFileInfo(indexFile, app, false);
                if (!hasInfo) {
                    dirCount += 1;
                }
            } else {
                dirCount += 1;
            }
        }
        if (debug) console.log('+ dir * 1000', dirCount * 1000);
        estimatedTokens += dirCount * 1000;
    }
    
    return {fileCount, dirCount, total, estimatedTokens};
}

export async function updateFilesMetadata(files: TFile[], app: App, settings: ExMemoSettings): Promise<void> {
    const originalCount = files.length;
    const filteredFiles = files.filter(file => !shouldExclude(file, settings.indexExcludeFile));
    
    if (filteredFiles.length === 0) {
        new Notice(t('foundFilesNeedProcess')
            .replace('{total}', originalCount.toString())
            .replace('{count}', '0'));
        return;
    }
    
    const {fileCount, total, estimatedTokens} = await estimateTokens(filteredFiles, [], app, settings);
    
    let shouldExtract: boolean | undefined = false;
    //console.log('estimatedTokens', estimatedTokens, filteredFiles);
    if (estimatedTokens > 0) {
        let confirmMessage = '';
        if (fileCount > 0) {
            confirmMessage += t('foundFilesNeedProcess')
                .replace('{total}', total.toString())
                .replace('{count}', fileCount.toString()) + '\n\n';
        }
        
        confirmMessage += t('estimatedTokens')
            .replace('{tokens}', Math.ceil(estimatedTokens).toString());
        shouldExtract = await confirmDialog(app, confirmMessage, t("extract"), t("skip"));
    }

    if (shouldExtract === undefined) {
        new Notice(t('processCancelled'));
        return;
    }

    const processedCount = await processFiles(filteredFiles, app, settings, shouldExtract);    
    new Notice(t('processComplete').replace('{count}', shouldExtract ? processedCount.toString() : '0'));
}

export async function createDirIndex(dir: any, app: App, settings: ExMemoSettings): Promise<void> {
    const files = app.vault.getMarkdownFiles()
        .filter(file => file.path.startsWith(dir.path+'/'))
        .filter(file => !shouldExclude(file, settings.indexExcludeFile));
    
    let dirs = app.vault.getAllLoadedFiles()
        .filter(f => (f.path.startsWith(dir.path+'/')
            || f.path === dir.path)
            && f instanceof TFolder
            && !shouldExclude(f, settings.indexExcludeDir)
        ) as TFolder[];
    
    dirs.sort((a, b) => {
        const depthA = a.path.split('/').length;
        const depthB = b.path.split('/').length;
        return depthB - depthA;
    });

    const {fileCount, dirCount, total, estimatedTokens} = await estimateTokens(files, dirs, app, settings);

    let shouldExtract: boolean | undefined = false;
    if (estimatedTokens > 0) {
        let confirmMessage = '';
        if (fileCount > 0) {
            confirmMessage += t('foundFilesNeedProcess')
                .replace('{total}', total.toString())
                .replace('{count}', fileCount.toString()) + '\n\n';
        }
        if (dirCount > 0) {
            confirmMessage += t('foundDirsNeedIndex')
                .replace('{dirs}', dirCount.toString()) + '\n\n';
        }
        confirmMessage += t('estimatedTokens')
            .replace('{tokens}', Math.ceil(estimatedTokens).toString());
        shouldExtract = await confirmDialog(app, confirmMessage, t("extract"), t("skip"));
    }

    if (shouldExtract === undefined) {
        new Notice(t('processCancelled'));
        return;
    }

    await processFiles(files, app, settings, shouldExtract);

    const indexNotice = new CancellableNotice(`${t('generatingIndex')}: 0/${dirs.length}`);
    let indexProcessed = 0;

    for (const d of dirs) {
        if (indexNotice.cancelled) {
            new Notice(t('processCancelled'));
            indexNotice.hide();
            return;
        }
        let idxFile = await updateDirIndex(d, app, settings, shouldExtract);
        if (shouldExtract && idxFile) {
            await waitForMetadataCache(app, idxFile);
        }
        indexProcessed++;
        indexNotice.updateMessage(`${t('generatingIndex')}: ${indexProcessed}/${dirs.length}`);
    }

    indexNotice.hide();
    new Notice(t('processCompleteWithIndex')
        .replace('{count}', shouldExtract ? fileCount.toString() : '0')
        .replace('{dirs}', indexProcessed.toString()));
}

export interface DirEntry {
    name: string;
    path: string;
    isDir: boolean;
    tags?: string[];
    description?: string;
    indexFile?: TFile | null;
    file?: TFile;
}

async function getDirEntries(dir: TFolder, app: App, settings: ExMemoSettings): Promise<DirEntry[]> {
    let entries: DirEntry[] = [];
    
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
    
    return entries;
}

async function updateIndexFile(entries: DirEntry[], indexFile: TFile, app: App, settings: ExMemoSettings, useLLM: boolean = true): Promise<TFile> {
    let tags = {} as {[key: string]: number};
    for (const entry of entries) {
        for (const tag of entry.tags || []) {
            tags[tag] = (tags[tag] || 0) + 1;
        }
    }

    let tags_sorted = Object.keys(tags).sort((a, b) => tags[b] - tags[a]);
    tags_sorted = [t('moc'), ...tags_sorted];
    updateFrontMatter(indexFile, app, 'tags', tags_sorted, 'append');

    const fileList = entries.map(entry => {
        if (entry.isDir) {
            const path = entry.indexFile ? entry.indexFile.path.replace(/ /g, '%20') : '';
            const link = entry.indexFile ? 
                `- [${entry.name}](${path})` :
                `- ${entry.name}`;
            return link;
        } else {
            const path = entry.path.replace(/ /g, '%20');
            return `- [${entry.name}](${path})`;
        }
    }).join('\n');

    const fileDetail = entries.map(entry => {
        const path = entry.isDir && entry.indexFile ? entry.indexFile.path.replace(/ /g, '%20') : entry.path;
        const link = entry.isDir && entry.indexFile ?
            `- [${entry.name}](${path})` :
            entry.isDir ?
                `- ${entry.name}` :
                `- [${entry.name}](${path})`;
        return `${link}\n  - ${entry.description}`;
    }).join('\n');

    let cardsContent = '';
    for (const entry of entries) {
        if (!entry.isDir && entry.file) {
            try {
                const cardManager = new CardManager(app, entry.file, settings);
                const cards = await cardManager.readExistingCards();
                if (cards && cards.length > 0) {
                    const path = entry.path.replace(/ /g, '%20');
                    cardsContent += `- [${entry.name}](${path})\n`;
                    cards.forEach(card => {
                        cardsContent += card.format() + '\n\n';
                    });
                }
            } catch (error) {
                console.error(`Error reading cards from ${entry.path}:`, error);
            }
        }
    }

    let content = await app.vault.read(indexFile);
    
    const fileListBlock = '## ' + t('fileList') + '\n' + fileList;
    content = updateContentBlock(content, t('fileList'), fileListBlock);
    
    const fileDetailBlock = '## ' + t('fileDetail') + '\n' + fileDetail;
    content = updateContentBlock(content, t('fileDetail'), fileDetailBlock);

    if (cardsContent.trim()) {
        const cardsBlock = '## ' + t('cards') + '\n' + cardsContent;
        content = updateContentBlock(content, t('cards'), cardsBlock);
    }

    await app.vault.modify(indexFile, content);
    await adjustFileMeta(indexFile, app, settings, false, false, useLLM, false);
    return indexFile;
}

export async function createTempIndex(files: TFile[], app: App, settings: ExMemoSettings, query: string | null = null): Promise<TFile | null> {
    const filteredFiles = files.filter(file => !shouldExclude(file, settings.indexExcludeFile));
    
    if (filteredFiles.length === 0) {
        new Notice(t('foundFilesNeedProcess').replace('{total}', files.length.toString()).replace('{count}', '0') + t('processCancelled'));
        return null;
    }
    
    await updateFilesMetadata(filteredFiles, app, settings);
    
    let entries: DirEntry[] = [];
    for (const file of filteredFiles) {
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
    
    entries.sort((a, b) => a.name.localeCompare(b.name));
    
    let fileName = '';
    
    if (query) {
        let sanitizedQuery = query
            .replace(/[\/\\:*?"<>|#]/g, '_') // 替换文件系统不允许的字符和井号
            .replace(/\s+/g, '')           // 移除所有空格
            .replace(/_+/g, '_')           // 将多个连续下划线合并为一个

        if (sanitizedQuery.length > 20) {
            sanitizedQuery = sanitizedQuery.slice(0, 20) + '...';
        }
        fileName = `${settings.defaultIndexString}${sanitizedQuery}`;        
    } else {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        fileName = `${settings.defaultIndexString}-${timestamp.slice(0, 10)}`;
    }
    
    const tempIndexName = `${fileName}.md`;
    let dir = settings.indexFileDirectory;
    let tempIndexPath = ''
    if (dir && dir !== '' && dir !== '/') {
        dir = dir.replace(/\/$/, '');
        
        const folderExists = app.vault.getAbstractFileByPath(dir);
        if (!folderExists) {
            try {
                await app.vault.createFolder(dir);
            } catch (error) {
                console.error('Error creating directory:', error);
                return null;
            }
        }
        
        tempIndexPath = `${dir}/${tempIndexName}`;
    } else {
        tempIndexPath = `${tempIndexName}`;
    }

    try {
        let tempIndexFile = app.vault.getAbstractFileByPath(tempIndexPath) as TFile | null;
        let isFileExists = !!tempIndexFile;
        const escapedQuery = query ? query.replace(/"/g, '\\"') : '';

        if (!tempIndexFile) {
            const initialContent = `---\ntags: []\nquery: "${escapedQuery}"\n---\n\n`;
            await app.vault.create(tempIndexPath, initialContent);
            
            tempIndexFile = app.vault.getAbstractFileByPath(tempIndexPath) as TFile | null;
                            
            if (!tempIndexFile) {
                new Notice(t('failedToCreateIndex'));
                return null;
            }
        } else {
            updateFrontMatter(tempIndexFile, app, 'query', `"${escapedQuery}"`, 'update');
        }
        
        const indexFile = await updateIndexFile(entries, tempIndexFile, app, settings, true);
        
        if (isFileExists) {
            new Notice(t('indexUpdated').replace('{path}', tempIndexFile.path));
        } else {
            new Notice(t('indexCreated').replace('{path}', tempIndexFile.path));
        }
        
        return indexFile;
    } catch (error) {
        console.error('Error creating temp index:', error);
        new Notice(t('failedToCreateIndex'));
        return null;
    }
}

async function updateDirIndex(dir: TFolder, app: App, settings: ExMemoSettings, useLLM: boolean = true): Promise<TFile | null> {
    const entries = await getDirEntries(dir, app, settings);    
    let indexFile = await getDirIndexFile(dir, app, settings);
    if (!indexFile || !(indexFile instanceof TFile)) {
        console.log('failed to get file');
        return null;
    }
    
    const query = `"path:${dir.path}/"`;
    updateFrontMatter(indexFile, app, 'query', query, 'update');
    
    return await updateIndexFile(entries, indexFile, app, settings, useLLM);
}

export async function updateIndex(file: TFile, app: App, settings: ExMemoSettings, useLLM: boolean = true): Promise<TFile | null> {
    const fm = app.metadataCache.getFileCache(file);
    if (!fm || !fm.frontmatter || !fm.frontmatter.query) { // old index file without query
        const parent = app.vault.getAbstractFileByPath(file.path)?.parent;
        if (parent instanceof TFolder) {
            await createDirIndex(parent, app, settings);
        }    
    } else {
        let query = fm.frontmatter.query;
        query = query.replace(/['"]/g, '');
        if (query.startsWith('path:')) {
            let dirPath = query.slice(5).trim();
            if (dirPath.endsWith('/')) {
                dirPath = dirPath.slice(0, -1);
            }
            const dir = app.vault.getAbstractFileByPath(dirPath);
            if (dir instanceof TFolder) {
                await createDirIndex(parent, app, settings);
            }
        } else {
            new Notice(t('indexQueryNotSupported'));
        }
    }
    return null;
}
