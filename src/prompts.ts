import { App, Modal, Setting } from 'obsidian';
import { t } from './lang/helpers';

interface PromptItem {
    count: number;
    lastAccess: number;
    priority: number;  // 新增优先级字段
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
                this.draggedItem = null;
                await this.updatePriorities(); // 拖拽结束后更新优先级
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
        if (!items) return;

        // 遍历所有项，更新优先级
        items.forEach((item, index) => {
            const promptText = item.querySelector('.setting-item-name')?.textContent;
            if (promptText && this.prompts[promptText]) {
                this.prompts[promptText].priority = index;
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
                        // 找到相同 count(0) 的最小 priority
                        const minPriority = Math.min(
                            ...Object.values(this.prompts)
                                .filter(p => p.count === 0)
                                .map(p => p.priority ?? 0)
                        );
                        
                        this.prompts[newPrompt] = {
                            count: 0,
                            lastAccess: Date.now(),
                            priority: Math.max(minPriority - 1, 0)
                        };
                        await this.savePrompts();
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
        this.plugin.settings.llmPrompts = this.prompts;
        await this.plugin.saveSettings();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
