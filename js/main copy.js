// Google Visualization API 로드
google.charts.load('current', {'packages':['corechart']});
google.charts.setOnLoadCallback(initialize);

// 구글 시트 ID (실제 사용시 변경 필요)
const SHEET_ID = '1l2jYreTwsaCcsZzMp4hd_B6L09TVNRvwAf13_ZG7Iv8';
const SHEET_NAME = 'Posts'; // 시트 이름
const WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbwKf419HOph2rBS0aCHCZ18dUAKyik_xUv7VUcUIEB669lB9Vw8z0EYoDVa45HTlEZfEw/exec';
const CACHE_KEY = 'blog_posts_cache';
const CACHE_TIMESTAMP_KEY = 'blog_posts_cache_timestamp';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 5분 캐시 유효기간
const SYNC_INTERVAL = 3000; // 5초마다 동기화
const imageCache = new Map(); // 이미지 캐시

let allPosts = []; // 모든 포스트 데이터 저장
let mainContentCache = ''; // 메인 컨텐츠 캐시
let syncIntervalId = null; // 동기화 인터벌 ID

function initialize() {
    const hasCache = loadPostsFromCache();
    if (!hasCache) {
        fetchPosts();
    }
    setupSearch();
    
    // 주기적 동기화 시작
    startSync();
}

// 동기화 시작
function startSync() {
    // 이미 실행 중인 동기화가 있다면 중지
    if (syncIntervalId) {
        clearInterval(syncIntervalId);
    }
    
    // 새로운 동기화 시작
    syncIntervalId = setInterval(fetchPosts, SYNC_INTERVAL);
    
    // 페이지를 떠날 때 동기화 중지
    window.addEventListener('beforeunload', stopSync);
}

// 동기화 중지
function stopSync() {
    if (syncIntervalId) {
        clearInterval(syncIntervalId);
        syncIntervalId = null;
    }
}

function toggleLoading(show) {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

// 페이지 숨김/표시 상태 변경 시 동기화 제어
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopSync();
    } else {
        startSync();
    }
});

// 캐시에서 포스트 불러오기
function loadPostsFromCache() {
    const cachedData = localStorage.getItem(CACHE_KEY);
    const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    
    if (cachedData && cachedTimestamp) {
        const timestamp = parseInt(cachedTimestamp);
        const now = new Date().getTime();
        
        // 캐시가 유효한 경우
        if (now - timestamp < CACHE_DURATION) {
            try {
                allPosts = JSON.parse(cachedData);
                renderPosts(allPosts);
                handleInitialNavigation();
                return true;
            } catch (error) {
                console.error('캐시 데이터 파싱 실패:', error);
            }
        }
    }
    return false;
}

// 캐시에 포스트 저장
function savePostsToCache(posts) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(posts));
        localStorage.setItem(CACHE_TIMESTAMP_KEY, new Date().getTime().toString());
    } catch (error) {
        console.error('캐시 저장 실패:', error);
    }
}

function handleInitialNavigation() {
    const hash = window.location.hash;
    if (hash.startsWith('#post-')) {
        const index = parseInt(hash.replace('#post-', ''));
        if (!isNaN(index) && allPosts[index]) {
            showPostDetail(allPosts[index], index);
        }
    }
}

function fetchPosts() {
    // 로딩 인디케이터 표시
    const container = document.querySelector('.posts-container');
    if (!container.children.length) {
        container.innerHTML = '<div class="loading">포스트를 불러오는 중...</div>';
    }

    fetch(`${WEBAPP_URL}?type=json`)
        .then(response => {
            console.log('Raw response:', response);
            return response.json();
        })
        .then(data => {
            console.log('Received data:', data);
            if (data.status === 'success' && Array.isArray(data.data)) {
                const newPosts = data.data.filter(post => post && post.title && post.content);
                console.log('Filtered posts:', newPosts.length);
                
                // 새 포스트와 기존 포스트를 비교하여 변경사항이 있는 경우에만 업데이트
                const postsChanged = JSON.stringify(newPosts) !== JSON.stringify(allPosts);
                if (postsChanged) {
                    console.log('Posts changed, updating view');
                    allPosts = newPosts;
                    renderPosts(allPosts);
                    savePostsToCache(allPosts);
                    handleInitialNavigation();
                } else {
                    console.log('No changes in posts');
                }
            } else {
                console.error('Failed to fetch posts:', data);
                // 에러 발생 시 캐시된 데이터 표시
                if (!container.children.length) {
                    loadPostsFromCache();
                }
            }
        })
        .catch(error => {
            console.error('Error fetching posts:', error);
            // 네트워크 에러 시 캐시된 데이터 표시
            if (!container.children.length) {
                loadPostsFromCache();
            }
        });
}

