// js/api.js

import { SCRIPT_WEBAPP_URL, MAX_FILE_SIZE } from './variables.js'; // variables.js에서 임포트
import { toggleLoading } from './dom.js'; // dom.js에서 임포트

// Base64 이미지를 File 객체로 변환
async function base64ToFile(dataUrl, filename) {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type });
}

// 이미지 ID를 썸네일 URL로 변환
export function convertToThumbnailUrl(fileId) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
}

// 구글 드라이브에 이미지 업로드
export async function uploadImage(file) {
    try {
        const reader = new FileReader();
        return new Promise((resolve, reject) => {
            reader.onload = async function () {
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

// 포스트 불러오기 (메인 페이지용)
export async function fetchPosts() {
    const container = document.querySelector('.posts-container');
    if (container && !container.children.length) { // container가 있을 때만 처리
        container.innerHTML = '<div class="loading">포스트를 불러오는 중...</div>';
    }

    try {
        const response = await fetch(`${SCRIPT_WEBAPP_URL}?type=json`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        if (data.status === 'success' && Array.isArray(data.data)) {
            return data.data.filter(post => post && post.title && post.content);
        } else {
            throw new Error(data.message || '포스트 불러오기 실패');
        }
    } catch (error) {
        console.error('Error fetching posts:', error);
        throw error; // Propagate error for cache fallback
    }
}

// 포스트 삭제 (메인 페이지용)
export async function deletePost(post) {
    try {
        toggleLoading(true);
        const res = await fetch(SCRIPT_WEBAPP_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8'
            },
            body: JSON.stringify({
                type: 'delete',
                timestamp: post.timestamp
            })
        });

        const resultText = await res.text();
        const result = JSON.parse(resultText);

        if (result.status === 'success') {
            alert('삭제가 완료되었습니다.');
            location.href = './'; // Refresh or navigate to main page
        } else {
            throw new Error(result.message || '삭제 실패');
        }
    } catch (err) {
        console.error('삭제 실패:', err);
        alert('삭제 실패: ' + err.message);
    } finally {
        toggleLoading(false);
    }
}

// 포스트 발행/수정 (작성 페이지용)
export async function publishOrUpdatePost(titleInput, editor) {
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
                    throw new Error(`이미지 크기가 ${MAX_FILE_SIZE / (1024 * 1024)}MB를 초과합니다: ${file.name}`);
                }

                const uploadedUrl = await uploadImage(file);
                uploadedUrls.push(uploadedUrl);
                img.src = uploadedUrl; // 에디터 내 이미지 URL 업데이트
                processedImages++;
            } else {
                uploadedUrls.push(img.src);
            }
        }

        const postData = {
            title: title,
            content: editor.innerHTML, // 업데이트된 이미지 URL이 포함된 내용 사용
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
}