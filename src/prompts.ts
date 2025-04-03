import { App, Modal, Setting } from 'obsidian';
import { t } from './lang/helpers';

interface PromptItem {
    count: number;
    lastAccess: number;
    priority: number | null;
}

interface PromptList {
    [key: string]: PromptItem;
}

// 在类定义前添加导出函数
export function sortPromptsByPriority(prompts: Record<string, PromptItem>, a: string, b: string): number {
    const itemA = prompts[a];
    const itemB = prompts[b];
    const priorityA = itemA.priority ?? Number.MAX_SAFE_INTEGER;
    const priorityB = itemB.priority ?? Number.MAX_SAFE_INTEGER;
    
    if (priorityB !== priorityA) {
        return priorityA - priorityB;
    }
    if (itemB.count !== itemA.count) {
        return itemB.count - itemA.count;
    }
    return itemB.lastAccess - itemA.lastAccess;
}

export async function addPrompt(plugin: any, prompt: string, count: number = 0) {
    let prompts = plugin.settings.llmPrompts;
    const currentTime = Date.now();
    
    if (prompts[prompt]) {
        prompts[prompt].count += 1;
        prompts[prompt].lastAccess = currentTime;
    } else {
        prompts[prompt] = {
            count: count,
            lastAccess: currentTime,
            priority: null
        };
    }
    
    plugin.settings.llmPrompts = prompts;
    await plugin.saveSettings();
    return prompts[prompt];
}

export class PromptModal extends Modal {
    private prompts: PromptList;
    private plugin: any;
    private draggedItem: HTMLElement | null = null;

    constructor(app: App, plugin: any) {
        super(app);
        this.plugin = plugin;
        this.prompts = plugin.settings.llmPrompts || {};
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        // 标题
        contentEl.createEl('h3', { text: t('promptManager') });

        // 添加新提示按钮
        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText(t('addPrompt'))
                .setCta()
                .onClick(() => this.showAddPromptDialog()));

        // 提示列表容器
        const promptsContainer = contentEl.createEl('div', { cls: 'prompts-container' });
        this.renderPromptList(promptsContainer);
    }

    private renderPromptList(container: HTMLElement | null) {
        if (!container) return;
        container.empty();

        // 修改排序逻辑
        const sortedPrompts = Object.entries(this.prompts)
            .sort(([a], [b]) => sortPromptsByPriority(this.prompts, a, b));

        sortedPrompts.forEach(([prompt, data]) => {
            const promptEl = container.createEl('div', { 
                cls: 'prompt-item',
                attr: { 'draggable': 'true' }
            });

            // 拖拽事件
            promptEl.addEventListener('dragstart', (e) => {
                this.draggedItem = promptEl;
                promptEl.addClass('dragging');
            });

            promptEl.addEventListener('dragend', async () => {
                promptEl.removeClass('dragging');
                await this.updatePriorities();
                this.draggedItem = null;
            });

            promptEl.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (this.draggedItem && this.draggedItem !== promptEl) {
                    const rect = promptEl.getBoundingClientRect();
                    const mid = (rect.top + rect.bottom) / 2;
                    if (e.clientY < mid) {
                        promptEl.before(this.draggedItem);
                    } else {
                        promptEl.after(this.draggedItem);
                    }
                }
            });

            new Setting(promptEl)
                .setName(prompt)
                .setDesc(`${t('useCount')}: ${data.count}`)
                .addButton(btn => btn
                    .setIcon('pencil')
                    .onClick(() => this.showEditPromptDialog(prompt)))
                .addButton(btn => btn
                    .setIcon('trash')
                    .onClick(() => this.deletePrompt(prompt)));
        });
    }

    private async updatePriorities() {
        const container = this.contentEl.querySelector('.prompts-container');
        const items = container?.querySelectorAll('.prompt-item');
        if (!items || !this.draggedItem) return;

        // 找到被拖动项的新位置
        let draggedIndex = -1;
        items.forEach((item, index) => {
            if (item === this.draggedItem) {
                draggedIndex = index;
            }
        });

        if (draggedIndex === -1) return;

        // console.log("Dragged index:", draggedIndex);

        items.forEach((item, index) => {
            const promptText = item.querySelector('.setting-item-name')?.textContent;
            if (promptText && this.prompts[promptText]) {
                if (index <= draggedIndex || ('priority' in this.prompts[promptText] && this.prompts[promptText].priority !== null)) {
                    this.prompts[promptText].priority = index;
                }
            }
        });

        await this.savePrompts();
    }

    private async showAddPromptDialog() {
        const modal = new Modal(this.app);
        modal.titleEl.setText(t('addNewPrompt'));
        
        const promptInput = modal.contentEl.createEl('textarea');
        promptInput.placeholder = t('enterPrompt');
        promptInput.style.width = '100%';
        promptInput.style.height = '100px';

        new Setting(modal.contentEl)
            .addButton(btn => btn
                .setButtonText(t('save'))
                .setCta()
                .onClick(async () => {
                    const newPrompt = promptInput.value.trim();
                    if (newPrompt) {
                        await addPrompt(this.plugin, newPrompt);
                        this.prompts = this.plugin.settings.llmPrompts;
                        this.renderPromptList(this.contentEl.querySelector('.prompts-container'));
                        modal.close();
                    }
                }));

        modal.open();
    }

    private async showEditPromptDialog(oldPrompt: string) {
        const modal = new Modal(this.app);
        modal.titleEl.setText(t('editPrompt'));
        
        const promptInput = modal.contentEl.createEl('textarea');
        promptInput.value = oldPrompt;
        promptInput.style.width = '100%';
        promptInput.style.height = '100px';

        new Setting(modal.contentEl)
            .addButton(btn => btn
                .setButtonText(t('save'))
                .setCta()
                .onClick(async () => {
                    const newPrompt = promptInput.value.trim();
                    if (newPrompt && newPrompt !== oldPrompt) {
                        this.prompts[newPrompt] = this.prompts[oldPrompt];
                        delete this.prompts[oldPrompt];
                        await this.savePrompts();
                        this.renderPromptList(this.contentEl.querySelector('.prompts-container'));
                        modal.close();
                    }
                }));

        modal.open();
    }

    private async deletePrompt(prompt: string) {
        delete this.prompts[prompt];
        await this.savePrompts();
        this.renderPromptList(this.contentEl.querySelector('.prompts-container'));
    }

    private async savePrompts() {
        this.prompts = Object.fromEntries(
            Object.entries(this.prompts).sort(([a, aData], [b, bData]) => {
                const priorityA = aData.priority ?? Number.MAX_SAFE_INTEGER;
                const priorityB = bData.priority ?? Number.MAX_SAFE_INTEGER;
                if (priorityA !== priorityB) {
                    return priorityA - priorityB;
                }
                if (aData.count !== bData.count) {
                    return bData.count - aData.count;
                }
                return bData.lastAccess - aData.lastAccess;
            })
        );
        this.plugin.settings.llmPrompts = this.prompts;
        await this.plugin.saveSettings();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
