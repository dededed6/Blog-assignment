import { toggleLoading } from './dom.js';
import { publishOrUpdatePost } from './api.js';
import { applyFormat } from './editor.js';
import { handleImageFiles } from './image_manager.js';

export let savedRange = null; // 서식 입력시 선택 영역 저장용

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

    // 서식 메뉴
    formatBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            savedRange = selection.getRangeAt(0); //  선택 영역 저장
        }
        formatMenu.classList.toggle('active'); // 메뉴 표시
    });

    // 서식 메뉴 외부 클릭 시 메뉴 닫기
    document.addEventListener('click', (e) => {
        if (!formatMenu.contains(e.target) && !formatBtn.contains(e.target)) {
            formatMenu.classList.remove('active');
        }
    });

    // 서식 입력
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

    // 드래그 앤 드롭
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
        await publishOrUpdatePost(titleInput, editor); // 업로드
    });

    // 수정 모드일 때 에디터 초기화
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
        editor.innerHTML = '<p></p>';
    }
});

// window에 전역 함수 노출 (HTML 인라인 이벤트 핸들러용)
window.toggleLoading = toggleLoading;