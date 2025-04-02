import { t } from "./lang/helpers";

export interface ExMemoSettings {
	llmToken: string;
	llmBaseUrl: string;
	llmModelName: string;
	llmPrompts: Record<string, { count: number, lastAccess: number }>;
	llmDialogEdit: boolean
	tags: string[];
	metaIsTruncate: boolean;
	metaMaxTokens: number;
	metaTruncateMethod: string;
	metaUpdateMethod: string;
	metaDescription: string;
	metaTitleEnabled: boolean;
	metaTitlePrompt: string;
	metaEditTimeEnabled: boolean;
	metaEditTimeFormat: string;
	selectExcludedFolders: string[];
	metaTagsFieldName: string;
	metaDescriptionFieldName: string;
	metaTitleFieldName: string;
	metaUpdatedFieldName: string;
	metaCreatedFieldName: string;
	metaTagsPrompt: string;
	customMetadata: Array<{key: string, value: string}>;
	metaCategoryFieldName: string;
	categories: string[];
	metaCategoryPrompt: string;
	metaCategoryEnabled: boolean;
	defaultIndexString: string;
	indexExclude: string;
}

export const DEFAULT_SETTINGS: ExMemoSettings = {
	llmToken: 'sk-',
	llmBaseUrl: 'https://api.openai.com/v1',
	llmModelName: 'gpt-4o',
	llmPrompts: {},
	llmDialogEdit: false,
	tags: [],
	metaIsTruncate: true,
	metaMaxTokens: 1000,
	metaTruncateMethod: 'head_only',
	metaUpdateMethod: 'no-llm',
	metaDescription: t('defaultSummaryPrompt'),
	metaTitleEnabled: true,
	metaTitlePrompt: t('defaultTitlePrompt'),
	metaEditTimeEnabled: true,
	metaEditTimeFormat: 'YYYY-MM-DD HH:mm:ss',
	selectExcludedFolders: [],
	metaTagsFieldName: 'tags',
	metaDescriptionFieldName: 'description',
	metaTitleFieldName: 'title',
	metaUpdatedFieldName: 'updated',
	metaCreatedFieldName: 'created',
	metaTagsPrompt: t('defaultTagsPrompt'),
	customMetadata: [],
	metaCategoryFieldName: 'category',
	categories: JSON.parse(t('defaultCategories')),
	metaCategoryPrompt: t('defaultCategoryPrompt'),
	metaCategoryEnabled: true,
	defaultIndexString: 'index_',
	indexExclude: ''
}