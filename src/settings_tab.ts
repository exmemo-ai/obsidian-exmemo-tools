import { PluginSettingTab, Setting, App, TextAreaComponent, Notice, Modal } from 'obsidian';
import { PromptModal } from './prompts';
import { loadTags, confirmDialog } from "./utils";
import { t } from "./lang/helpers";
import { testLlmConnection } from './llm_utils';
import { LLMResultMode } from "./settings";

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
		this.addAssistantSettings();
		this.addTruncateSettings();
		this.addFolderSettings();
		this.addMetadataSettings();
		this.addCardSettings();
		this.addIndexFileSettings();
		this.addImportExportSettings();
		this.addDonationSettings();
	}

	private addGeneralSettings(): void {
		const llmContainer = this.containerEl.createEl('div');
		const collapseEl = llmContainer.createEl('details', { cls: 'setting-item-collapse' });
		collapseEl.createEl('summary', { text: t("llmSettings") });
		const descEl = collapseEl.createEl('div', { cls: 'setting-item-description' });
		descEl.setText(t("llmSettingsDesc"));
		
		new Setting(collapseEl)
			.setName(t("apiKey"))
			.addText(text => text
				.setPlaceholder('Enter your token')
				.setValue(this.plugin.settings.llmToken ? '•'.repeat(Math.min(20, this.plugin.settings.llmToken.length)) : '')
				.onChange(async (value) => {
					if (!value.match(/^[•]+$/)) {
						this.plugin.settings.llmToken = value;
						await this.plugin.saveSettings();
					}
				}));
		new Setting(collapseEl)
			.setName(t("baseUrl"))
			.addText(text => text
				.setPlaceholder('https://api.openai.com/v1')
				.setValue(this.plugin.settings.llmBaseUrl)
				.onChange(async (value) => {
					this.plugin.settings.llmBaseUrl = value;
					await this.plugin.saveSettings();
				}));
		new Setting(collapseEl)
			.setName(t("modelName"))
			.addText(text => text
				.setPlaceholder('gpt-4o')
				.setValue(this.plugin.settings.llmModelName)
				.onChange(async (value) => {
					this.plugin.settings.llmModelName = value;
					await this.plugin.saveSettings();
					}));
		
		new Setting(collapseEl)
			.setName(t("testLlmConnection"))
			.setDesc(t("testLlmConnectionDesc"))
			.addButton((button) => {
				button
					.setButtonText(t("testConnection"))
					.setCta()
					.onClick(async () => {
						button.setButtonText(t("testing"));
						button.setDisabled(true);
						
						try {
							const result = await testLlmConnection(this.plugin.settings);
							if (result.success) {
								new Notice(t("connectionSuccess"));
							} else {
								new Notice(t("connectionFailed") + ": " + result.error, 5000);
							}
						} catch (error) {
							new Notice(t("connectionError") + ": " + error.message, 5000);
						} finally {
							button.setButtonText(t("testConnection"));
							button.setDisabled(false);
						}
					});
			});
	}

	private addAssistantSettings(): void {
		const llmContainer = this.containerEl.createEl('div');
		const collapseEl = llmContainer.createEl('details', { cls: 'setting-item-collapse' });
		collapseEl.createEl('summary', { text: t("llmAssistantSetting") });
		const descEl = collapseEl.createEl('div', { cls: 'setting-item-description' });
		descEl.setText(t("llmAssistantSettingDesc"));

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

		new Setting(collapseEl)
			.setName(t("resultMode"))
			.setDesc(t("resultModeDesc"))
			.addDropdown((dropdown) => {
				dropdown
					.addOption(LLMResultMode.UNKNOWN, t("askEachTime"))
					.addOption(LLMResultMode.APPEND, t("appendToSelection"))
					.addOption(LLMResultMode.PREPEND, t("prependToSelection"))
					.addOption(LLMResultMode.REPLACE, t("replaceSelection"))
					.setValue(this.plugin.settings.llmResultMode)
					.onChange(async (value) => {
						this.plugin.settings.llmResultMode = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(collapseEl)
			.setName(t("managePrompts"))
			.setDesc(t("managePromptsDesc"))
			.addButton(btn => btn
				.setButtonText(t("openPromptManager"))
				.setCta()
				.onClick(() => {
					new PromptModal(this.app, this.plugin).open();
				}));			
	}

	private addFolderSettings(): void {
		const llmContainer = this.containerEl.createEl('div');
		const collapseEl = llmContainer.createEl('details', { cls: 'setting-item-collapse' });
		collapseEl.createEl('summary', { text: t("folderSelectionSetting") });
		const descEl = collapseEl.createEl('div', { cls: 'setting-item-description' });
		descEl.setText(t("folderSelectionSettingDesc"));

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

	private addTruncateSettings(): void {
		const container = this.containerEl.createEl('div');
		const truncateCollapseEl = container.createEl('details', {
			cls: 'setting-item-collapse'
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
	}

	private addMetadataSettings(): void {
		// 元数据设置部分
		const llmContainer = this.containerEl.createEl('div');
		const collapseEl = llmContainer.createEl('details', { 
			cls: 'setting-item-collapse',
			attr: { id: 'meta-settings-collapse' }
		});
		collapseEl.createEl('summary', { text: t("metaSetting") });
		const descEl = collapseEl.createEl('div', { cls: 'setting-item-description' });
		descEl.setText(t("metaSettingDesc"));

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
						const tags: Record<string, number> = await loadTags(this.app, this.plugin.settings);
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

		// 封面图设置部分
		const coverCollapseEl = collapseEl.createEl('details', {
			cls: 'setting-item-collapse nested-settings'
		});
		coverCollapseEl.createEl('summary', { text: t("coverImage") });

		new Setting(coverCollapseEl)
			.setName(t('enableCover'))
			.setDesc(t('enableCoverDesc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.metaCoverEnabled)
				.onChange(async (value) => {
					this.plugin.settings.metaCoverEnabled = value;
					await this.plugin.saveSettings();
				}));

		new Setting(coverCollapseEl)
			.setName(t('coverFieldName'))
			.setDesc(t('coverFieldNameDesc'))
			.addText(text => text
				.setValue(this.plugin.settings.metaCoverFieldName)
				.onChange(async (value) => {
					this.plugin.settings.metaCoverFieldName = value || 'cover';
					await this.plugin.saveSettings();
				}));

		new Setting(coverCollapseEl)
			.setName(t('coverUrl'))
			.setDesc(t('coverUrlDesc'))
			.addText(text => text
				.setValue(this.plugin.settings.metaCoverUrl)
				.onChange(async (value) => {
					this.plugin.settings.metaCoverUrl = value;
					await this.plugin.saveSettings();
				}));

		new Setting(coverCollapseEl)
			.setName(t('useFirstImage'))
			.setDesc(t('useFirstImageDesc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.metaCoverUseFirst)
				.onChange(async (value) => {
					this.plugin.settings.metaCoverUseFirst = value;
					await this.plugin.saveSettings();
				}));


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
			cls: 'setting-item-collapse nested-settings',
			attr: { id: 'custom-meta-collapse' }
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
						value: '',
						type: 'static'
					});
					await this.plugin.saveSettings();
					this.refresh();
				}));

		interface CustomMetadata {
			key: string;
			value: string;
			type?: string;
		}

		this.plugin.settings.customMetadata.forEach((meta: CustomMetadata, index: number) => {
			const settingContainer = new Setting(customMetaCollapseEl);
			
			settingContainer.addText(text => text
				.setPlaceholder(t('fieldKey'))
				.setValue(meta.key)
				.onChange(async (value) => {
					this.plugin.settings.customMetadata[index].key = value;
					await this.plugin.saveSettings();
				}));
			
				settingContainer.addDropdown(dropdown => dropdown
					.addOption('static', t('staticValue'))
					.addOption('prompt', t('promptValue'))
					.setValue(meta.type || 'static')
					.onChange(async (value) => {
						this.plugin.settings.customMetadata[index].type = value;
						await this.plugin.saveSettings();
					}));
				
				settingContainer.addText(text => text
					.setPlaceholder(meta.type === 'prompt' ? t('fieldPrompt') : t('fieldValue'))
					.setValue(meta.value)
					.onChange(async (value) => {
						this.plugin.settings.customMetadata[index].value = value;
						await this.plugin.saveSettings();
						//this.refresh();
					}));
				
				settingContainer.addButton(button => button
					.setIcon('trash')
					.onClick(async () => {
						this.plugin.settings.customMetadata.splice(index, 1);
						await this.plugin.saveSettings();
						this.refresh();
					}));
			});
	}

	private addCardSettings(): void {
		const cardContainer = this.containerEl.createEl('div');
		const zettelkastenCollapseEl = cardContainer.createEl('details', { cls: 'setting-item-collapse' });
		zettelkastenCollapseEl.createEl('summary', { text: t("zettelkastenOptions") || "zettelkastenOptions" });
		
		new Setting(zettelkastenCollapseEl)
			.setName(t('zettelkastenPosition'))
			.setDesc(t('zettelkastenPositionDesc'))
			.addDropdown(dropdown => dropdown
				.addOption('top', t('documentTop'))
				.addOption('bottom', t('documentBottom'))
				.setValue(this.plugin.settings.zettelkastenPosition || 'bottom')
				.onChange(async (value) => {
					if (!this.plugin.settings.hasOwnProperty('zettelkastenPosition')) {
						this.plugin.settings.zettelkastenPosition = 'bottom';
					}
					this.plugin.settings.zettelkastenPosition = value;
					await this.plugin.saveSettings();
				}));

		new Setting(zettelkastenCollapseEl)
			.setName(t('zettelkastenPrompt'))
			.setDesc(t('zettelkastenPromptDesc'))
			.addTextArea(text => {
				text.setPlaceholder(t('defaultZettelkastenPrompt'))
					.setValue(this.plugin.settings.zettelkastenPrompt)
					.onChange(async (value) => {
						if (!this.plugin.settings.hasOwnProperty('zettelkastenPrompt')) {
							this.plugin.settings.zettelkastenPrompt = "";
						}
						this.plugin.settings.zettelkastenPrompt = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.setAttr('rows', '5');
				text.inputEl.addClass('setting-textarea');
			});

			new Setting(zettelkastenCollapseEl)
			.setName(t('insertCardsAt'))
			.setDesc(t('insertCardsAtDesc'))
			.addDropdown(dropdown => dropdown
				.addOption('before', t('beforeContent'))
				.addOption('after', t('afterContent'))
				.setValue(this.plugin.settings.insertCardsAt)
				.onChange(async (value) => {
					this.plugin.settings.insertCardsAt = value as 'before' | 'after';
					await this.plugin.saveSettings();
				}));
		
		new Setting(zettelkastenCollapseEl)
			.setName(t('regenerateExistingCards'))
			.setDesc(t('regenerateExistingCardsDesc'))
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.regenerateExistingCards)
				.onChange(async (value) => {
					this.plugin.settings.regenerateExistingCards = value;
					await this.plugin.saveSettings();
				}));
	}

	private refresh(): void {
		// 记住所有折叠面板的展开状态
		const newMetaDetails = document.getElementById('meta-settings-collapse') as HTMLDetailsElement;
		const newCustomMetaDetails = document.getElementById('custom-meta-collapse') as HTMLDetailsElement;
		const metaDetailsOpen = newMetaDetails?.open;
		const customMetaDetailsOpen = newCustomMetaDetails?.open;
		
		this.display();
		
		// 使用ID恢复折叠面板的状态
		requestAnimationFrame(() => {
			const newMetaDetails = document.getElementById('meta-settings-collapse') as HTMLDetailsElement;
			const newCustomMetaDetails = document.getElementById('custom-meta-collapse') as HTMLDetailsElement;
			
			if (metaDetailsOpen && newMetaDetails) {
				newMetaDetails.open = true;
			}
			if (customMetaDetailsOpen && newCustomMetaDetails) {
				newCustomMetaDetails.open = true;
			}
		});
	}

	private addIndexFileSettings(): void {
		const llmContainer = this.containerEl.createEl('div');
		const collapseEl = llmContainer.createEl('details', { cls: 'setting-item-collapse' });
		collapseEl.createEl('summary', { text: t("indexFileSetting") });
		const descEl = collapseEl.createEl('div', { cls: 'setting-item-description' });
		descEl.setText(t("indexFileSettingDesc"));

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
			.setName(t("indexExcludeFile"))
			.setDesc(t("indexExcludeFileDesc"))
			.addText(text => text
				.setPlaceholder('xxx.md, *_yyy.md default is null')
				.setValue(this.plugin.settings.indexExcludeFile)
				.onChange(async (value) => {
					this.plugin.settings.indexExcludeFile = value;
					await this.plugin.saveSettings();
				}));

		new Setting(collapseEl)
			.setName(t("indexExcludeDir"))
			.setDesc(t("indexExcludeDirDesc"))
			.addText(text => text
				.setPlaceholder('xxx, *_yyy default is null')
				.setValue(this.plugin.settings.indexExcludeDir)
				.onChange(async (value) => {
					this.plugin.settings.indexExcludeDir = value;
					await this.plugin.saveSettings();
				}));

		new Setting(collapseEl)
			.setName(t('indexFileDirectory'))
			.setDesc(t('indexFileDirectoryDesc'))
			.addText(text => text
				.setPlaceholder('')
				.setValue(this.plugin.settings.indexFileDirectory)
				.onChange(async (value) => {
					this.plugin.settings.indexFileDirectory = value;
					await this.plugin.saveSettings();
				}));
	}

	private addImportExportSettings(): void {
		const importExportContainer = this.containerEl.createEl('div');
		const collapseEl = importExportContainer.createEl('details', { cls: 'setting-item-collapse' });
		collapseEl.createEl('summary', { text: t("importExportSettings") });
		const descEl = collapseEl.createEl('div', { cls: 'setting-item-description' });
		descEl.setText(t("importExportSettingsDesc"));

		new Setting(collapseEl)
			.setName(t("exportSettings"))
			.setDesc(t("exportSettingsDesc"))
			.addButton((button) => {
				button.setButtonText(t("export"))
					.setCta()
					.onClick(() => {
						const settingsJson = JSON.stringify(this.plugin.settings, null, 2);
						const blob = new Blob([settingsJson], { type: "application/json" });
						const url = URL.createObjectURL(blob);
						
						const a = document.createElement("a");
						a.href = url;
						a.download = `exmemo_tools_settings_${new Date().toISOString().split('T')[0]}.json`;
						document.body.appendChild(a);
						a.click();
						
						setTimeout(() => {
							document.body.removeChild(a);
							URL.revokeObjectURL(url);
						}, 0);
						
						new Notice(t("settingsExported"));
					});
			});

		new Setting(collapseEl)
			.setName(t("importSettings"))
			.setDesc(t("importSettingsDesc"))
			.addButton((button) => {
				button.setButtonText(t("import"))
					.onClick(() => {
						const fileInput = document.createElement("input");
						fileInput.type = "file";
						fileInput.accept = "application/json";
						
						fileInput.addEventListener("change", (e) => {
							const target = e.target as HTMLInputElement;
							const file = target.files?.[0];
							
							if (file) {
								const reader = new FileReader();
								reader.onload = async (e) => {
									try {
										const settingsJson = e.target?.result as string;
										const settingsObj = JSON.parse(settingsJson);										
										const confirm = await confirmDialog(this.app, t("importSettingsWarning"))
										if (confirm) {
											this.plugin.settings = Object.assign({}, this.plugin.settings, settingsObj);
											await this.plugin.saveSettings();
											this.display();
											new Notice(t("settingsImported"));
										}										
									} catch (error) {
										console.error(error);
										new Notice(t("invalidSettingsFile"));
									}
								};
								reader.readAsText(file);
							}
						});
						
						fileInput.click();
					});
			});
	}

	private addDonationSettings(): void {
		// 捐赠部分
		const llmContainer = this.containerEl.createEl('div');
		const collapseEl = llmContainer.createEl('details', { cls: 'setting-item-collapse' });
		collapseEl.createEl('summary', { text: t("donate") });
		const descEl = collapseEl.createEl('div', { cls: 'setting-item-description' });
		descEl.setText(t("donateDesc"));

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