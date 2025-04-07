// 简体中文

export default {
    // 基本翻译
    "confirm": "确认",
    "yes": "是",
    "no": "否",
    "llmLoading": "LLM 思考中...",
    "noResult": "LLM 无结果",
    "pleaseOpenFile": "请先打开一个文件",
    "llmError": "LLM 错误",
    "inputPrompt":"请输入提示词",
    "chatButton": "对话",
    "pleaseSelectText": "请先选择文本",
    "currentFileNotMarkdown": "当前文件不是 markdown 文件",
    "fileAlreadyContainsTagsAndDescription": "文件已经包含标签和描述",
    "parseError": "解析错误",
    "metaUpdated": "元数据已更新",

    // LLM 设置
    "llmSettings": "LLM",
    "apiKey": "API Key",
    "baseUrl": "Base URL",
    "modelName": "模型名称",

    // 元数据更新设置
    "metaSetting": "生成元数据",
    "metaSettingDesc": "自动生成文件的元数据",
    "metaUpdateSetting": "更新元数据",
    "updateMetaOptions": "更新选项",
    "updateMetaOptionsDesc": "如果元数据已经存在，是否重新生成",
    "updateForce": "强制更新已存在项",
    "updateNoLLM": "只更新不用LLM的项",

    // 内容截断设置
    "truncateSettings": "内容截断",
    "truncateContent": "内容太长是否截断",
    "truncateContentDesc": "使用LLM时，如果内容超过最大字数，是否截断",
    "maxContentLength": "截断后最大内容长度",
    "maxContentLengthDesc": "设置内容的最大 token 限制",
    "truncateMethod": "截断方式",
    "truncateMethodDesc": "选择内容超过限制时的处理方式",
    "head_only": "仅提取开头部分",
    "head_tail": "提取开头和结尾部分",
    "heading": "提取标题及其下方的文字",

    // 标签设置
    "taggingOptions": "标签",
    "taggingOptionsDesc": "自动生成标签",
    "extractTags": "提取标签",
    "extractTagsDesc": "从所有笔记中提取出现超过两次的标签",
    "extract": "提取",
    "tagList": "标签列表",
    "tagListDesc": "可选标签列表，使用回车分隔",
    "metaTagsPrompt": "标签生成提示词",
    "metaTagsPromptDesc": "用于生成标签的提示词，可在此设置语言、大小写等",
    "defaultTagsPrompt": "请提取这篇文章中最合适的不超过三个标签，并使用与内容相同的语言。",
    "tagsFieldName": "标签字段名",
    "tagsFieldNameDesc": "自动生成标签使用的字段名 (默认: tags)",
    "simplifyTagsConfirm": "当前标签列表包含 {count} 个tokens，是否需要使用AI自动精简？",
    "simplifyTagsPrompt": "请将以下标签列表精简到{count}个以内最重要的标签，保持原有格式，不返回其它内容，标签列表如下：",

    // 描述设置
    "description": "描述",
    "descriptionPrompt": "描述提示词",
    "descriptionPromptDesc": "用于生成描述的提示词",
    "defaultSummaryPrompt": "直接总结文章的核心内容，不要使用'这篇文章'这样的短语，不超过50个字，且与内容使用相同语言回答。",
    "descriptionFieldName": "描述字段名",
    "descriptionFieldNameDesc": "自动生成描述使用的字段名 (默认: description)",

    // 标题设置
    "title": "标题",
    "enableTitle": "启用自动生成标题",
    "enableTitleDesc": "启用后将自动生成文档标题",
    "titlePrompt": "标题生成提示词",
    "titlePromptDesc": "用于生成标题的提示词",
    "defaultTitlePrompt": "请为这篇文档生成一个简洁明了的标题，不超过10个字，不要使用引号。",
    "titleFieldName": "标题字段名",
    "titleFieldNameDesc": "自动生成标题使用的字段名 (默认: title)",
    
    // 编辑时间设置
    "editTime": "编辑时间",
    "enableEditTime": "启用自动更新编辑时间",
    "enableEditTimeDesc": "启用后将自动更新文档的编辑时间",
    "editTimeFormat": "时间格式",
    "editTimeFormatDesc": "编辑时间的格式，使用 moment.js 格式",
    "updateTimeFieldName": "更新时间字段名",
    "updateTimeFieldNameDesc": "自动更新编辑时间使用的字段名 (默认: updated)",
    "createTimeFieldName": "创建时间字段名",
    "createTimeFieldNameDesc": "自动生成创建时间使用的字段名 (默认: created)",

    // 自定义元数据设置
    "customMetadata": "自定义元数据",
    "customMetadataDesc": "添加自定义的元数据字段，如：author=作者名",
    "addField": "添加字段",
    "fieldKey": "字段名",
    "fieldValue": "字段值",

    // 类别设置
    "categoryOptions": "类别",
    "enableCategory": "启用自动分类",
    "enableCategoryDesc": "启用后将自动为文档选择类别",
    "categoryFieldName": "类别字段名",
    "categoryFieldNameDesc": "自动生成类别使用的字段名 (默认: category)",
    "categoryList": "类别列表",
    "categoryListDesc": "可选类别列表，使用回车分隔",
    "metaCategoryPrompt": "类别生成提示词",
    "metaCategoryPromptDesc": "用于生成类别的提示词",
    "defaultCategoryPrompt": "请为这篇文档选择一个合适的类别",
    "categoryUnknown": "未分类",
    "defaultCategories": "[\"旅行\", \"购物\", \"心情\", \"读后感\", \"知识科技\", \"娱乐\", \"待读论文\", \"灵感创意\", \"待办事项\", \"方法论\", \"工作思考\", \"投资\", \"待读书\", \"个人信息\", \"记帐\", \"待做\", \"健康\", \"摘录\", \"日常琐事\", \"世界观\", \"美食\"]",

    // 捐赠相关
    "donate": "捐赠",
    "donateDesc": "感谢您的支持",
    "supportThisPlugin": "支持此插件",
    "supportThisPluginDesc": "如果您喜欢这个插件，可以请我喝杯咖啡",
    "bugMeACoffee": "请我喝杯咖啡",

    // 命令相关
    "exmemoAdjustMeta": "生成元数据",
    "exmemoSelectFolder": "为当前文件选择合适的目录",
    "exmemoInsertMd": "将选中的文本插入到 markdown 合适位置",
    "exmemoLLMAssistant": "智能编辑",
    'exmemoGenerateNext': '续写下一句',

    // LLM 助手设置
    "llmAssistantSetting": "智能编辑",
    "llmAssistantSettingDesc": "支持 LLM 对话、内容编辑和续写",
    "llmAssistantDialogEdit": "提示词是否可编辑",
    "llmAssistantDialogEditDesc": "是否允许编辑之前保存的提示词；如果允许，则需要通过按钮来触发对话",

    // 文件迁移
    "allFolders": "全部目录",
    "noFolders": "没有找到目录",
    "tooManyFolders_1": "有",
    "tooManyFolders_2": "个待选子目录，数量较多，是否继续？",
    "searchDesc": "通过关键字过滤目录",
    "pleaseSelectFolder": "请选择一个目录开始迁移",
    "folderNotFound": "未找到目录：",
    "migrationSuccess": "迁移成功",

    // 文件迁移设置
    "folderSelectionSetting": "目录选择",
    "folderSelectionSettingDesc": "为当前文件选择合适的目录，并迁移",
    "excludedFolders": "排除目录",
    "excludedFoldersDesc": "列出排除的目标目录，目录之间用回车分隔",

    // 编辑md文件
    "insertContent": "待插入内容",

    // 生成索引
    "foundFilesNeedProcess": "子目录中共纳入 {total} 个文件，其中 {count} 个文件需要提取信息。",
    "processCancelled": "处理已取消",
    "processComplete": "已完成处理 {count} 个文件",
    "cancel": "取消",
    "continue": "继续",
    "processing": "处理中",
    "estimatedTokens": "预计消耗 {tokens} token，是否用模型提取信息？",
    "skip": "跳过 LLM 提取",
    "createIndex": "ExMemo生成目录索引",
    "fileList": "文件列表",
    "fileDetail": "文件详情",
    "noDescription": "暂无",
    "moc": "目录",
    "processingFiles": "处理文件",
    "generatingIndex": "生成索引",
    "processCompleteWithIndex": "已完成处理 {count} 个文件并生成 {dirs} 个目录索引",

    // 生成索引设置
    "indexFileSetting": "生成索引文件",
    "indexFileSettingDesc": "为目录生成索引文件，并总结目录内容",
    "defaultIndexString": "索引文件名",
    "defaultIndexStringDesc": "索引文件名开头的默认字符串",
    "indexExcludeFile": "排除的文件",
    "indexExcludeFileDesc": "指定不需要生成Meta信息的文件，包含指定关键字的文件将被排除。使用 * 作为通配符，并用逗号分隔。",
    "indexExcludeDir": "排除的目录",
    "indexExcludeDirDesc": "指定不需要建立索引的目录，包含指定关键字的目录将被排除。使用 * 作为通配符，并用逗号分隔。",
    "foundDirsNeedIndex": "{dirs} 个目录需要提取信息。",

    // 提示词管理器
    "promptManager": "提示词管理",
    "addPrompt": "添加提示词",
    "addNewPrompt": "添加新提示词",
    "enterPrompt": "请输入提示词",
    "editPrompt": "编辑提示词",
    "useCount": "使用次数",
    "save": "保存",
    "managePrompts": "管理提示词",
    "managePromptsDesc": "提示词管理器，支持添加、删除和编辑提示词",
    "openPromptManager": "打开提示词管理器",
}