English | [中文简体](https://github.com/exmemo-ai/obsidian-exmemo-tools/blob/master/README_cn.md)

# ExMemo Tools

ExMemo Tools is an Obsidian plugin powered by large language models (LLM), offering intelligent document management and content optimization features.

Watch the video：

[![Watch the video](https://img.youtube.com/vi/5naS9p8a1IE/hqdefault.jpg)](https://www.youtube.com/watch?v=5naS9p8a1IE)

## Main Features

* Smart File Archiving - Auto-recommend suitable directories
* Smart Content Insertion - Auto-locate optimal insertion points
* Metadata Management - Auto-generate tags, descriptions, titles
* Directory Indexing - Create directory summaries and content tags
* AI-Assisted Editing - Support content optimization and text continuation
* Generate Card - Create Luhmann cards for files or selected paragraphs

## Quick Start

### Basic Configuration

1. Configure LLM parameters: Set API key, base URL, and model name
2. Optional: Configure tag list or auto-extract tags from repository
3. Optional: Customize metadata generation prompts
4. Recommended: Enable "content truncation" for long documents to control API costs

> Need more detailed setup guide? Check out the [Configuration Documentation](https://github.com/exmemo-ai/obsidian-exmemo-tools/blob/master//docs/configuration.md)

### Core Features

**Generate Metadata** (Ctrl+P > ExMemo Tools: Generate Metadata)
- Auto-generate tags, descriptions, titles, categories, and dates
- Support incremental updates for existing metadata

**Smart Archiving** (Ctrl+P > ExMemo Tools: Select Suitable Directory for Current File)
- Recommend best directories based on file content
- Support directory filtering and path completion

**Smart Content Editing** (Ctrl+P > ExMemo Tools: Insert selected text/LLM Assistant/Continue Writing)
- Smart insertion point location
- AI-assisted content editing (with prompt management)
- Context-aware text continuation

**Generate Card** (Ctrl+P > ExMemo Tools: Generate Luhmann Card)
- Create Luhmann cards based on selected text or file content
- Automatically insert cards into the file

**Generate Index** (Right-click directory > ExMemo Generate Directory Index / Search results > Create Index)
- Generate directory structure and content summary
- Auto-extract and aggregate tags
- Auto-extract cards from files

## License

This project is licensed under the GNU Lesser General Public License v3.0. For more details, please refer to the [LICENSE](./LICENSE) file.

[![coffee](https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=%E2%98%95&slug=windingblack&button_colour=FFDD00&font_colour=000000&font_family=Comic&outline_colour=000000&coffee_colour=ffffff)](https://buymeacoffee.com/xieyan0811y)