function renderPosts(posts) {
    if (!Array.isArray(posts)) {
        console.error('Posts is not an array:', posts);
        return;
    }

    const container = document.querySelector('.posts-container');
    
    // 포스트를 최신순으로 정렬
    const sortedPosts = [...posts].sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    console.log('Total posts to render:', sortedPosts.length);
    
    container.innerHTML = sortedPosts.length ? '' : '<div class="no-posts">작성된 포스트가 없습니다.</div>';

    // 정렬된 포스트의 인덱스를 원본 배열의 인덱스와 매핑
    sortedPosts.forEach((post, displayIndex) => {
        const originalIndex = allPosts.findIndex(p => 
            p.title === post.title && 
            p.content === post.content && 
            p.timestamp === post.timestamp
        );
        console.log(`Rendering post ${displayIndex + 1}/${sortedPosts.length}, original index: ${originalIndex}`);
        const postCard = createPostCard(post, originalIndex);
        container.appendChild(postCard);
    });

    // 메인 컨텐츠 캐시 업데이트
    mainContentCache = document.querySelector('main').innerHTML;
}

// HTML에서 순수 텍스트 추출 함수
function extractTextFromHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    
    // h1 태그 제거
    const h1Elements = doc.getElementsByTagName('h1');
    while (h1Elements.length > 0) {
        h1Elements[0].remove();
    }
    
    return doc.body.textContent.trim() || "";
}

// 포스트 카드 HTML 생성
function createPostCard(post, index) {
    const content = extractTextFromHtml(post.content);
    const card = document.createElement('div');
    card.className = 'post-card';
    card.setAttribute('data-post-index', index);
    
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

                if (fileId && imageCache.has(fileId)) {
                    img.src = imageCache.get(fileId);
                } else if (fileId) {
                    const cachedUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
                    img.src = cachedUrl;
                    imageCache.set(fileId, cachedUrl);
                } else {
                    img.src = url.trim(); // fallback
                }
                img.loading = 'lazy';  // 지연 로딩
                img.alt = post.title;  // 이미지 대체 텍스트 추가
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
    text.textContent = content || '내용이 없습니다.';  // 내용이 없을 경우 대체 텍스트
    text.className = 'post-content';
    
    const date = document.createElement('span');
    date.textContent = new Date(post.timestamp).toLocaleDateString();
    date.className = 'post-date';
    
    contentDiv.appendChild(title);
    contentDiv.appendChild(text);
    contentDiv.appendChild(date);
    card.appendChild(contentDiv);
    
    // 카드 클릭 이벤트 추가
    card.addEventListener('click', () => {
        const postIndex = parseInt(card.getAttribute('data-post-index'));
        showPostDetail(post, postIndex);
    });
    
    return card;
}

