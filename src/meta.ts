import { App, Notice, TFile } from 'obsidian';
import { ExMemoSettings } from "./settings";
import { getContent } from './utils';
import { callLLM } from "./utils";
import { t } from './lang/helpers';
import { updateFrontMatter } from './utils';

export async function adjustFileMeta(file:TFile, app: App, settings: ExMemoSettings,
            force: boolean=false, showNotice: boolean=true, useLLM: boolean=true, debug: boolean=false) {
    let hasChanges = false;
    if (useLLM) {
        hasChanges = await addMetaByLLM(file, app, settings, force, showNotice, debug);
    }

    // 添加时间相关元数据 - 只在功能启用时执行
    if (settings.metaEditTimeEnabled) {
        try {
            // 使用原生 JavaScript Date 对象
            const now = new Date();
            const formattedNow = formatDate(now, settings.metaEditTimeFormat);
            updateFrontMatter(file, app, settings.metaUpdatedFieldName, formattedNow, 'update');
            
            // 添加创建时间
            const created = new Date(file.stat.ctime);
            const createdDate = formatDate(created, 'YYYY-MM-DD');
            updateFrontMatter(file, app, settings.metaCreatedFieldName, createdDate, 'update');
            
            hasChanges = true;
        } catch (error) {
            console.error('Update time failed:', error);
            new Notice(t('llmError') + ': ' + error);
        }
    }

    // 添加自定义元数据
    if (settings.customMetadata && settings.customMetadata.length > 0) {
        for (const meta of settings.customMetadata) {
            if (meta.key && meta.value) {
                let finalValue: string | boolean = meta.value;
                if (meta.value.toLowerCase() === 'true' || meta.value.toLowerCase() === 'false') {
                    finalValue = (meta.value.toLowerCase() === 'true') as boolean;
                }
                updateFrontMatter(file, app, meta.key, finalValue, force ? 'update' : 'keep');
            }
        }
        hasChanges = true;
    }    

    if (hasChanges) {
        new Notice(t('metaUpdated'));
    }
}

export async function getReq(file: TFile, app: App, settings: ExMemoSettings, force: boolean = false) {
    const content_str = await getContent(app, file, settings);
    const fm = app.metadataCache.getFileCache(file)?.frontmatter;
    
    // 构建基础请求内容
    let reqParts = [];
    let jsonParts = [];
    
    // 只有在需要生成标签时才添加标签相关内容
    if (force || !fm?.[settings.metaTagsFieldName] || fm[settings.metaTagsFieldName].length === 0) {
        const tag_options = settings.tags.join(',');
        reqParts.push(`1. Tags: ${settings.metaTagsPrompt}\n   Available tags: ${tag_options}. Feel free to create new ones if none are suitable.`);
        jsonParts.push(`"tags": "tag1,tag2,tag3"`);
    }

    // 添加其他元数据要求
    let categories_options = settings.categories.join(',') || t('categoryUnknown');
    reqParts.push(`${reqParts.length + 1}. Category: ${settings.metaCategoryPrompt}\n   Available categories: ${categories_options}. Must choose ONE from the available categories.`);
    jsonParts.push(`"category": "category_name"`);

    reqParts.push(`${reqParts.length + 1}. Description: ${settings.metaDescription}`);
    jsonParts.push(`"description": "brief summary"`);

    if (settings.metaTitleEnabled) {
        reqParts.push(`${reqParts.length + 1}. Title: ${settings.metaTitlePrompt}`);
        jsonParts.push(`"title": "article title"`);
    }

    const req = `I need to generate metadata for the following article. Requirements:\n\n` +
        reqParts.join('\n\n') +
        `\n\nPlease return in the following JSON format:\n{\n    ${jsonParts.join(',\n    ')}\n}\n\n` +
        `File path: ${file.path}\n\nThe article content is as follows:\n\n${content_str}`;

    return req;
}

async function addMetaByLLM(file: TFile, app: App, settings: ExMemoSettings, 
            force: boolean=false, showNotice: boolean=true, debug: boolean=false) {
    const fm = app.metadataCache.getFileCache(file);
    let frontMatter = fm?.frontmatter || {};
    let hasChanges = false;
        
    // 添加标签、类别、描述和标题
    if (!frontMatter[settings.metaTagsFieldName] || 
        frontMatter[settings.metaTagsFieldName]?.length === 0 ||
        !frontMatter[settings.metaDescriptionFieldName] || 
        frontMatter[settings.metaDescriptionFieldName]?.trim() === '' ||
        (settings.metaTitleEnabled && 
            (!frontMatter[settings.metaTitleFieldName] || 
                frontMatter[settings.metaTitleFieldName]?.trim() === '')) ||
        (settings.metaCategoryEnabled && 
            (!frontMatter[settings.metaCategoryFieldName] || 
                frontMatter[settings.metaCategoryFieldName]?.trim() === '')) ||
        force) {
        hasChanges = true;
    } else {
        console.warn(t('fileAlreadyContainsTagsAndDescription'));
    }

    const req = await getReq(file, app, settings, force);
    let ret = await callLLM(req, settings, showNotice);
    if (debug) {
        //console.log('content_str', content_str);
        //console.log('req', req);
        console.log('callLLM ret:', ret);
    }

    if (ret === "" || ret === undefined || ret === null) {
        return false;
    }
    ret = ret.replace(/`/g, '');

    let ret_json = {} as { tags?: string; category?: string; description?: string; title?: string };
    try {
        let json_str = ret.match(/{[^]*}/);
        if (json_str) {
            ret_json = JSON.parse(json_str[0]) as { tags?: string; category?: string; description?: string; title?: string };
        }        
    } catch (error) {
        new Notice(t('parseError') + "\n" + error);
        console.error("parseError:", error);
        return false;
    }
    
    // 检查并更新各个字段
    if (ret_json.tags) {
        const tags = ret_json.tags.split(',');
        updateFrontMatter(file, app, settings.metaTagsFieldName, tags, 'append');
    }
    
    if (ret_json.category && settings.metaCategoryEnabled) {
        const currentValue = frontMatter[settings.metaCategoryFieldName];
        const isEmpty = !currentValue || currentValue.trim() === '';
        updateFrontMatter(file, app, settings.metaCategoryFieldName, ret_json.category, 
            force || isEmpty ? 'update' : 'keep');
    }

    if (ret_json.description) {
        const currentValue = frontMatter[settings.metaDescriptionFieldName];
        const isEmpty = !currentValue || currentValue.trim() === '';
        updateFrontMatter(file, app, settings.metaDescriptionFieldName, ret_json.description, 
            force || isEmpty ? 'update' : 'keep');
    }

    if (settings.metaTitleEnabled && ret_json.title) {
        let title = ret_json.title.trim();
        if ((title.startsWith('"') && title.endsWith('"')) || 
            (title.startsWith("'") && title.endsWith("'"))) {
            title = title.substring(1, title.length - 1);
        }
        const currentValue = frontMatter[settings.metaTitleFieldName];
        const isEmpty = !currentValue || currentValue.trim() === '';
        updateFrontMatter(file, app, settings.metaTitleFieldName, title, 
            force || isEmpty ? 'update' : 'keep');
    }
    return hasChanges;
}

// 使用自定义的日期格式化函数
function formatDate(date: Date, format: string): string {
    // 简单的格式化实现，支持基本的 YYYY-MM-DD HH:mm:ss 格式
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return format
        .replace('YYYY', year.toString())
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds);
}