# ExMemo Tools 详细配置指南

本文档提供了 ExMemo Tools 插件的详细配置和使用指南，帮助您充分利用插件的所有功能。

## 详细配置说明

### LLM 设置

#### OpenAI
- 基础 URL: `https://api.openai.com/v1`
- 常用模型: gpt-4o, gpt-4.1-nano

#### Google Gemini
- 基础 URL: `https://generativelanguage.googleapis.com/v1beta/`
- 常用模型: gemini-pro, gemini-1.5-flash

#### Anthropic Claude
- 基础 URL: `https://api.anthropic.com/v1/`
- 常用模型: claude-3-opus, claude-3-sonnet

#### OpenRouter
- 基础 URL: `https://openrouter.ai/api/v1`
- 特点: 统一接口访问多种模型
- 注意: 模型名称需要加前缀

#### 自托管模型配置

如果您运行本地模型（如llama.cpp、ollama等），可以配置本地URL

#### 故障排除

如果遇到连接问题：
1. 检查API密钥是否正确且未过期
2. 确认您的网络可以访问相应的API服务器
3. 检查模型名称拼写是否正确
4. 对于地区限制，考虑使用适当的代理服务

如有更多问题，请访问[GitHub仓库](https://github.com/exmemo-ai/obsidian-exmemo-tools)提问。
