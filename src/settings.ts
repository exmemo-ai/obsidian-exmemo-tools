import { PluginSettingTab, Setting, App, TextAreaComponent } from 'obsidian';
import { getTags } from "./utils";
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
	selectExcludedFolders: string[];
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
	selectExcludedFolders: [],
}

export class ExMemoSettingTab extends PluginSettingTab {
	plugin;

	constructor(app: App, plugin: any) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let textComponent: TextAreaComponent;
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl).setName(t("llmSettings"))
			.setHeading().setClass('setting-heading-1');
		new Setting(containerEl)
			.setName(t("apiKey"))
			.addText(text => text
				.setPlaceholder('Enter your token')
				.setValue(this.plugin.settings.llmToken)
				.onChange(async (value) => {
					this.plugin.settings.llmToken = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName(t("baseUrl"))
			.addText(text => text
				.setPlaceholder('https://api.openai.com/v1')
				.setValue(this.plugin.settings.llmBaseUrl)
				.onChange(async (value) => {
					this.plugin.settings.llmBaseUrl = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName(t("modelName"))
			.addText(text => text
				.setPlaceholder('gpt-4o')
				.setValue(this.plugin.settings.llmModelName)
				.onChange(async (value) => {
					this.plugin.settings.llmModelName = value;
					await this.plugin.saveSettings();
				}));
		//
		new Setting(containerEl).setName(t("folderSelectionSetting"))
			.setDesc(t("folderSelectionSettingDesc"))
			.setHeading().setClass('setting-heading-1');
		new Setting(containerEl)
			.setName(t("excludedFolders"))
			.setDesc(t("excludedFoldersDesc"))
			.addTextArea((text) => {
				text.setValue(this.plugin.settings.selectExcludedFolders.join('\n'))
					.onChange(async (value) => {
						this.plugin.settings.selectExcludedFolders = value.split('\n').map(path => path.trim()).filter(path => path !== '');
						await this.plugin.saveSettings();
					});
				text.inputEl.setAttr('rows', '3');
				text.inputEl.addClass('setting-textarea');
			});
		//
		new Setting(containerEl).setName(t("llmAssistantSetting"))
			.setHeading().setClass('setting-heading-1');
		new Setting(containerEl).setName(t("llmAssistantDialogEdit"))
			.setDesc(t("llmAssistantDialogEditDesc"))
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.llmDialogEdit)
					.onChange(async (value) => {
						this.plugin.settings.llmDialogEdit = value;
						await this.plugin.saveSettings();
					});
			});
		new Setting(containerEl).setName(t("metaUpdateSetting"))
			.setHeading().setClass('setting-heading-1');
		new Setting(containerEl).setName(t('basics'))
			.setHeading().setClass('setting-heading-2');
		new Setting(containerEl)
			.setName(t("updateMetaOptions"))
			.setDesc(t("updateMetaOptionsDesc"))
			.setClass('item-setting-2')
			.addDropdown((dropdown) => {
				dropdown
					.addOption('force', t("updateForce"))
					.addOption('no-llm', t("updateNoLLM"))
					.setValue(this.plugin.settings.metaUpdateMethod)
					.onChange(async (value) => {
						this.plugin.settings.metaUpdateMethod = value;
						await this.plugin.saveSettings();
					});
			});

		const toggleCutSetting = new Setting(containerEl)
			.setName(t("truncateContent"))
			.setDesc(t("truncateContentDesc"))
			.setClass('item-setting-2')
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.metaIsTruncate)
					.onChange(async (value) => {
						this.plugin.settings.metaIsTruncate = value;
						await this.plugin.saveSettings();
						truncateSetting.setDisabled(!value);
						maxTokensSetting.setDisabled(!value);
					});
			});

		const maxTokensSetting = new Setting(containerEl)
			.setName(t("maxContentLength"))
			.setDesc(t("maxContentLengthDesc"))
			.setClass('item-setting-3')
			.addText((text) => {
				text.setValue(this.plugin.settings.metaMaxTokens.toString())
					.onChange(async (value) => {
						this.plugin.settings.metaMaxTokens = parseInt(value);
						await this.plugin.saveSettings();
					});
			});

		const truncateSetting = new Setting(containerEl)
			.setName(t("truncateMethod"))
			.setDesc(t("truncateMethodDesc"))
			.setClass('item-setting-3')
			.addDropdown((dropdown) => {
				dropdown
					.addOption('head_only', t("head_only"))
					.addOption('head_tail', t("head_tail"))
					.addOption('heading', t("heading"))
					.setValue(this.plugin.settings.metaTruncateMethod)
					.onChange(async (value) => {
						this.plugin.settings.metaTruncateMethod = value;
						await this.plugin.saveSettings();
					});
			});

		if (toggleCutSetting) {
			truncateSetting.setDisabled(!this.plugin.settings.metaIsTruncate);
			maxTokensSetting.setDisabled(!this.plugin.settings.metaIsTruncate);
		}

		new Setting(containerEl).setName(t("taggingOptions"))
			.setDesc(t("taggingOptionsDesc"))
			.setHeading().setClass('setting-heading-2');
		new Setting(containerEl)
			.setName(t("extractTags"))
			.setDesc(t("extractTagsDesc"))
			.setClass('item-setting-2')
			.addButton((btn) => {
				btn.setButtonText(t("extract"))
					.setCta()
					.onClick(async () => {
						const tags: Record<string, number> = await getTags(this.app);
						const sortedTags = Object.entries(tags).sort((a, b) => b[1] - a[1]);
						//const topTags = sortedTags.slice(0, 30).map(tag => tag[0]);
						const topTags = sortedTags.filter(([_, count]) => count > 2).map(([tag]) => tag);
						let currentTagList = this.plugin.settings.tags;
						for (const tag of topTags) {
							if (!currentTagList.includes(tag)) {
								currentTagList.push(tag);
							}
						}
						this.plugin.settings.tags = currentTagList;
						textComponent.setValue(this.plugin.settings.tags.join('\n'));
					});
			});
		new Setting(containerEl)
			.setName(t("tagList"))
			.setDesc(t("tagListDesc"))
			.setClass('item-setting-2')
			.addTextArea((text) => {
				textComponent = text;
				text.setValue(this.plugin.settings.tags.join('\n'))
					.onChange(async (value) => {
						this.plugin.settings.tags = value.split('\n').map(tag => tag.trim()).filter(tag => tag !== '');
						await this.plugin.saveSettings();
					});
				text.inputEl.setAttr('rows', '7');
				text.inputEl.addClass('setting-textarea');
			});
		new Setting(containerEl).setName(t("description"))
			.setDesc(t("descriptionDesc"))
			.setHeading().setClass('setting-heading-2');
		new Setting(containerEl)
			.setName(t("descriptionPrompt"))
			.setDesc(t("descriptionPromptDesc"))
			.setClass('item-setting-2')
			.addTextArea((text) => {
				text.setValue(this.plugin.settings.metaDescription)
					.onChange(async (value) => {
						this.plugin.settings.metaDescription = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.setAttr('rows', '3');
				text.inputEl.addClass('setting-textarea');
			});
		//
		new Setting(containerEl).setName(t('donate')).setHeading();
		new Setting(containerEl)
			.setName(t('supportThisPlugin'))
			.setDesc(t('supportThisPluginDesc'))
			.addButton((button) => {
				button.setButtonText(t('bugMeACoffee'))
					.setCta()
					.onClick(() => {
						window.open('https://buymeacoffee.com/xieyan0811y', '_blank');
					});
			});
	}
}