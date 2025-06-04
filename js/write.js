// js/write.js (작성 페이지 전용 앱 로직)

// --- Imports ---
import { toggleLoading } from './dom.js'; // dom.js에서 임포트
import { publishOrUpdatePost } from './api.js'; // api.js에서 publishOrUpdatePost 임포트
import { applyFormat, handleCodeBlockKeydown, setupEditorEnterKey } from './editor.js'; // editor.js에서 임포트
import { handleImageFiles } from './image_manager.js'; // image_manager.js에서 임포트

export let savedRange = null; // To preserve selection for formatting

document.addEventListener('DOMContentLoaded', function () {
    const editor = document.getElementById('editor');
    const titleInput = document.getElementById('title-input');
    const publishBtn = document.getElementById('publish-btn');
    const imageUpload = document.getElementById('image-upload');
    const formatBtn = document.getElementById('format-btn');
    const formatMenu = document.querySelector('.format-menu');
    const formatItems = document.querySelectorAll('.format-item');
    const floatingMenu = document.querySelector('.floating-menu');

    if (floatingMenu) {
        floatingMenu.style.opacity = '1';
        floatingMenu.style.visibility = 'visible';
    }

    // --- Event Listeners ---
    formatBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            savedRange = selection.getRangeAt(0);
        }
        editor.focus();
        formatMenu.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!formatMenu.contains(e.target) && !formatBtn.contains(e.target)) {
            formatMenu.classList.remove('active');
        }
    });

    formatItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const format = item.getAttribute('data-format');

            if (savedRange) {
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(savedRange);
            }
            editor.focus();

            applyFormat(format, editor, imageUpload);
        });
    });

    setupEditorEnterKey(editor);

    editor.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.stopPropagation();
        this.style.backgroundColor = 'rgba(18, 184, 134, 0.05)';
    });

    editor.addEventListener('dragleave', function (e) {
        e.preventDefault();
        e.stopPropagation();
        this.style.backgroundColor = '';
    });

    editor.addEventListener('drop', function (e) {
        e.preventDefault();
        e.stopPropagation();
        this.style.backgroundColor = '';
        handleImageFiles(e.dataTransfer.files, editor);
    });

    editor.addEventListener('paste', function (e) {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;

        for (const item of items) {
            if (item.type.indexOf('image') === 0) {
                const file = item.getAsFile();
                handleImageFiles([file], editor);
                e.preventDefault();
                break;
            }
        }
    });

    imageUpload.addEventListener('change', (e) => {
        handleImageFiles(e.target.files, editor);
        e.target.value = '';
    });

    publishBtn.addEventListener('click', async function () {
        await publishOrUpdatePost(titleInput, editor); // api.js의 publishOrUpdatePost 호출
    });

    // --- Edit Mode Initialization ---
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

    if (!editor.querySelector('p')) {
        editor.innerHTML = '<p><br></p>';
    }
});

// window에 전역 함수 노출 (HTML 인라인 이벤트 핸들러용)
window.toggleLoading = toggleLoading;
window.handleCodeBlockKeydown = handleCodeBlockKeydown; // 에디터 특정 이벤트 핸들러