import { App, Notice, TFile } from 'obsidian';
import { ExMemoSettings } from "./settings";
import { t } from './lang/helpers';
import { updateFrontMatter } from './utils';
import { FeatureExtractor } from './feature_extractor';

export async function adjustFileMeta(file:TFile, app: App, settings: ExMemoSettings,
            force: boolean=false, showNotice: boolean=true, useLLM: boolean=true, debug: boolean=false) {
    let hasChanges = false;
    if (useLLM) {
        hasChanges = await addMetaByLLM(file, app, settings, force, showNotice, debug);
    }

    // 添加封面
    if (await addCover(file, app, settings, force)) {
        hasChanges = true;
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
                if (meta.type !== 'prompt') {
                    let finalValue: string | boolean = meta.value;
                    if (meta.value.toLowerCase() === 'true' || meta.value.toLowerCase() === 'false') {
                        finalValue = (meta.value.toLowerCase() === 'true') as boolean;
                    }
                    updateFrontMatter(file, app, meta.key, finalValue, force ? 'update' : 'keep');
                }
            }
        }
        hasChanges = true;
    }    

    if (hasChanges && showNotice) {
        new Notice(t('metaUpdated'));
    }
}

export async function getReq(file: TFile, app: App, settings: ExMemoSettings, force: boolean = false) {
    const extractor = new FeatureExtractor(file, app, settings);
    const needToExtract = addFeaturesForExtraction(extractor, file, app, settings, force);
    if (needToExtract || force) {
        return await extractor.buildRequest();
    } else {
        return '';
    }
}

async function addMetaByLLM(file: TFile, app: App, settings: ExMemoSettings, 
            force: boolean=false, showNotice: boolean=true, debug: boolean=false) {
    const extractor = new FeatureExtractor(file, app, settings);
    const fm = app.metadataCache.getFileCache(file);
    let frontMatter = fm?.frontmatter || {};

    const needToExtract = addFeaturesForExtraction(extractor, file, app, settings, force);
    if (!needToExtract) {
        if (debug) console.warn(t('fileAlreadyContainsTagsAndDescription'));
        return false;
    }
    
    // 提取特征
    const success = await extractor.extract(force, showNotice);
    if (!success) return false;
    
    // 获取结果并更新前置元数据
    const results = extractor.getAllFeatures();
    
    // 更新标签
    if (results[settings.metaTagsFieldName]) {
        updateFrontMatter(file, app, settings.metaTagsFieldName, 
                          results[settings.metaTagsFieldName], 'append');
    }
    
    // 更新类别
    if (results[settings.metaCategoryFieldName] && settings.metaCategoryEnabled) {
        const currentValue = frontMatter[settings.metaCategoryFieldName];
        const isEmpty = !currentValue || currentValue.trim() === '';
        updateFrontMatter(file, app, settings.metaCategoryFieldName, 
                          results[settings.metaCategoryFieldName], 
                          force || isEmpty ? 'update' : 'keep');
    }

    // 更新描述
    if (results[settings.metaDescriptionFieldName]) {
        const currentValue = frontMatter[settings.metaDescriptionFieldName];
        const isEmpty = !currentValue || currentValue.trim() === '';
        updateFrontMatter(file, app, settings.metaDescriptionFieldName, 
                          results[settings.metaDescriptionFieldName], 
                          force || isEmpty ? 'update' : 'keep');
    }

    // 更新标题
    if (settings.metaTitleEnabled && results[settings.metaTitleFieldName]) {
        let title = results[settings.metaTitleFieldName];
        if (typeof title === 'string') {
            title = title.trim();
            if ((title.startsWith('"') && title.endsWith('"')) || 
                (title.startsWith("'") && title.endsWith("'"))) {
                title = title.substring(1, title.length - 1);
            }
        }
        const currentValue = frontMatter[settings.metaTitleFieldName];
        const isEmpty = !currentValue || currentValue.trim() === '';
        updateFrontMatter(file, app, settings.metaTitleFieldName, title, 
                          force || isEmpty ? 'update' : 'keep');
    }

    // 更新自定义元数据
    if (settings.customMetadata && settings.customMetadata.length > 0) {
        for (const meta of settings.customMetadata) {
            if (meta.key && meta.value && meta.type === 'prompt' && results[meta.key] !== undefined) {
                let value = results[meta.key];
                
                if (typeof value === 'string') {
                    value = value.trim();
                    if ((value.startsWith('"') && value.endsWith('"')) || 
                        (value.startsWith("'") && value.endsWith("'"))) {
                        value = value.substring(1, value.length - 1);
                    }
                }
                
                const currentValue = frontMatter[meta.key];
                const isEmpty = !currentValue || (typeof currentValue === 'string' && currentValue.trim() === '');
                updateFrontMatter(file, app, meta.key, value, force || isEmpty ? 'update' : 'keep');
            }
        }
    }
    
    return true;
}

