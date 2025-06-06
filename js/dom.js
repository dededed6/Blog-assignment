import { deletePost, convertToThumbnailUrl } from './api.js';
import { setupSearch } from './search.js';

export function toggleLoading(show) {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

// HTML에서 순수 텍스트 추출 함수
function extractTextFromHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const h1Elements = doc.getElementsByTagName('h1');
    while (h1Elements.length > 0) {
        h1Elements[0].remove();
    }
    return doc.body.textContent.trim() || "";
}

export function renderPosts(posts) { // `allPosts`를 직접 임포트하지 않고 `posts` 인자로 받음
    if (!Array.isArray(posts)) {
        console.error('Posts is not an array:', posts);
        return;
    }

    const container = document.querySelector('.posts-container');
    if (!container) return; // container가 없을 경우 함수 종료

    const sortedPosts = [...posts].sort((a, b) =>
        new Date(b.timestamp) - new Date(a.timestamp)
    );

    container.innerHTML = sortedPosts.length ? '' : '<div class="no-posts">작성된 포스트가 없습니다.</div>';

    sortedPosts.forEach((post, displayIndex) => {
        const originalIndex = posts.findIndex(p =>
            p.title === post.title &&
            p.content === post.content &&
            p.timestamp === post.timestamp
        );
        const postCard = createPostCard(post, originalIndex); // originalIndex를 전달
        container.appendChild(postCard);
    });

    // 메인 컨텐츠 캐시 업데이트
}

// 포스트 카드 HTML 생성
function createPostCard(post, index) { // index를 인자로 받음
    const content = extractTextFromHtml(post.content);
    const card = document.createElement('div');
    card.className = 'post-card';
    card.setAttribute('data-post-index', index); // index 사용

    if (post.imageUrl) {
        const imageUrls = post.imageUrl.split(',');
        const imageContainer = document.createElement('div');
        imageContainer.className = 'post-images';

        imageUrls.forEach(url => {
            if (url.trim()) {
                const imgWrapper = document.createElement('div');
                imgWrapper.className = 'image-wrapper';

                const img = document.createElement('img');
                const fileIdMatch = url.trim().match(/id=([^&]+)/);
                const fileId = fileIdMatch ? fileIdMatch[1] : null;

                // `imageCache`는 `app.js`의 전역 변수이므로 `window.imageCache`로 접근
                if (fileId && window.imageCache && window.imageCache.has(fileId)) {
                    img.src = window.imageCache.get(fileId);
                } else if (fileId) {
                    const cachedUrl = convertToThumbnailUrl(fileId); // api.js의 함수 사용
                    img.src = cachedUrl;
                    if (window.imageCache) window.imageCache.set(fileId, cachedUrl); // 캐시 저장
                } else {
                    img.src = url.trim();
                }
                img.loading = 'lazy';
                img.alt = post.title;
                img.onerror = () => handleImageError(imgWrapper);
                imgWrapper.appendChild(img);
                imageContainer.appendChild(imgWrapper);
            }
        });
        card.appendChild(imageContainer);
    }

    const contentDiv = document.createElement('div');
    contentDiv.className = 'post-card-content';

    const title = document.createElement('h2');
    title.textContent = post.title;
    title.className = 'post-title';

    const text = document.createElement('p');
    text.textContent = content || '내용이 없습니다.';
    text.className = 'post-content';

    const date = document.createElement('span');
    date.textContent = new Date(post.timestamp).toLocaleDateString();
    date.className = 'post-date';

    contentDiv.appendChild(title);
    contentDiv.appendChild(text);
    contentDiv.appendChild(date);
    card.appendChild(contentDiv);

    card.addEventListener('click', () => {
        const postIndex = parseInt(card.getAttribute('data-post-index'));
        if (window.allPosts && window.allPosts[postIndex]) {
            showPostDetail(window.allPosts[postIndex], postIndex);
            console.log(`Post clicked: ${post.title} (index: ${postIndex})`); // 디버깅용 로그
        }
        console.log(`Post card clicked for index: ${index}`); // 디버깅용 로그
    });
    console.log(`Post card created for index: ${index}`); // 디버깅용 로그

    return card;
}

// 상세 포스트 보여주기 (index를 인자로 받도록 변경)
export function showPostDetail(post, index) {
    // `mainContentCache`는 `app.js`의 전역 변수이므로 `window.mainContentCache`로 접근
    if (!window.mainContentCache) {
        window.mainContentCache = document.querySelector('main').innerHTML;
    }

    const detailHTML = `
        <div class="post-detail">
            <div class="post-detail-header">
                <button class="back-button" onclick="window.history.back()">← 뒤로가기</button>
                <h1>${post.title}</h1>
                <p class="post-date">${new Date(post.timestamp).toLocaleDateString()}</p>
            </div>
            <div class="post-detail-content">
                <p>${post.content}</p>
            </div>
            <br>
            <div>
                <button class="edit-button" onclick="window.editPost(${index})">수정</button>
                <button class="delete-button" onclick='window.deletePost(${post.timestamp})'>삭제</button>
            </div>
        </div>
    `;

    document.querySelector('main').innerHTML = detailHTML;
    window.history.pushState({ type: 'post', index: index }, '', `#post-${index}`);
}

// 메인 컨텐츠 복원
export function restoreMainContent() {
    if (window.mainContentCache) { // `window.mainContentCache`로 접근
        document.querySelector('main').innerHTML = window.mainContentCache;
        window.history.replaceState(null, '', window.location.pathname);

        document.querySelectorAll('.post-card').forEach(card => {
            card.addEventListener('click', () => {
                const postIndex = parseInt(card.getAttribute('data-post-index'));
                // `allPosts`는 `app.js`의 전역 변수이므로 `window.allPosts`로 접근
                if (!isNaN(postIndex) && window.allPosts && window.allPosts[postIndex]) {
                    showPostDetail(window.allPosts[postIndex], postIndex);
                }
            });
        });

        setupSearch(); // search.js의 setupSearch 함수 사용
    } else {
        location.reload();
    }
}

export function handleImageError(container) {
    const img = document.createElement('img');
    img.src = 'images/placeholder.png';
    img.alt = '이미지를 불러올 수 없습니다';
    img.className = 'placeholder-image';
    container.innerHTML = '';
    container.appendChild(img);
    container.className = 'image-wrapper placeholder';
}