// Google Apps Script 웹앱 URL (실제 사용시 변경 필요)
const SCRIPT_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbwKf419HOph2rBS0aCHCZ18dUAKyik_xUv7VUcUIEB669lB9Vw8z0EYoDVa45HTlEZfEw/exec';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

$(document).ready(function() {
    // 이미지 파일 선택 시 미리보기
    $('#image-file').on('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        // 파일 유효성 검사
        if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 업로드 가능합니다.');
            this.value = '';
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            alert('파일 크기는 5MB를 초과할 수 없습니다.');
            this.value = '';
            return;
        }

        // 이미지 미리보기
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = $('#image-preview');
            preview.html(`<img src="${e.target.result}" alt="미리보기">`);
            preview.show();
        };
        reader.readAsDataURL(file);
    });

    // 폼 제출 이벤트 처리
    $('#writeForm').on('submit', async function(e) {
        e.preventDefault();

        // 로딩 상태 표시
        const submitBtn = $('.submit-btn');
        submitBtn.prop('disabled', true).text('저장 중...');

        try {
            // 이미지 파일이 있으면 먼저 업로드
            const imageFile = $('#image-file')[0].files[0];
            let imageUrl = '';
            
            if (imageFile) {
                imageUrl = await uploadImage(imageFile);
            }

            // 포스트 데이터 전송
            await sendPost({
                title: $('#title').val(),
                content: $('#content').val(),
                imageUrl: imageUrl,
                timestamp: new Date().toISOString()
            });

            alert('포스트가 성공적으로 저장되었습니다!');
            window.location.href = 'index.html';

        } catch (error) {
            console.error('Error:', error);
            alert('저장 중 오류가 발생했습니다. 다시 시도해주세요.');
            submitBtn.prop('disabled', false).text('작성완료');
        }
    });
});

// 이미지 업로드 함수
async function uploadImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async function() {
            try {
                const response = await fetch(`${SCRIPT_WEBAPP_URL}?filename=${encodeURIComponent(file.name)}&mimeType=${encodeURIComponent(file.type)}`, {
                    method: 'POST',
                    body: JSON.stringify([...new Int8Array(reader.result)])
                });

                if (!response.ok) throw new Error('이미지 업로드 실패');
                
                const result = await response.json();
                if (result.imageUrl) {
                    resolve(result.imageUrl);
                } else {
                    throw new Error('이미지 URL을 받지 못했습니다.');
                }
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => reject(new Error('파일 읽기 실패'));
        reader.readAsArrayBuffer(file);
    });
}

// 포스트 데이터 전송 함수
async function sendPost(postData) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: SCRIPT_WEBAPP_URL,
            method: 'POST',
            data: postData,
            success: resolve,
            error: reject
        });
    });
} 