function addFeaturesForExtraction(
    extractor: FeatureExtractor,
    file: TFile, 
    app: App, 
    settings: ExMemoSettings, 
    force: boolean = false
): boolean {
    const fm = app.metadataCache.getFileCache(file);
    let frontMatter = fm?.frontmatter || {};
    let needToExtract = force;
    
    if (!frontMatter[settings.metaTagsFieldName] || 
        frontMatter[settings.metaTagsFieldName]?.length === 0 || force) {
        extractor.addFeature(
            settings.metaTagsFieldName,
            settings.metaTagsPrompt,
            settings.tags,
            true,
            true
        );
        needToExtract = true;
    }
    
    if (settings.metaCategoryEnabled &&
        (!frontMatter[settings.metaCategoryFieldName] || 
        frontMatter[settings.metaCategoryFieldName]?.trim() === '' || force)) {
        extractor.addFeature(
            settings.metaCategoryFieldName,
            settings.metaCategoryPrompt,
            settings.categories || [t('categoryUnknown')],
            true,
            false
        );
        needToExtract = true;
    }

    if (!frontMatter[settings.metaDescriptionFieldName] || 
        frontMatter[settings.metaDescriptionFieldName]?.trim() === '' || force) {
        extractor.addFeature(
            settings.metaDescriptionFieldName,
            settings.metaDescription,
            [],
            true,
            false
        );
        needToExtract = true;
    }

    if (settings.metaTitleEnabled && 
        (!frontMatter[settings.metaTitleFieldName] || 
        frontMatter[settings.metaTitleFieldName]?.trim() === '' || force)) {
        extractor.addFeature(
            settings.metaTitleFieldName,
            settings.metaTitlePrompt,
            [],
            true,
            false
        );
        needToExtract = true;
    }

    if (settings.customMetadata && settings.customMetadata.length > 0) {
        for (const meta of settings.customMetadata) {
            if (meta.key && meta.value && meta.type === 'prompt' &&
                (!frontMatter[meta.key] || 
                (typeof frontMatter[meta.key] === 'string' && frontMatter[meta.key].trim() === '') || 
                force)) {
                extractor.addFeature(
                    meta.key,
                    meta.value,
                    [],
                    true,
                    false
                );
                needToExtract = true;
            }
        }
    }
    
    return needToExtract;
}

async function addCover(file: TFile, app: App, settings: ExMemoSettings, force: boolean=false): Promise<boolean> {
    if (settings.metaCoverEnabled) {
        const fm = app.metadataCache.getFileCache(file);
        let frontMatter = fm?.frontmatter || {};    
        const currentValue = frontMatter[settings.metaCoverFieldName];
        const isEmpty = !currentValue || currentValue.trim() === '';
        
        if (force || isEmpty) {
            let coverUrl = settings.metaCoverUrl;
            
            if (settings.metaCoverUseFirst) {
                const content = await app.vault.read(file);
                const firstImage = content.match(/!\[.*?\]\((.*?)\)/);
                if (firstImage && firstImage[1]) {
                    coverUrl = firstImage[1];
                }
            }
            
            if (coverUrl) {
                updateFrontMatter(file, app, settings.metaCoverFieldName, coverUrl, 'update');
                return true;
            }
        }
    }
    return false;
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