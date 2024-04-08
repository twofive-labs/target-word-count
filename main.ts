import { Plugin, Modal, Setting, App, Notice, MarkdownView, Editor } from 'obsidian';


interface PluginState {
    lastValidContent: string;
    currentWordCount: number;
    targetWordCount: number;
    targetReachedOnce: boolean;
    prevNewWords: number;
    baselineWordCount: number;
    pluginActive: boolean;
}


class SetTargetWordCountModal extends Modal {
    plugin: TargetWordCountPlugin;

    constructor(app: App, plugin: TargetWordCountPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        let {contentEl} = this;
        let targetWordCountInput: HTMLInputElement;

        contentEl.createEl('h2', {text: 'Set target word count'});

        new Setting(contentEl)
            .setName('Target word count')
            .addText(text => {
                text.setPlaceholder('Enter target word count...')
                targetWordCountInput = text.inputEl;
            });

        new Setting(contentEl)
            .addButton(btn => {
                btn.setButtonText('Set')
                    .onClick(() => {
                        const value = parseInt(targetWordCountInput.value);
                        if (!isNaN(value) && value > 0) {
                            this.plugin.setTargetWordCount(value);
                            new Notice(`Target word count set to ${value}`);
                            this.close();
                        } else {
                            new Notice('Please enter a valid number.');
                        }
                    });
            });
    }

    onClose() {
        let {contentEl} = this;
        contentEl.empty();
    }
}

export default class TargetWordCountPlugin extends Plugin {
    lastValidContent = "";
    currentWordCount = 0;
    targetWordCount = 0;
    targetReachedOnce = false;
    prevNewWords = 0;
    baselineWordCount = 0;
    pluginActive = false;
    statusBarItem: HTMLElement;

    onload() {
        this.addCommand({
            id: 'enable-target-word-count',
            name: 'Set new',
            callback: () => {
                new SetTargetWordCountModal(this.app, this).open();
            },
        });

        this.addCommand({
            id: 'reset-target-word-count-progress',
            name: 'Reset',
            callback: () => {
                this.resetProgress();
            },
        });

        this.addCommand({
            id: 'disable-target-word-count',
            name: 'Stop',
            callback: () => {
                this.disablePlugin();
            },
        });

        this.statusBarItem = this.addStatusBarItem();
        this.updateStatusBar();

        this.registerEvent(this.app.workspace.on('editor-change', this.handleEditorChange.bind(this)));
        this.registerEvent(this.app.workspace.on("active-leaf-change", this.handleActiveLeafChange.bind(this)));
    }

    setTargetWordCount(num: number) {
        this.targetWordCount = num;
        // Activate the plugin by registering event listeners if not already active
        if (!this.pluginActive) {
            this.registerEventListeners();
        }
        this.resetProgress();
    }

    disablePlugin() {
        // Remove event listeners to make the plugin dormant
        this.app.workspace.off('editor-change', this.handleEditorChange.bind(this));
        this.app.workspace.off('active-leaf-change', this.handleActiveLeafChange.bind(this));
        this.pluginActive = false;
        this.targetWordCount = 0; // Optional: Reset target word count on disable
        this.updateStatusBar();
    }
    
    registerEventListeners() {
        this.registerEvent(this.app.workspace.on('editor-change', this.handleEditorChange.bind(this)));
        this.registerEvent(this.app.workspace.on('active-leaf-change', this.handleActiveLeafChange.bind(this)));
        this.pluginActive = true;
    }

    resetProgress() {
        this.targetReachedOnce = false;
        const editor = this.getCurrentEditor();
        if (editor) {
            this.lastValidContent = editor.getValue();
            // Set baseline word count when the target mode is activated or reset
            const baselineWordCount = this.getWordCount(this.lastValidContent);
            this.currentWordCount = 0; // Reset current new word count
            // Store the baseline word count for comparison
            this.baselineWordCount = baselineWordCount;
        }
        this.updateStatusBar();
    }

    handleEditorChange(instance: any, change: any) {
        const editor = this.getCurrentEditor();
        if (editor) {
            const content = editor.getValue();
            const currentCharCount = content.length;
            const totalWordCount = this.getWordCount(content);
            const newWordCount = totalWordCount - this.baselineWordCount + this.prevNewWords; // Calculate new words added
    
            // Use character count to determine if we should revert changes
            if (currentCharCount < this.lastValidContent.length && !this.targetReachedOnce && this.pluginActive) {
                editor.setValue(this.lastValidContent);
                new Notice('Target Word Count Plugin: Cannot delete characters until the target word count is reached. Use command Target Word Count: Stop to re-enable editing.');
            } else {
                this.lastValidContent = content;
                // Update only if new words have been added
                if (newWordCount >= 0) {
                    this.currentWordCount = newWordCount;
                }
    
                if (this.currentWordCount >= this.targetWordCount && !this.targetReachedOnce) {
                    this.targetReachedOnce = true;
                }
                this.updateStatusBar();
            }
        }
    }

    handleActiveLeafChange() {
        // Obtain the current editor for the newly focused document
        const editor = this.getCurrentEditor();
        if (editor) {
            const currentContent = editor.getValue();
            this.prevNewWords = this.currentWordCount;
            this.baselineWordCount = this.getWordCount(currentContent);
            this.lastValidContent = currentContent;
            this.updateStatusBar();
        }
    }
    
    
    

    getCurrentEditor() {
        const activeView = this.app.workspace.activeEditor;
        return activeView ? activeView.editor : null;
    }

    getWordCount(text: any) {
        return text.split(/\s+/).filter(Boolean).length;
    }

    updateStatusBar() {
        if (this.targetWordCount === 0) {
            this.statusBarItem.setText('');
        } else if (this.targetReachedOnce) {
            this.statusBarItem.setText(`Target word count reached. Edit freely.`);
        } else {
            this.statusBarItem.setText(`New Words: ${this.currentWordCount}/${this.targetWordCount}`);
        }
    }

    onunload() {
    }
}
