import { App, Notice, TFile, TFolder } from 'obsidian';
import { ExMemoSettings } from "./settings";
import { getContent } from './utils';
import { callLLM } from "./utils";
import { t } from './lang/helpers';
import { updateFrontMatter } from './utils';

export async function adjustDirMeta(app : App, settings: ExMemoSettings) {
    const file = app.workspace.getActiveFile();
    if (!file) {
        new Notice(t('pleaseOpenFile'));
        return;
    }
    const dir = file.parent;
    await visitDir(dir, app, settings);
}

async function visitDir(dir: any, app: App, settings: ExMemoSettings): Promise<void> {
    const files = app.vault.getMarkdownFiles().filter(file => file.parent === dir);
    console.log('================== dir', dir.path);
    for (const file of files) {
        //addMetaByLLM(file, app, settings);
        console.log('@@@@ file:', file.basename);
    }
    const dirs = app.vault.getAllLoadedFiles()
        .filter(f => f.parent === dir && f instanceof TFolder);
    for (const d of dirs) {
        await visitDir(d, app, settings);
    }
    writeDirInfo(dir, app, settings);
}

async function writeDirInfo(dir: any, app: App, settings: ExMemoSettings) {
    // 获取目录下所有文件和tags
    const files = app.vault.getMarkdownFiles().filter(file => file.parent === dir);
    let tags = {} as {[key: string]: number};
    for (const file of files) {
        const fm = app.metadataCache.getFileCache(file);
        if (fm?.frontmatter?.tags) {
            for (const tag of fm.frontmatter.tags) {
                if (tags[tag]) {
                    tags[tag] += 1;
                } else {
                    tags[tag] = 1;
                }
            }
        }
    }
    const tags_sorted = Object.keys(tags).sort((a, b) => tags[b] - tags[a]);

    // 准备文件列表内容
    const fileLinks = files.map(file => {
        if (file.basename.startsWith('索引_')) return null;
        return `- [${file.basename}](${file.path})`;
    }).filter(link => link !== null).join('\n');

    // 获取或创建索引文件
    const dir_name = dir.path;
    const file_name = `${dir_name}/索引_${dir_name}.md`;
    let abstractFile = app.vault.getAbstractFileByPath(file_name);
    if (!abstractFile || !(abstractFile instanceof TFile)) {
        await app.vault.create(file_name, '');
        abstractFile = app.vault.getAbstractFileByPath(file_name);
        if (!abstractFile || !(abstractFile instanceof TFile)) {
            console.log('failed to create file')
            return
        }
    }

    // 读取文件内容
    let content = await app.vault.read(abstractFile);

    // 更新tags
    content = updateFrontMatterInContent(content, 'tags', tags_sorted);

    // 更新文件列表块
    const fileListBlock = '## 文件列表\n' + fileLinks;
    content = updateContentBlock(content, '文件列表', fileListBlock);

    // 保存文件
    await app.vault.modify(abstractFile, content);
}

// 辅助函数：更新 front matter
function updateFrontMatterInContent(content: string, key: string, value: any): string {
    const frontMatterRegex = /---\s*\n([\s\S]*?)\n---/;
    const match = content.match(frontMatterRegex);
    
    if (match) {
        let frontMatter = match[1];
        const keyRegex = new RegExp(`^${key}:.*$`, 'm');
        const newLine = `${key}: [${Array.isArray(value) ? value.join(', ') : value}]`;
        
        if (frontMatter.match(keyRegex)) {
            frontMatter = frontMatter.replace(keyRegex, newLine);
        } else {
            frontMatter += `\n${newLine}`;
        }
        
        return content.replace(frontMatterRegex, `---\n${frontMatter}\n---`);
    }
    
    return `---\n${key}: [${Array.isArray(value) ? value.join(', ') : value}]\n---\n${content}`;
}

// 辅助函数：更新内容块
function updateContentBlock(content: string, blockTitle: string, newContent: string): string {
    const blockRegex = new RegExp(`## ${blockTitle}[\\s\\S]*?(?=##|$)`);
    const hasBlock = blockRegex.test(content);
    
    if (hasBlock) {
        return content.replace(blockRegex, `${newContent}\n\n`);
    } else {
        return content.trim() + '\n\n' + newContent + '\n';
    }
}

export async function adjustMdMeta(app : App, settings: ExMemoSettings) {
    const file = app.workspace.getActiveFile();
    if (!file) {
        new Notice(t('pleaseOpenFile'));
        return;
    }
    if (file.extension !== 'md') {
        new Notice(t('currentFileNotMarkdown'));
        return;
    }
    const force = settings.metaUpdateMethod === 'force';
    addMetaByLLM(file, app, settings, force);
    addOthersMeta(file, app);
}

async function addMetaByLLM(file:TFile, app: App, settings: ExMemoSettings, force: boolean=false) {
    const fm = app.metadataCache.getFileCache(file);
    if (fm?.frontmatter?.tags && fm?.frontmatter.description && !force) {
        console.warn(t('fileAlreadyContainsTagsAndDescription'));
        return;
    }
    let content_str = '';
    if (settings.metaIsTruncate) {
        content_str = await getContent(app, null, settings.metaMaxTokens, settings.metaTruncateMethod);
    } else {
        content_str = await getContent(app, null, -1, '');
    }
    const option_list = settings.tags;
    const options = option_list.join(',');
    const req = `Please extract up to three tags based on the following article content and generate a brief summary.
The tags should be chosen from the following options: '${options}'. If there are no suitable tags, please create appropriate ones.
${settings.metaDescription}
Please return in the following format: {"tags":"tag1,tag2,tag3","description":"brief summary"}, and in the same language as the content.
The article content is as follows:

${content_str}`;
    
    let ret = await callLLM(req, settings);
    if (ret === "" || ret === undefined || ret === null) {
        return;
    }
    ret = ret.replace(/`/g, '');

    let ret_json = {} as { tags?: string; description?: string };
    try {
        let json_str = ret.match(/{.*}/s);
        if (json_str) {
            ret_json = JSON.parse(json_str[0]) as { tags?: string; description?: string };
        }        
    } catch (error) {
        new Notice(t('parseError') + "\n" + error);
        console.error("parseError:", error);
        return;
    }
    if (ret_json.tags) {
        const tags = ret_json.tags.split(',');
        updateFrontMatter(file, app, 'tags', tags, 'append');
    }
    if (ret_json.description) {
        updateFrontMatter(file, app, 'description', ret_json.description, 'update');
    }
}

function addOthersMeta(file:TFile, app: App) {
    const created = file.stat.ctime;
    const createdDate = new Date(created).toISOString().split('T')[0];
    const updated = file.stat.mtime;
    const updatedDate = new Date(updated).toISOString().split('T')[0];
    updateFrontMatter(file, app, 'created', createdDate, 'keep');
    updateFrontMatter(file, app, 'updated', updatedDate, 'update');
    updateFrontMatter(file, app, 'title', file.basename, 'keep');
}




