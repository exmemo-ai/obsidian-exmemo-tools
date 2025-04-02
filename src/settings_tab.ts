import { PluginSettingTab, Setting, App, TextAreaComponent } from 'obsidian';
import { loadTags } from "./utils";
import { t } from "./lang/helpers";

export class ExMemoSettingTab extends PluginSettingTab {
	plugin;

	constructor(app: App, plugin: any) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		this.addGeneralSettings();
		this.addLLMSettings();
		this.addFolderSettings();
		this.addMetadataSettings();
		this.addIndexFileSettings();
		this.addDonationSettings();
	}

	private addGeneralSettings(): void {
		// LLM 设置部分
		new Setting(this.containerEl).setName(t("llmSettings"))
			.setHeading();
		new Setting(this.containerEl)
			.setName(t("apiKey"))
			.addText(text => text
				.setPlaceholder('Enter your token')
				.setValue(this.plugin.settings.llmToken)
				.onChange(async (value) => {
					this.plugin.settings.llmToken = value;
					await this.plugin.saveSettings();
				}));
		new Setting(this.containerEl)
			.setName(t("baseUrl"))
			.addText(text => text
				.setPlaceholder('https://api.openai.com/v1')
				.setValue(this.plugin.settings.llmBaseUrl)
				.onChange(async (value) => {
					this.plugin.settings.llmBaseUrl = value;
					await this.plugin.saveSettings();
				}));
		new Setting(this.containerEl)
			.setName(t("modelName"))
			.addText(text => text
				.setPlaceholder('gpt-4o')
				.setValue(this.plugin.settings.llmModelName)
				.onChange(async (value) => {
					this.plugin.settings.llmModelName = value;
					await this.plugin.saveSettings();
				}));
	}

	private addLLMSettings(): void {
		const llmContainer = this.containerEl.createEl('div');
		const collapseEl = llmContainer.createEl('details', { cls: 'setting-item-collapse' });
		collapseEl.createEl('summary', { text: t("llmAssistantSetting") });

		new Setting(collapseEl)
			.setName(t("llmAssistantDialogEdit"))
			.setDesc(t("llmAssistantDialogEditDesc"))
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.llmDialogEdit)
					.onChange(async (value) => {
						this.plugin.settings.llmDialogEdit = value;
						await this.plugin.saveSettings();
					});
			});
	}

	private addFolderSettings(): void {
		const llmContainer = this.containerEl.createEl('div');
		const collapseEl = llmContainer.createEl('details', { cls: 'setting-item-collapse' });
		collapseEl.createEl('summary', { text: t("folderSelectionSetting") });

		new Setting(collapseEl)
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
	}

	private addMetadataSettings(): void {
		// 元数据设置部分
		const llmContainer = this.containerEl.createEl('div');
		const collapseEl = llmContainer.createEl('details', { cls: 'setting-item-collapse' });
		collapseEl.createEl('summary', { text: t("metaSetting") });

		// update meta settings
		new Setting(collapseEl)
			.setName(t("metaUpdateSetting"))
			.setDesc(t("updateMetaOptionsDesc"))
			.setClass("setting-item-indent1")
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

		// 创建截断设置的折叠面板
		const truncateCollapseEl = collapseEl.createEl('details', {
			cls: 'setting-item-collapse nested-settings'
		});
		truncateCollapseEl.createEl('summary', { text: t("truncateSettings") });

		new Setting(truncateCollapseEl)
			.setName(t("truncateContent"))
			.setDesc(t("truncateContentDesc"))
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.metaIsTruncate)
					.onChange(async (value) => {
						this.plugin.settings.metaIsTruncate = value;
						await this.plugin.saveSettings();
						truncateContainer.style.display = value ? 'block' : 'none';
					});
			});

		const truncateContainer = truncateCollapseEl.createEl('div', {
			cls: 'setting-item-indent2'
		});

		new Setting(truncateContainer)
			.setName(t("maxContentLength"))
			.setDesc(t("maxContentLengthDesc"))
			.addText((text) => {
				text.setValue(this.plugin.settings.metaMaxTokens.toString())
					.onChange(async (value) => {
						this.plugin.settings.metaMaxTokens = parseInt(value);
						await this.plugin.saveSettings();
					});
			});

		new Setting(truncateContainer)
			.setName(t("truncateMethod"))
			.setDesc(t("truncateMethodDesc"))
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

		// 初始化显示状态
		truncateContainer.style.display = this.plugin.settings.metaIsTruncate ? 'block' : 'none';

		// 描述设置部分
		const descCollapseEl = collapseEl.createEl('details', {
			cls: 'setting-item-collapse nested-settings'
		});
		descCollapseEl.createEl('summary', { text: t("description") });

		// 添加描述字段名设置
		new Setting(descCollapseEl)
			.setName(t('descriptionFieldName'))
			.setDesc(t('descriptionFieldNameDesc'))
			.addText(text => text
				.setValue(this.plugin.settings.metaDescriptionFieldName)
				.onChange(async (value) => {
					this.plugin.settings.metaDescriptionFieldName = value || 'description';
					await this.plugin.saveSettings();
				}));

		new Setting(descCollapseEl)
			.setName(t("descriptionPrompt"))
			.setDesc(t("descriptionPromptDesc"))
			.addTextArea((text) => {
				text.setValue(this.plugin.settings.metaDescription)
					.onChange(async (value) => {
						this.plugin.settings.metaDescription = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.setAttr('rows', '3');
				text.inputEl.addClass('setting-textarea');
			});


		// 标签设置部分
		const tagsCollapseEl = collapseEl.createEl('details', {
			cls: 'setting-item-collapse nested-settings'
		});
		tagsCollapseEl.createEl('summary', { text: t("taggingOptions") });
		let textComponent: TextAreaComponent;

		// 添加标签字段名设置
		new Setting(tagsCollapseEl)
			.setName(t('tagsFieldName'))
			.setDesc(t('tagsFieldNameDesc'))
			.addText(text => text
				.setValue(this.plugin.settings.metaTagsFieldName)
				.onChange(async (value) => {
					this.plugin.settings.metaTagsFieldName = value || 'tags';
					await this.plugin.saveSettings();
				}));

		new Setting(tagsCollapseEl)
			.setName(t("extractTags"))
			.setDesc(t("extractTagsDesc"))
			.addButton((btn) => {
				btn.setButtonText(t("extract"))
					.setCta()
					.onClick(async () => {
						const tags: Record<string, number> = await loadTags(this.app);
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
		new Setting(tagsCollapseEl)
			.setName(t("tagList"))
			.setDesc(t("tagListDesc"))
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

		// 添加标签提示词设置
		new Setting(tagsCollapseEl)
			.setName(t('metaTagsPrompt'))
			.setDesc(t('metaTagsPromptDesc'))
			.addTextArea(text => {
				text.setPlaceholder(this.plugin.settings.metaTagsPrompt)
					.setValue(this.plugin.settings.metaTagsPrompt)
					.onChange(async (value) => {
						this.plugin.settings.metaTagsPrompt = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.setAttr('rows', '3');
				text.inputEl.addClass('setting-textarea');
			});



		// 类别设置部分
		const categoryCollapseEl = collapseEl.createEl('details', {
			cls: 'setting-item-collapse nested-settings'
		});
		categoryCollapseEl.createEl('summary', { text: t("categoryOptions") });

		new Setting(categoryCollapseEl)
			.setName(t('enableCategory'))
			.setDesc(t('enableCategoryDesc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.metaCategoryEnabled)
				.onChange(async (value) => {
					this.plugin.settings.metaCategoryEnabled = value;
					await this.plugin.saveSettings();
				}));

		// 添加类别字段名设置
		new Setting(categoryCollapseEl)
			.setName(t('categoryFieldName'))
			.setDesc(t('categoryFieldNameDesc'))
			.addText(text => text
				.setValue(this.plugin.settings.metaCategoryFieldName)
				.onChange(async (value) => {
					this.plugin.settings.metaCategoryFieldName = value || 'category';
					await this.plugin.saveSettings();
				}));

		new Setting(categoryCollapseEl)
			.setName(t("categoryList"))
			.setDesc(t("categoryListDesc"))
			.addTextArea((text) => {
				text.setValue(this.plugin.settings.categories.join('\n'))
					.onChange(async (value) => {
						this.plugin.settings.categories = value.split('\n').map(cat => cat.trim()).filter(cat => cat !== '');
						await this.plugin.saveSettings();
					});
				text.inputEl.setAttr('rows', '5');
				text.inputEl.addClass('setting-textarea');
			});

		// 添加类别提示词设置
		new Setting(categoryCollapseEl)
			.setName(t('metaCategoryPrompt'))
			.setDesc(t('metaCategoryPromptDesc'))
			.addTextArea(text => {
				text.setPlaceholder(this.plugin.settings.metaCategoryPrompt)
					.setValue(this.plugin.settings.metaCategoryPrompt)
					.onChange(async (value) => {
						this.plugin.settings.metaCategoryPrompt = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.setAttr('rows', '3');
				text.inputEl.addClass('setting-textarea');
			});

		// 新增标题设置部分
		const titleCollapseEl = collapseEl.createEl('details', {
			cls: 'setting-item-collapse nested-settings'
		});
		titleCollapseEl.createEl('summary', { text: t("title") });

		new Setting(titleCollapseEl)
			.setName(t("enableTitle"))
			.setDesc(t("enableTitleDesc"))
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.metaTitleEnabled)
					.onChange(async (value) => {
						this.plugin.settings.metaTitleEnabled = value;
						await this.plugin.saveSettings();
						titlePromptSetting.setDisabled(!value);
					});
			});

		// 添加标题字段名设置
		new Setting(titleCollapseEl)
			.setName(t('titleFieldName'))
			.setDesc(t('titleFieldNameDesc'))
			.addText(text => text
				.setValue(this.plugin.settings.metaTitleFieldName)
				.onChange(async (value) => {
					this.plugin.settings.metaTitleFieldName = value || 'title';
					await this.plugin.saveSettings();
				}));

		const titlePromptSetting = new Setting(titleCollapseEl)
			.setName(t("titlePrompt"))
			.setDesc(t("titlePromptDesc"))
			.addTextArea((text) => {
				text.setValue(this.plugin.settings.metaTitlePrompt)
					.onChange(async (value) => {
						this.plugin.settings.metaTitlePrompt = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.setAttr('rows', '3');
				text.inputEl.addClass('setting-textarea');
			});

		titlePromptSetting.setDisabled(!this.plugin.settings.metaTitleEnabled);

		// 新增编辑时间设置部分
		const timeCollapseEl = collapseEl.createEl('details', {
			cls: 'setting-item-collapse nested-settings'
		});
		timeCollapseEl.createEl('summary', { text: t("editTime") });

		new Setting(timeCollapseEl)
			.setName(t("enableEditTime"))
			.setDesc(t("enableEditTimeDesc"))
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.metaEditTimeEnabled)
					.onChange(async (value) => {
						this.plugin.settings.metaEditTimeEnabled = value;
						await this.plugin.saveSettings();
						editTimeFormatSetting.setDisabled(!value);
					});
			});

		// 添加更新时间字段名设置
		new Setting(timeCollapseEl)
			.setName(t('updateTimeFieldName'))
			.setDesc(t('updateTimeFieldNameDesc'))
			.addText(text => text
				.setValue(this.plugin.settings.metaUpdatedFieldName)
				.onChange(async (value) => {
					this.plugin.settings.metaUpdatedFieldName = value || 'updated';
					await this.plugin.saveSettings();
				}));

		// 添加创建时间字段名设置
		new Setting(timeCollapseEl)
			.setName(t('createTimeFieldName'))
			.setDesc(t('createTimeFieldNameDesc'))
			.addText(text => text
				.setValue(this.plugin.settings.metaCreatedFieldName)
				.onChange(async (value) => {
					this.plugin.settings.metaCreatedFieldName = value || 'created';
					await this.plugin.saveSettings();
				}));

		const editTimeFormatSetting = new Setting(timeCollapseEl)
			.setName(t("editTimeFormat"))
			.setDesc(t("editTimeFormatDesc"))
			.addText((text) => {
				text.setValue(this.plugin.settings.metaEditTimeFormat)
					.setPlaceholder('YYYY-MM-DD HH:mm:ss')
					.onChange(async (value) => {
						this.plugin.settings.metaEditTimeFormat = value;
						await this.plugin.saveSettings();
					});
			});

		editTimeFormatSetting.setDisabled(!this.plugin.settings.metaEditTimeEnabled);

		// 添加自定义元数据设置
		const customMetaCollapseEl = collapseEl.createEl('details', {
			cls: 'setting-item-collapse nested-settings'
		});
		customMetaCollapseEl.createEl('summary', { text: t("customMetadata") });

		new Setting(customMetaCollapseEl)
			.setName(t('metaSetting'))
			.setDesc(t('customMetadataDesc'))
			.setHeading()
			.addButton(button => button
				.setButtonText(t('addField'))
				.onClick(async () => {
					this.plugin.settings.customMetadata.push({
						key: '',
						value: ''
					});
					await this.plugin.saveSettings();
					this.display();
				}));

		interface CustomMetadata {
			key: string;
			value: string;
		}

		this.plugin.settings.customMetadata.forEach((meta: CustomMetadata, index: number) => {
			new Setting(customMetaCollapseEl)
				.addText(text => text
					.setPlaceholder(t('fieldKey'))
					.setValue(meta.key)
					.onChange(async (value) => {
						this.plugin.settings.customMetadata[index].key = value;
						await this.plugin.saveSettings();
					}))
				.addText(text => text
					.setPlaceholder(t('fieldValue'))
					.setValue(meta.value)
					.onChange(async (value) => {
						this.plugin.settings.customMetadata[index].value = value;
						await this.plugin.saveSettings();
					}))
				.addButton(button => button
					.setIcon('trash')
					.onClick(async () => {
						this.plugin.settings.customMetadata.splice(index, 1);
						await this.plugin.saveSettings();
						this.display();
					}));
		});
	}

	private addIndexFileSettings(): void {
		const llmContainer = this.containerEl.createEl('div');
		const collapseEl = llmContainer.createEl('details', { cls: 'setting-item-collapse' });
		collapseEl.createEl('summary', { text: t("indexFileSetting") });

		new Setting(collapseEl)
			.setName(t("defaultIndexString"))
			.setDesc(t("defaultIndexStringDesc"))
			.addText(text => text
				.setPlaceholder('index_')
				.setValue(this.plugin.settings.defaultIndexString)
				.onChange(async (value) => {
					this.plugin.settings.defaultIndexString = value;
					await this.plugin.saveSettings();
				}));

		new Setting(collapseEl)
			.setName(t("indexExclude"))
			.setDesc(t("indexExcludeDesc"))
			.addText(text => text
				.setPlaceholder('dir1, *_xxx.md default is null')
				.setValue(this.plugin.settings.indexExclude)
				.onChange(async (value) => {
					this.plugin.settings.indexExclude = value;
					await this.plugin.saveSettings();
				}));

	}

	private addDonationSettings(): void {
		// 捐赠部分
		const llmContainer = this.containerEl.createEl('div');
		const collapseEl = llmContainer.createEl('details', { cls: 'setting-item-collapse' });
		collapseEl.createEl('summary', { text: t("donate") });

		new Setting(collapseEl)
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