# ExMemo Tools Configuration Guide

This document provides detailed configuration and usage instructions for the ExMemo Tools plugin, helping you utilize all features to their full potential.

## Detailed Configuration

### LLM Settings

#### OpenAI
- Base URL: `https://api.openai.com/v1`
- Common models: gpt-4o, gpt-4.1-nano
- Features: Strong general capabilities, suitable for various tasks

#### Google Gemini
- Base URL: `https://generativelanguage.googleapis.com/v1beta/`
- Common models: gemini-pro, gemini-1.5-flash
- Features: Strong multimodal capabilities, excellent code understanding

#### Anthropic Claude
- Base URL: `https://api.anthropic.com/v1/`
- Common models: claude-3-opus, claude-3-sonnet
- Features: Long context window, high safety standards

#### OpenRouter
- Base URL: `https://openrouter.ai/api/v1`
- Features: Unified interface for accessing multiple models
- Note: Model names require prefixes

#### Self-hosted Model Configuration

For locally running models (like llama.cpp, ollama, etc.), you can configure a local URL

#### Troubleshooting

If you encounter connection issues:
1. Verify your API key is correct and not expired
2. Confirm your network can access the relevant API servers
3. Check that model names are spelled correctly
4. For regional restrictions, consider using an appropriate proxy service

For more information or questions, please visit the [GitHub repository](https://github.com/exmemo-ai/obsidian-exmemo-tools).

