import { App, Notice, TFile } from 'obsidian';
import { ExMemoSettings } from "./settings";
import { getContent } from './utils';
import { callLLM } from "./utils";
import { t } from './lang/helpers';
import { updateFrontMatter } from './utils';

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




