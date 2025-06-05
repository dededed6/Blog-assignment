import { savedRange } from './write.js';
import { handleImageFiles } from './image_manager.js';

// 에디터에 서식 적용
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
            newElement.textContent = selectedText || "Good code is like a poetry. It's concise and clear.";
            break;
        case 'code':
            newElement = document.createElement('pre');
            newElement.textContent = selectedText || 'print("Hello, World!")';
            newElement.addEventListener('keydown', handleCodeBlockKeydown);
            break;
        case 'image':
            imageUploadInput.click();
            return;
        case 'ul': // 글머리 기호 목록
            newElement = document.createElement('ul');
            const li_ul = document.createElement('li');
            li_ul.textContent = selectedText || '';
            newElement.appendChild(li_ul);
            break;
        case 'ol': // 번호 매기기 목록
            newElement = document.createElement('ol');
            const li_ol = document.createElement('li');
            li_ol.textContent = selectedText || '';
            newElement.appendChild(li_ol);
            break;
    }

    if (newElement) {
        range.deleteContents(); // 선택된 내용 삭제

        const currentBlock = range.startContainer;

        if (currentBlock.tagName === 'P' && currentBlock.textContent.trim() === '') {
            currentBlock.parentNode.replaceChild(newElement, currentBlock);
        }
        else {
            editor.appendChild(newElement);
        }

        const newRange = document.createRange();

        const nextParagraph = document.createElement('p');
        nextParagraph.innerHTML = '<br>';
        editor.insertBefore(nextParagraph, newElement.nextSibling);

        newRange.setStart(newElement, newElement.childNodes.length);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
    }
}