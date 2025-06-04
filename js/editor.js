// js/editor.js

import { savedRange } from './write.js'; // write.js에서 savedRange 임포트
import { handleImageFiles } from './image_manager.js'; // image_manager.js에서 임포트

export function applyFormat(format, editor, imageUploadInput) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();

    let newElement;
    switch (format) {
        case 'h2':
        case 'h3':
            newElement = document.createElement(format);
            newElement.textContent = selectedText || '제목';
            break;
        case 'blockquote':
            newElement = document.createElement(format);
            newElement.textContent = selectedText || '';
            break;
        case 'code':
            newElement = document.createElement('pre');
            newElement.textContent = selectedText || 'print("Hello, World!")';
            newElement.addEventListener('keydown', handleCodeBlockKeydown);
            break;
        case 'image':
            imageUploadInput.click();
            return;
    }

    if (newElement) {
        let currentBlock = range.startContainer;
        while (currentBlock && currentBlock.nodeType !== Node.ELEMENT_NODE && currentBlock !== editor) {
            currentBlock = currentBlock.parentNode;
        }

        const isInEditor = editor.contains(range.startContainer);

        if (isInEditor && currentBlock && editor.contains(currentBlock)) {
            if (selectedText && currentBlock.textContent.trim() === selectedText.trim()) {
                currentBlock.parentNode.replaceChild(newElement, currentBlock);
            } else if (currentBlock.tagName === 'P' && currentBlock.textContent.trim() === '') {
                currentBlock.parentNode.replaceChild(newElement, currentBlock);
            } else {
                currentBlock.parentNode.insertBefore(newElement, currentBlock.nextSibling);
            }
        } else {
            editor.appendChild(newElement);
        }

        const p = document.createElement('p');
        p.innerHTML = '<br>';
        newElement.parentNode.insertBefore(p, newElement.nextSibling);

        const newRange = document.createRange();
        newRange.setStart(p, 0);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
    }
}

export function handleCodeBlockKeydown(e) {
    if (e.target.tagName !== 'PRE') return;

    if (e.key === '{' || e.key === '(') {
        e.preventDefault();

        const selection = window.getSelection();
        const range = selection.getRangeAt(0);

        const closingBracket = e.key === '{' ? '}' : ')';

        range.insertNode(document.createTextNode(e.key));
        range.collapse(false);
        range.insertNode(document.createTextNode('\n    \n' + closingBracket));

        range.setStart(range.startContainer, range.startOffset - (closingBracket.length + 1));
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        const currentLineText = range.startContainer.textContent;
        const cursorPosition = range.startOffset;

        let indentation = 0;
        const match = currentLineText.substring(0, cursorPosition).match(/^\s*/);
        if (match) {
            indentation = match[0].length;
        }

        range.insertNode(document.createTextNode('\n' + ' '.repeat(indentation)));

        range.setStart(range.startContainer, range.startOffset + 1 + indentation);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    } else if (e.key === 'Tab') {
        e.preventDefault();
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        range.insertNode(document.createTextNode('    '));
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
    }
}

export function setupEditorEnterKey(editor) {
    editor.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();

            const selection = window.getSelection();
            const range = selection.getRangeAt(0);
            let currentBlock = range.startContainer;

            while (currentBlock && currentBlock.nodeType !== Node.ELEMENT_NODE && currentBlock !== editor) {
                currentBlock = currentBlock.parentNode;
            }

            if (!currentBlock || currentBlock === editor) {
                const p = document.createElement('p');
                p.innerHTML = '<br>';
                editor.appendChild(p);
                const newRange = document.createRange();
                newRange.setStart(p, 0);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
                return;
            }

            if (currentBlock.tagName === 'PRE') {
                handleCodeBlockKeydown(e);
                return;
            }

            const p = document.createElement('p');
            p.innerHTML = '<br>';

            currentBlock.parentNode.insertBefore(p, currentBlock.nextSibling);

            const newRange = document.createRange();
            newRange.setStart(p, 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
        }
    });

    if (!editor.querySelector('p')) {
        editor.innerHTML = '<p><br></p>';
    }
}