// English

export default {
  // Basic translations
  "confirm": "Confirm",
  "yes": "Yes",
  "no": "No",
  "llmLoading": "LLM is thinking...",
  "noResult": "LLM no result",
  "pleaseOpenFile": "Please open a file first",
  "llmError": "An error occurred, please try again later",
  "inputPrompt": "Please enter the prompt",
  "chatButton": "Chat",
  "pleaseSelectText": "Please select the text to be processed first",
  "currentFileNotMarkdown": "The current file is not a markdown file",
  "fileAlreadyContainsTagsAndDescription": "The file already contains tags and description",
  "parseError": "Failed to parse the returned result",
  "metaUpdated": "Meta data updated",

  // LLM Settings
  "llmSettings": "LLM",
  "apiKey": "API key",
  "baseUrl": "Base URL",
  "modelName": "Model name",

  // Meta Update Settings
  "metaSetting": "Meta",
  "metaSettingDesc": "Automatically generate file metadata",
  "metaUpdateSetting": "Update meta",
  "updateMetaOptions": "Update",
  "updateMetaOptionsDesc": "If meta already exists, choose whether to regenerate",
  "updateForce": "Force update existing items",
  "updateNoLLM": "Only update items that do not use LLM",

  // Content Truncation Settings
  "truncateSettings": "Content truncation",
  "truncateContent": "Truncate long content?",
  "truncateContentDesc": "When using LLM, whether to truncate if the content exceeds the maximum word count",
  "maxContentLength": "Max content length after truncation",
  "maxContentLengthDesc": "Set the maximum token limit for the content",
  "truncateMethod": "Truncation method",
  "truncateMethodDesc": "Choose how to handle content that exceeds the limit",
  "head_only": "Extract only the beginning",
  "head_tail": "Extract the beginning and the end",
  "heading": "Extract the heading and the text below it",

  // Tag Settings
  "taggingOptions": "Tags",
  "taggingOptionsDesc": "Automatically generating tags",
  "extractTags": "Extract tags",
  "extractTagsDesc": "Extract tags that appear more than twice from all notes and fill them in the candidate box",
  "extract": "Extract",
  "tagList": "Tag list",
  "tagListDesc": "Optional tag list, separated by line breaks",
  "metaTagsPrompt": "Tags Generation Prompt",  
  "metaTagsPromptDesc": "The prompt for generating tags, where you can set the language, capitalization, etc.",
  "defaultTagsPrompt": "Please extract up to three tags based on the following article content, and in the same language as the content.",
  "tagsFieldName": "Tags field name",
  "tagsFieldNameDesc": "Field name used for automatically generating tags (default: tags)",
  "simplifyTagsConfirm": "The current tag list contains {count} tokens, do you want to use AI to simplify it?",
  "simplifyTagsPrompt": "Please simplify the following tag list to {count} or fewer most important tags, keep the original format with one tag per line:",

  // Description Settings
  "description": "Description",
  "descriptionPrompt": "Prompt",
  "descriptionPromptDesc": "Prompt for generating descriptions",
  "defaultSummaryPrompt": "Summarize the core content of the article directly without using phrases like 'this article.' The summary should be no more than 50 words, and in the same language as the content.",
  "descriptionFieldName": "Description field name",
  "descriptionFieldNameDesc": "Field name used for automatically generating descriptions (default: description)",

  // Title Settings
  "title": "Title",
  "enableTitle": "Enable auto title generation",
  "enableTitleDesc": "Enable to automatically generate document titles",
  "titlePrompt": "Title prompt",
  "titlePromptDesc": "Prompt for generating titles",
  "defaultTitlePrompt": "Please generate a concise and clear title for this document, no more than 10 words, and do not use quotes.",
  "titleFieldName": "Title field name",
  "titleFieldNameDesc": "Field name used for automatically generating titles (default: title)",

  // Edit Time Settings
  "editTime": "Edit time",
  "enableEditTime": "Enable auto update edit time",
  "enableEditTimeDesc": "Enable to automatically update the edit time of the document",
  "editTimeFormat": "Edit time format",
  "editTimeFormatDesc": "Set the format of the edit time",
  "updateTimeFieldName": "Update time field name",
  "updateTimeFieldNameDesc": "Field name used for automatically updating the update time (default: updated)",
  "createTimeFieldName": "Create time field name",
  "createTimeFieldNameDesc": "Field name used for automatically updating the create time (default: created)",

  // Custom Metadata
  "customMetadata": "Custom metadata",
  "customMetadataDesc": "Add custom metadata fields, e.g.: author=Author Name",
  "addField": "Add field",
  "fieldKey": "Field name",
  "fieldValue": "Field value",

  // Category Settings
  "categoryOptions": "Category",
  "enableCategory": "Enable auto category",
  "enableCategoryDesc": "Enable to automatically select category for documents",
  "categoryFieldName": "Category field name",
  "categoryFieldNameDesc": "Field name used for automatically generating category (default: category)",
  "categoryList": "Category list",
  "categoryListDesc": "Optional category list, separated by line breaks",
  "metaCategoryPrompt": "Category prompt",
  "metaCategoryPromptDesc": "Prompt for generating category",
  "defaultCategoryPrompt": "Please select a suitable category for this document",
  "categoryUnknown": "Unknown",
  "defaultCategories": "[\"Travel\", \"Shopping\", \"Mood\", \"Book Review\", \"Tech & Knowledge\", \"Entertainment\", \"Papers to Read\", \"Ideas & Inspiration\", \"Todo\", \"Methodology\", \"Work Thoughts\", \"Investment\", \"Books to Read\", \"Personal Info\", \"Accounting\", \"Tasks\", \"Health\", \"Excerpts\", \"Daily Life\", \"Worldview\", \"Food\"]",

  // Donation Related
  "donate": "Donate",
  "donateDesc": "Thank you for your support",
  "supportThisPlugin": "Support this plugin",
  "supportThisPluginDesc": "If you find this plugin helpful, consider buying me a coffee!",
  "bugMeACoffee": "Buy me a coffee",

  // Commands
  "exmemoAdjustMeta": "Generate meta data",
  "exmemoSelectFolder": "Select a suitable folder for the current file",
  "exmemoInsertMd": "Insert the selected text into the best position",
  "exmemoLLMAssistant": "AI Editor",
  'exmemoGenerateNext': 'Generate next sentence',

  // LLM Assistant Settings
  "llmAssistantSetting": "AI Editor",
  "llmAssistantSettingDesc": "Supports LLM dialogue, content editing, and continuation",
  "llmAssistantDialogEdit": "Is the prompt editable?",
  "llmAssistantDialogEditDesc": "Whether to allow editing of previously saved prompts. If allowed, please trigger the dialog through the button",

  // file migrations
  "allFolders": "All folders",
  "noFolders": "No folders found",
  "tooManyFolders_1": " has ",
  "tooManyFolders_2": " subdirs, which is quite a lot. Continue?",
  "searchDesc": "Filter folders by keyword",
  "pleaseSelectFolder": "Please select a folder to start migrating",
  "folderNotFound": "Folder not found: ",
  "migrationSuccess": "Migration successful",

  // File migration settings
  "folderSelectionSetting": "Folder selection",
  "folderSelectionSettingDesc": "Select a suitable folder for the current file and migrate it. The selected folder will be used as the target folder for the current file.",
  "excludedFolders": "Excluded folders",
  "excludedFoldersDesc": "Select a suitable folder for the current file and migrate it. List the excluded target folders, separated by line breaks",

  // Edit md file
  "insertContent": "Content to be inserted",

  // Generate index
  'foundFilesNeedProcess': "A total of {total} files are included in the subdirectory, of which {count} files need to extract information. ",
  'processCancelled': "Processing cancelled",
  'processComplete': "Processing complete for {count} files",
  'cancel': "Cancel",
  'ok': "OK",
  'continue': "Continue",
  'processing': "Processing",  
  'estimatedTokens': "Estimated consumption {tokens} token, do you want to extract information?",  
  'skip': 'Skip LLM',
  'createIndex': 'ExMemo generate dir index',
  'fileList': 'File list',
  'fileDetail': 'File detail',
  'noDescription': 'No description',
  'moc': 'MOC',
  'processingFiles': "Processing files",
  'generatingIndex': "Generating index",
  'processCompleteWithIndex': "Completed processing {count} files and generated {dirs} directory indices",

  // Generate index settings
  'indexFileSetting': "Index file",
  "indexFileSettingDesc": "Generate index file for the directory and summarize the directory content",
  'defaultIndexString': "Index file name",
  'defaultIndexStringDesc': "Default string at the beginning of the index file name",
  'indexExclude': 'Excluded folders or files',
  'indexExcludeDesc': 'Specify the folders or files that do not need to be created. Files or directories containing the specified keywords will be excluded. Use * as a wildcard and separate them with commas.',
  'foundDirsNeedIndex': "{dirs} directories that need indexing.",

  // Prompt Manager
  "promptManager": "Prompt Manager",
  "addPrompt": "Add Prompt",
  "addNewPrompt": "Add New Prompt",
  "enterPrompt": "Enter prompt",
  "editPrompt": "Edit Prompt",
  "useCount": "Usage count",
  "save": "Save",
  "managePrompts": "Manage Prompts",
  "managePromptsDesc": "Prompt manager for adding, deleting and editing prompts",
  "openPromptManager": "Open Prompt Manager"
}