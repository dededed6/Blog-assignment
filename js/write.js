let savedRange = null;
// Google Apps Script 웹앱 URL
const SCRIPT_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbwKf419HOph2rBS0aCHCZ18dUAKyik_xUv7VUcUIEB669lB9Vw8z0EYoDVa45HTlEZfEw/exec';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 10; // 최대 업로드 가능한 이미지 수

// 이미지 ID를 썸네일 URL로 변환하는 함수
function convertToThumbnailUrl(fileId) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
}

// 로딩 오버레이 표시/숨김 함수
function toggleLoading(show) {
    const overlay = document.querySelector('.loading-overlay');
    overlay.style.display = show ? 'flex' : 'none';
}

// Base64 이미지를 파일로 변환
async function base64ToFile(dataUrl, filename) {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type });
}

// 이미지 업로드 함수
async function uploadImage(file) {
    try {
        const reader = new FileReader();
        return new Promise((resolve, reject) => {
            reader.onload = async function() {
                try {
                    const url = new URL(SCRIPT_WEBAPP_URL);
                    url.searchParams.append('filename', file.name);
                    url.searchParams.append('mimeType', file.type);
                    
                    const response = await fetch(url.toString(), {
                        redirect: "follow",
                        method: 'POST',
                        headers: {
                            "Content-Type": "text/plain;charset=utf-8",
                        },
                        body: JSON.stringify([...new Int8Array(reader.result)])
                    });

                    if (!response.ok) {
                        throw new Error(`이미지 업로드 실패 (${response.status})`);
                    }
                    
                    const result = await response.json();
                    
                    if (result.fileId) {
                        const thumbnailUrl = convertToThumbnailUrl(result.fileId);
                        resolve(thumbnailUrl);
                    } else {
                        throw new Error('이미지 ID를 받지 못했습니다.');
                    }
                } catch (error) {
                    console.error('Upload error:', error);
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('파일 읽기 실패'));
            reader.readAsArrayBuffer(file);
        });
    } catch (error) {
        console.error('Upload preparation error:', error);
        throw error;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const editor = document.getElementById('editor');
    const titleInput = document.getElementById('title-input');
    const publishBtn = document.getElementById('publish-btn');
    const imageUpload = document.getElementById('image-upload');
    const formatBtn = document.getElementById('format-btn');
    const formatMenu = document.querySelector('.format-menu');
    const formatItems = document.querySelectorAll('.format-item');
    const imagePreview = document.getElementById('image-preview');
    const loadingOverlay = document.querySelector('.loading-overlay');
    const floatingMenu = document.querySelector('.floating-menu');

    // floatingMenu 항상 보이게 스타일 적용 (JS로 토글하지 않음)
    if (floatingMenu) {
        floatingMenu.style.opacity = '1';
        floatingMenu.style.visibility = 'visible';
    }

    // 서식 메뉴 토글
    formatBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            savedRange = selection.getRangeAt(0);
        }
        formatMenu.classList.toggle('active');
    });

    // 메뉴 외부 클릭시 닫기
    document.addEventListener('click', (e) => {
        if (!formatMenu.contains(e.target) && !formatBtn.contains(e.target)) {
            formatMenu.classList.remove('active');
        }
    });

    // 서식 적용 함수
    function applyFormat(format) {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const selectedText = range.toString();
        
        // 현재 커서가 있는 블록 요소 찾기
        let currentBlock = range.startContainer;
        while (currentBlock && currentBlock.nodeType !== Node.ELEMENT_NODE) {
            currentBlock = currentBlock.parentNode;
        }

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
                // 코드 블록 키 이벤트 리스너 추가
                newElement.addEventListener('keydown', handleCodeBlockKeydown);
                break;
            case 'image':
                imageUpload.click();
                formatMenu.classList.remove('active');
                return;
        }

        if (newElement) {
            const isInEditor = editor.contains(range.startContainer);
            if (isInEditor && currentBlock && currentBlock.parentNode) {
                currentBlock.parentNode.insertBefore(newElement, currentBlock.nextSibling);
            } else {
                editor.appendChild(newElement);
            }
            
            // 새 단락 추가
            const p = document.createElement('p');
            p.innerHTML = '<br>';
            newElement.parentNode.insertBefore(p, newElement.nextSibling);
            
            // 커서를 새 단락으로 이동
            const newRange = document.createRange();
            newRange.setStart(p, 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
        }

        formatMenu.classList.remove('active');
    }

    // 코드 블록 키 이벤트 처리
    function handleCodeBlockKeydown(e) {
        if (e.key === '{' || e.key === '(') {
            e.preventDefault();
            
            const selection = window.getSelection();
            const range = selection.getRangeAt(0);
            const currentLine = range.startContainer.textContent;
            const cursorPosition = range.startOffset;
            
            // 괄호 쌍과 들여쓰기된 새 줄 추가
            const closingBracket = e.key === '{' ? '}' : ')';
            const textNode = document.createTextNode(e.key + '\n    \n' + closingBracket);
            range.insertNode(textNode);
            
            // 커서를 들여쓰기된 줄로 이동
            const newRange = document.createRange();
            newRange.setStart(textNode, e.key.length + 5);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
        }
    }

    // 서식 메뉴 아이템 클릭 이벤트
    formatItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            if (savedRange) {
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(savedRange);
            }
            const format = item.getAttribute('data-format');
            applyFormat(format);
        });
    });

    // 에디터 초기화
    if (!editor.querySelector('p')) {
        editor.innerHTML = '<p><br></p>';
    }

    // 에디터 Enter 키 처리
    editor.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            
            const selection = window.getSelection();
            const range = selection.getRangeAt(0);
            let currentBlock = range.startContainer;
            
            // 현재 블록 요소 찾기
            while (currentBlock && currentBlock.nodeType !== Node.ELEMENT_NODE) {
                currentBlock = currentBlock.parentNode;
            }
            
            // 일반 단락 추가
            const p = document.createElement('p');
            p.innerHTML = '<br>';
            
            if (currentBlock.tagName === 'P') {
                currentBlock.parentNode.insertBefore(p, currentBlock.nextSibling);
            } else {
                editor.appendChild(p);
            }
            
            const newRange = document.createRange();
            newRange.setStart(p, 0);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
        }
    });

    // 이미지 드래그 앤 드롭
    editor.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.style.backgroundColor = 'rgba(18, 184, 134, 0.05)';
    });

    editor.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.style.backgroundColor = '';
    });

    editor.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.style.backgroundColor = '';
        handleImageFiles(e.dataTransfer.files);
    });

    // 이미지 붙여넣기
    editor.addEventListener('paste', function(e) {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        
        for (const item of items) {
            if (item.type.indexOf('image') === 0) {
                const file = item.getAsFile();
                handleImageFiles([file]);
                e.preventDefault();
                break;
            }
        }
    });

    // 발행/수정하기
    publishBtn.addEventListener('click', async function () {
        const title = titleInput.value.trim();
        if (!title) {
            alert('제목을 입력해주세요.');
            titleInput.focus();
            return;
        }

        const content = editor.innerHTML;
        if (!content.trim() || content === '<p><br></p>') {
            alert('내용을 입력해주세요.');
            editor.focus();
            return;
        }

        const isEdit = new URLSearchParams(window.location.search).get('edit') === '1';
        const post = isEdit ? JSON.parse(localStorage.getItem('editPost')) : null;

        try {
            toggleLoading(true);

            const images = editor.querySelectorAll('img');
            const uploadedUrls = [];
            let processedImages = 0;

            for (const img of images) {
                if (img.src.startsWith('data:')) {
                    const file = await base64ToFile(
                        img.src,
                        `image_${processedImages + 1}.${img.src.split(';')[0].split('/')[1]}`
                    );

                    if (file.size > MAX_FILE_SIZE) {
                        throw new Error(`이미지 크기가 5MB를 초과합니다: ${file.name}`);
                    }

                    const uploadedUrl = await uploadImage(file);
                    uploadedUrls.push(uploadedUrl);
                    img.src = uploadedUrl;
                    processedImages++;
                } else {
                    uploadedUrls.push(img.src);
                }
            }

            const postData = {
                title: title,
                content: editor.innerHTML,
                imageUrl: uploadedUrls.join(','),
                timestamp: isEdit && post ? post.timestamp : new Date().toISOString(),
                ...(isEdit ? { type: 'update' } : {})
            };

            const response = await fetch(SCRIPT_WEBAPP_URL, {
                redirect: "follow",
                method: 'POST',
                headers: {
                    "Content-Type": "text/plain;charset=utf-8",
                },
                body: JSON.stringify(postData)
            });

            const result = await response.json();
            if (result.status !== "success") {
                throw new Error(result.message || (isEdit ? '수정 실패' : '저장 실패'));
            }

            alert(isEdit ? '수정 완료되었습니다.' : '발행 완료되었습니다.');
            window.location.href = '/';
        } catch (error) {
            console.error(isEdit ? '수정 실패:' : '발행 실패:', error);
            alert(isEdit ? '수정에 실패했습니다.' : '발행에 실패했습니다.');
        } finally {
            toggleLoading(false);
        }
    });

    // 이미지 파일 선택
    imageUpload.addEventListener('change', (e) => {
        handleImageFiles(e.target.files);
        // 파일 선택 후 input 초기화
        e.target.value = '';
    });

    // 이미지 파일 처리 함수 수정
    function handleImageFiles(files) {
        if (!files || files.length === 0) return;

        for (const file of files) {
            if (!file.type.startsWith('image/')) {
                console.warn('Not an image file:', file.name);
                continue;
            }

            if (file.size > MAX_FILE_SIZE) {
                alert(`이미지 크기가 5MB를 초과합니다: ${file.name}`);
                continue;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.style.maxWidth = '100%';
                img.style.height = 'auto';

                const p = document.createElement('p');
                p.appendChild(img);

                const newP = document.createElement('p');
                newP.innerHTML = '<br>';

                const selection = window.getSelection();
                if (selection && selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const editor = document.getElementById('editor');
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

                // fallback if cursor is not in editor
                const editor = document.getElementById('editor');
                editor.appendChild(p);
                editor.appendChild(newP);

                const newRange = document.createRange();
                newRange.setStart(newP, 0);
                newRange.collapse(true);

                const selectionFallback = window.getSelection();
                selectionFallback.removeAllRanges();
                selectionFallback.addRange(newRange);
            };

            reader.onerror = function(error) {
                console.error('이미지 파일 읽기 실패:', error);
                alert('이미지 파일을 읽는 중 오류가 발생했습니다.');
            };

            reader.readAsDataURL(file);
        }
    }
});

window.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const isEdit = params.get('edit') === '1';
    if (isEdit) {
        const post = JSON.parse(localStorage.getItem('editPost'));
        if (post) {
            document.getElementById('title-input').value = post.title;
            document.getElementById('editor').innerHTML = post.content;
            document.getElementById('publish-btn').textContent = '수정 완료';
        }
    }
});