English | [中文简体](https://github.com/exmemo-ai/obsidian-exmemo-tools/blob/master/README_cn.md)

## Introduction

ExMemo Tools provides intelligent document management features, assisting users in automatically categorizing and organizing files into appropriate directories and locations. Leveraging the capabilities of large language models (LLM), it not only generates and updates file metadata automatically but also optimizes selected text content, thereby achieving efficient information management and document editing.

## Main Features

* Generate and update the file's metadata, including tags, descriptions, titles, and editing times.
* Optimize the selected content using large language models (LLM).
* Move the current document to a suitable directory.
* Insert the currently selected content into the appropriate position in the current document.

## Usage

### Setup

Before using the tool, ensure the following setup is completed:

* First, configure options related to LLM, including the API key, base URL, and model name.
* If using the auto-generate tags feature, it is recommended to pre-fill the tag list or automatically extract existing tags from the current repository to ensure generated tags align with the user's style.
* To modify the method for generating descriptions, adjust the prompt words for generating descriptions in the settings.
* For generating metadata for longer articles, the model call may incur higher costs. It is recommended to control costs using the "content truncation" feature in the settings.

### Generating Metadata

Press Ctrl+P and select: ExMemo Tools: Generate Metadata.

Generating tags and descriptions can often be a daunting task. We frequently end up creating tags with the same meaning but different formulations, impacting subsequent processing. To solve this problem, we have implemented an automatic tag generation feature that can automatically create three tags each time. Users can define the range of tags in the settings or extract options from tags that appear more than twice in the current repository. For generating short descriptions of documents, the tool provides default prompt words, which users can edit in the settings to define their own style.

During the process of generating tags and descriptions, the document content must be provided to LLM. For lengthy documents, this might lead to higher costs. Therefore, the tool offers a truncation feature in the settings, allowing only the head, tail, or mid-title of a document to be sent to the model. For documents containing tags and descriptions, users can opt not to regenerate this information in the settings to effectively control costs.

Additionally, generating titles, creation dates, and editing dates, although common, can be tedious tasks. Our tool offers one-click generation for these metadata elements, greatly simplifying daily workflows.

### File Archiving

Press Ctrl+P and select: ExMemo Tools: Select Suitable Directory for Current File.

When our note data volume is vast and the directory structure is complex, it usually takes time to place new documents in appropriate directories. This tool provides a file archiving feature by submitting the currently open file's filename, the file description in the metadata, and the directory structure of the current repository to the large model, which recommends three most suitable directories for archiving. Users can quickly move the file to a directory by selecting one.

To save the cost of using the large model and achieve more accurate archiving capability, users can select specific directories in the dialog box to use their subdirectories as options and support using the 'Tab' key for directory name completion. Moreover, an option is provided in the settings to exclude certain archiving directories to avoid interference from temporary directories.

### Content Insertion Management

Press Ctrl+P and select: ExMemo Tools: Insert the selected text into the best position.

In cases where there is abundant note content, finding the suitable insertion point when you wish to add new fragments often requires reviewing the entire file. This tool helps users accurately locate the appropriate insertion point by sending the currently selected content along with the entire document to the large model, while also displaying the newly inserted content in bold, thereby significantly enhancing editing efficiency.

### Content Optimization Upgrade

Press Ctrl+P and select "ExMemo Tools: LLM Assistant".

In the popup box, you can input any prompt. The tool will pass the prompt along with the currently selected text to the LLM, enabling functions such as text polishing, translation, reconstruction, etc., essentially embedding the LLM interface into Obsidian.

Compared to chat tools, this tool doesn't remember previous conversations, thus conserving tokens.

For regular users, the number of commonly used prompts is usually limited. The tool remembers the prompts entered by users and sorts them based on usage frequency for easy selection next time.

It's recommended to set the LLM Assistant feature as a shortcut for quicker access.

## License

This project is licensed under the GNU Lesser General Public License v3.0. For more details, please refer to the [LICENSE](./LICENSE) file.

[![coffee](https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=%E2%98%95&slug=windingblack&button_colour=FFDD00&font_colour=000000&font_family=Comic&outline_colour=000000&coffee_colour=ffffff)](https://buymeacoffee.com/xieyan0811y)