// main.js에 삭제 및 수정 버튼 추가
function showPostDetail(post, index) {
    if (!mainContentCache) {
        mainContentCache = document.querySelector('main').innerHTML;
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
                <button class="edit-button" onclick="editPost(${index})">수정</button>
                <button class="delete-button" onclick='deletePost(${JSON.stringify(post)})'>삭제</button>
            </div>
        </div>
    `;

    document.querySelector('main').innerHTML = detailHTML;
    window.history.pushState({ type: 'post', index: index }, '', `#post-${index}`);
}

// 삭제 버튼 클릭 시 실행되는 함수
async function deletePost(post) {
    try {
        toggleLoading(true);
        console.log('[삭제 요청] timestamp:', post.timestamp);

        const res = await fetch(WEBAPP_URL, {
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
            location.href = './';
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

function editPost(index) {
    const post = allPosts[index];
    localStorage.setItem('editPost', JSON.stringify(post));
    window.location.href = 'write.html?edit=1';
}

// 브라우저 뒤로가기 처리
window.addEventListener('popstate', (event) => {
    if (!event.state || event.state.type !== 'post') {
        restoreMainContent();
    } else {
        const index = event.state.index;
        if (allPosts[index]) {
            showPostDetail(allPosts[index], index);
        } else {
            restoreMainContent();
        }
    }
});

// 메인 컨텐츠 복원
function restoreMainContent() {
    if (mainContentCache) {
        document.querySelector('main').innerHTML = mainContentCache;
        window.history.replaceState(null, '', window.location.pathname);
        
        // 포스트 카드 클릭 이벤트 다시 설정
        document.querySelectorAll('.post-card').forEach(card => {
            card.addEventListener('click', () => {
                const postIndex = parseInt(card.getAttribute('data-post-index'));
                if (!isNaN(postIndex) && allPosts[postIndex]) {
                    showPostDetail(allPosts[postIndex], postIndex);
                }
            });
        });
        
        setupSearch(); // 검색 기능 재설정
    } else {
        location.reload(); // 캐시가 없는 경우 페이지 새로고침
    }
}

function handleImageError(container) {
    const img = document.createElement('img');
    img.src = 'images/placeholder.png';
    img.alt = '이미지를 불러올 수 없습니다';
    img.className = 'placeholder-image';
    container.innerHTML = '';
    container.appendChild(img);
    container.className = 'image-wrapper placeholder';
}

// 검색 기능 설정
function setupSearch() {
    const searchInput = document.querySelector('#search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredPosts = allPosts.filter(post => 
                post.title.toLowerCase().includes(searchTerm) ||
                post.content.toLowerCase().includes(searchTerm)
            );
            renderPosts(filteredPosts);
            highlightSearchTerm(searchTerm);
        });
    }
}

// 검색어 하이라이트 함수
function highlightSearchTerm(searchTerm) {
    if (!searchTerm) return;
    
    const elements = document.querySelectorAll('.post-title, .post-content');
    elements.forEach(element => {
        const text = element.textContent;
        const regex = new RegExp(searchTerm, 'gi');
        element.innerHTML = text.replace(regex, match => `<mark>${match}</mark>`);
    });
}

// 검색 메뉴 동작
function initializeSearchMenu() {
    const searchToggleBtn = document.querySelector('.search-toggle-btn');
    const navRight = document.querySelector('.nav-right');
    const searchInput = document.querySelector('#search-input');
    
    if (searchToggleBtn && navRight) {
        // 검색 버튼 클릭 이벤트
        searchToggleBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            this.classList.toggle('active');
            navRight.classList.toggle('active');
            
            // 검색창이 열릴 때 자동으로 포커스
            if (navRight.classList.contains('active') && searchInput) {
                setTimeout(() => searchInput.focus(), 100);
            }
        });

        // 검색창 외부 클릭시 닫기
        document.addEventListener('click', function(e) {
            if (!navRight.contains(e.target) && !searchToggleBtn.contains(e.target)) {
                searchToggleBtn.classList.remove('active');
                navRight.classList.remove('active');
            }
        });

        // 검색창 클릭시 이벤트 전파 중단
        if (searchInput) {
            searchInput.addEventListener('click', (e) => {
                e.stopPropagation();
            });

            // ESC 키로 검색창 닫기
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    searchToggleBtn.classList.remove('active');
                    navRight.classList.remove('active');
                }
            });
        }
    }
}

// 페이지 로드시 초기화
document.addEventListener('DOMContentLoaded', () => {
    // Google Charts API가 이미 로드되어 있으므로 추가 작업 불필요
    initializeSearchMenu(); // 검색 메뉴 초기화
});
