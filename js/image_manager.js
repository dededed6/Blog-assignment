import { MAX_FILE_SIZE } from './variables.js';

// publishOrUpdatePost 함수 (api.js)가 이미지를 업로드
// handleImageFiles는 이미지를 에디터에 임시로 삽입하는 함수
export function handleImageFiles(files, editor) {
    if (!files || files.length === 0) return;

    for (const file of files) {
        if (!file.type.startsWith('image/')) {
            console.warn('Not an image file:', file.name);
            continue;
        }

        if (file.size > MAX_FILE_SIZE) {
            alert(`이미지 크기가 ${MAX_FILE_SIZE / (1024 * 1024)}MB를 초과합니다: ${file.name}`);
            continue;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            const img = document.createElement('img');
            img.src = e.target.result; // Data URL로 임시 표시
            img.style.maxWidth = '100%';
            img.style.height = 'auto';

            const p = document.createElement('p');
            p.appendChild(img);

            const newP = document.createElement('p');
            newP.innerHTML = '<br>';

            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const isInEditor = editor.contains(range.startContainer);
                if (isInEditor) {
                    range.deleteContents();
                    range.insertNode(newP);
                    range.insertNode(p);

                    const newRange = document.createRange();
                    newRange.setStart(newP, 0);
                    newRange.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                    return;
                }
            }

            editor.appendChild(p);
            editor.appendChild(newP);

            const newRange = document.createRange();
            newRange.setStart(newP, 0);
            newRange.collapse(true);

            const selectionFallback = window.getSelection();
            selectionFallback.removeAllRanges();
            selectionFallback.addRange(newRange);
        };

        reader.onerror = function (error) {
            console.error('이미지 파일 읽기 실패:', error);
            alert('이미지 파일을 읽는 중 오류가 발생했습니다.');
        };

        reader.readAsDataURL(file);
    }
}