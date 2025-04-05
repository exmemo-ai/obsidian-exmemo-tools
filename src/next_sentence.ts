import { App, MarkdownView, EditorPosition } from 'obsidian';
import { ExMemoSettings } from './settings';
import { callLLM } from './utils';

export async function generateNextSentence(app: App, settings: ExMemoSettings) {
    const activeView = app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeView) return;

    const editor = activeView.editor;
    const cursor = editor.getCursor();
    const selection = editor.getSelection();
    
    let beforeLines: string[] = [];
    let afterLines: string[] = [];
    let insertPos: EditorPosition;
    
    if (selection) {
        // 使用选区作为上下文
        beforeLines = [selection];
        insertPos = editor.getCursor('to'); // 获取选区结束位置
    } else {
        // 原有的光标位置逻辑
        const currentLine = editor.getLine(cursor.line);
        
        // 获取前2行内容，包括空行
        for (let i = Math.max(0, cursor.line - 2); i < cursor.line; i++) {
            const line = editor.getLine(i);
            if (line.trim()) {
                beforeLines.push(line);
            }
        }
        // 添加当前行光标之前的内容
        const currentLinePrefix = currentLine.substring(0, cursor.ch);
        if (currentLinePrefix.trim()) {
            beforeLines.push(currentLinePrefix);
        }
        
        // 添加当前行光标之后的内容
        const currentLineSuffix = currentLine.substring(cursor.ch);
        if (currentLineSuffix.trim()) {
            afterLines.push(currentLineSuffix);
        }

        // 获取后2行内容
        let afterLineCount = 0;
        let currentLineNum = cursor.line + 1;
        
        while (currentLineNum < editor.lineCount() && afterLineCount < 2) {
            const nextLine = editor.getLine(currentLineNum);
            if (nextLine.trim()) {
                afterLines.push(nextLine);
                afterLineCount++;
            }
            currentLineNum++;
        }
        
        insertPos = cursor;
    }

    const BEFORE_TEXT_LIMIT = 100;
    const AFTER_TEXT_LIMIT = 100;

    const beforeText = beforeLines.join(' ').trim();
    const afterText = afterLines.join(' ').trim();
    
    const truncatedBefore = beforeText.length > BEFORE_TEXT_LIMIT 
        ? '...' + beforeText.slice(-BEFORE_TEXT_LIMIT) 
        : beforeText;
    
    const truncatedAfter = afterText.length > AFTER_TEXT_LIMIT 
        ? afterText.slice(0, AFTER_TEXT_LIMIT) + '...' 
        : afterText;

    const context = `Previous text: ${truncatedBefore}
Following text: ${truncatedAfter}`;

    const prompt = "Complete current sentence or generate a sentence (less than 50 words), based on the context:";
    
    //console.log('Prompt:', prompt);
    //console.log('Context:', context);
    try {
        const loadingChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        let loadingIndex = 0;
        const loadingPos = insertPos;

        // 插入一个空格作为动画占位符
        editor.replaceRange(' ', loadingPos, loadingPos);
        
        // 创建加载动画interval
        const loadingInterval = setInterval(() => {
            const loadingEndPos = {
                line: loadingPos.line,
                ch: loadingPos.ch + 1
            };
            editor.replaceRange(loadingChars[loadingIndex], loadingPos, loadingEndPos);
            loadingIndex = (loadingIndex + 1) % loadingChars.length;
        }, 100);

        const nextSentence = await callLLM(`${prompt}\n\n${context}`, settings, false);
        
        // 清理加载动画
        clearInterval(loadingInterval);
        editor.replaceRange('', loadingPos, {
            line: loadingPos.line,
            ch: loadingPos.ch + 1
        });

        // 插入生成的内容
        const from = loadingPos;
        editor.replaceRange(nextSentence, from, from);
        
        // 计算结束位置并选中内容
        const to = {
            line: insertPos.line,
            ch: insertPos.ch + nextSentence.length
        };
        editor.setSelection(from, to);
    } catch (error) {
        console.error('Error generating next sentence:', error);
    }
}
