import { Plugin, Modal, Setting, Notice } from 'obsidian';

class SetTargetWordCountModal extends Modal {
    plugin: TargetWordCountPlugin;
    constructor(plugin: TargetWordCountPlugin) {
        super(plugin.app);
        this.plugin = plugin;
    }
    onOpen() {
        let {contentEl} = this;
        new Setting(contentEl)
            .setName('Set Target Word Count')
            .addText(text => text
                .onChange(async (value) => {
                    let num = parseInt(value);
                    if (!isNaN(num)) {
                        this.plugin.setTargetWordCount(num);
                        new Notice(`Target word count set to ${num}`);
                        this.close();
                    }
                }));
    }
    onClose() {
        let {contentEl} = this;
        contentEl.empty();
    }
}

export default class TargetWordCountPlugin extends Plugin {
    targetWordCount: number = 0;
    baseWordCount: number = 0;
    targetReachedOnce: boolean = false;
    statusBarItem: HTMLElement;

    onload() {
        this.addCommand({
            id: 'enable-target-word-count',
            name: 'Enable Target Word Count Mode',
            callback: () => {
                new SetTargetWordCountModal(this).open();
            },
        });

        this.addCommand({
            id: 'reset-target-word-count-progress',
            name: 'Reset Target Word Count Progress',
            callback: () => {
                this.resetProgress();
            },
        });

        this.statusBarItem = this.addStatusBarItem();
        this.updateStatusBar();
        
        this.registerEvent(
            this.app.workspace.on('editor-change', (editor) => {
                this.updateWordCount(editor.getValue());
            })
        );
    }

    setTargetWordCount(num: number) {
        this.targetWordCount = num;
        this.resetProgress();
    }

    resetProgress() {
        this.targetReachedOnce = false;
        this.baseWordCount = this.getCurrentWordCount();
        this.updateStatusBar();
    }

    updateWordCount(currentText: string) {
        if (!this.targetReachedOnce) {
            let currentWordCount = currentText.split(/\s+/).filter(Boolean).length - this.baseWordCount;
            if (currentWordCount >= this.targetWordCount) {
                this.targetReachedOnce = true;
                new Notice('Target word count achieved!');
            }
            this.updateStatusBar(currentWordCount);
        }
    }

    getCurrentWordCount(): number {
        let editor = this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
        return editor ? editor.getValue().split(/\s+/).filter(Boolean).length : 0;
    }

    updateStatusBar(currentWordCount: number = 0) {
        if (this.targetReachedOnce) {
            this.statusBarItem.setText(`Target reached. Edit freely.`);
        } else {
            this.statusBarItem.setText(`New words: ${currentWordCount}/${this.targetWordCount}`);
        }
    }

    onunload() {
    }
}
