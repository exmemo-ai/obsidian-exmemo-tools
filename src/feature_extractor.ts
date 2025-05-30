import { App, TFile } from 'obsidian';
import { ExMemoSettings } from "./settings";
import { getContent } from './utils';
import { callLLM } from "./llm_utils";
import { t } from './lang/helpers';

interface FeatureDefinition {
    key: string;
    prompt: string;
    options?: string[];
    required?: boolean;
    multiple?: boolean;
    jsonType?: string;
}

export class FeatureExtractor {
    private features: Map<string, FeatureDefinition> = new Map();
    private results: Record<string, any> = {};
    private app: App;
    private file?: TFile;
    private settings: ExMemoSettings;
    private content: string = "";
    private debug: boolean = false;
    private extracted: boolean = false;
    private truncateContent: boolean = true;

    constructor(fileOrContent: TFile | string, app: App, settings: ExMemoSettings, truncate: boolean = true) {
        this.app = app;
        this.settings = settings;
        this.truncateContent = truncate;
        
        if (fileOrContent instanceof TFile) {
            this.file = fileOrContent;
        } else {
            this.content = fileOrContent;
        }
    }

    addFeature(
        key: string, 
        prompt: string, 
        options: string[] = [], 
        required: boolean = true,
        multiple: boolean = false
    ) {
        this.features.set(key, { 
            key, 
            prompt, 
            options, 
            required,
            multiple,
            jsonType: multiple ? `"${key}": "value1,value2,value3"` : `"${key}": "value"`
        });
    }

    public async buildRequest(): Promise<string> {
        if (this.file && !this.content) {
            this.content = await getContent(this.app, this.file, this.settings, false, this.truncateContent);
        }
        
        let reqParts: string[] = [];
        let jsonParts: string[] = [];
        
        let index = 1;
        for (const feature of this.features.values()) {
            let reqPart = `${index}. ${feature.key}: ${feature.prompt}`;
            
            if (feature.options && feature.options.length > 0) {
                const optionsText = feature.options.join(',');
                reqPart += `\n   Available ${feature.key}: ${optionsText}`;
                
                if (feature.multiple) {
                    reqPart += ". Feel free to choose multiple options or create new ones if none are suitable.";
                } else {
                    reqPart += ". Must choose ONE from the available options.";
                }
            }
            
            reqParts.push(reqPart);
            jsonParts.push(feature.jsonType || `"${feature.key}": "value for ${feature.key}"`);
            index++;
        }

        let req = `I need to generate metadata for the following article. Requirements:\n\n` +
            reqParts.join('\n\n') +
            `\n\nPlease return in the following JSON format:\n{\n    ${jsonParts.join(',\n    ')}\n}\n\n`;
            
        if (this.file) {
            req += `File path: ${this.file.path}\n\n`;
        }
        
        req += `The article content is as follows:\n\n${this.content}`;

        return req;
    }

    async extract(force: boolean = false, showNotice: boolean = true): Promise<boolean> {
        if (this.features.size === 0) {
            return false;
        }

        let needToExtract = force;
        
        if (!force && this.file) {
            const fm = this.app.metadataCache.getFileCache(this.file)?.frontmatter || {};
            
            for (const feature of this.features.values()) {
                if (feature.required && 
                   (!fm[feature.key] || 
                    (Array.isArray(fm[feature.key]) && fm[feature.key].length === 0) ||
                    (typeof fm[feature.key] === 'string' && fm[feature.key].trim() === ''))) {
                    needToExtract = true;
                    break;
                }
            }
            
            if (!needToExtract) {
                if (this.debug) console.warn(t('alreadyContainsMetadata'));
                return false;
            }
        }

        const req = await this.buildRequest();
        let ret = await callLLM(req, this.settings, showNotice);
        
        if (this.debug) {
            console.log('LLM request:', req);
            console.log('LLM response:', ret);
        }

        if (!ret) {
            return false;
        }
        ret = ret.replace(/`/g, '');

        try {
            let json_str = ret.match(/{[^]*}/);
            if (json_str) {
                const parsedJson = JSON.parse(json_str[0]);
                
                for (const key in parsedJson) {
                    if (typeof parsedJson[key] === 'string') {
                        const value = parsedJson[key].trim().toLowerCase();
                        if (value === 'true') {
                            parsedJson[key] = true;
                        } else if (value === 'false') {
                            parsedJson[key] = false;
                        }
                    }
                }
                
                this.results = parsedJson;
                
                for (const feature of this.features.values()) {
                    if (feature.multiple && typeof this.results[feature.key] === 'string') {
                        this.results[feature.key] = this.results[feature.key].split(',').map((s: string) => s.trim());
                    }
                }
                
                this.extracted = true;
                return true;
            }
        } catch (error) {
            console.error("Parse error:", error);
            return false;
        }

        return false;
    }

    getFeature<T>(key: string): T | undefined {
        if (!this.extracted) {
            console.warn('Features have not been extracted yet. Call extract() first.');
            return undefined;
        }
        return this.results[key] as T;
    }

    getAllFeatures(): Record<string, any> {
        if (!this.extracted) {
            console.warn('Features have not been extracted yet. Call extract() first.');
            return {};
        }
        return {...this.results};
    }
}
