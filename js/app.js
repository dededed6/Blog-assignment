// js/app.js (메인 페이지 전용 앱 로직)

// Google Visualization API 로드
google.charts.load('current', { 'packages': ['corechart'] });
google.charts.setOnLoadCallback(initialize);

// --- Imports ---
import { CACHE_KEY, CACHE_TIMESTAMP_KEY, CACHE_DURATION, SYNC_INTERVAL } from './variables.js'; // variables.js에서 임포트
import { toggleLoading, renderPosts, showPostDetail, restoreMainContent } from './dom.js'; // dom.js에서 임포트
import { fetchPosts, deletePost, convertToThumbnailUrl } from './api.js'; // api.js에서 임포트
import { setupSearch, initializeSearchMenu } from './search.js'; // search.js에서 임포트

// --- Global Variables ---
export let allPosts = []; // 모든 포스트 데이터 저장
export let mainContentCache = ''; // 메인 컨텐츠 캐시
export let syncIntervalId = null; // 동기화 인터벌 ID
export const imageCache = new Map(); // 이미지 캐시

function initialize() {
    const hasCache = loadPostsFromCache();
    if (!hasCache) {
        fetchPostsAndUpdate(); // fetchPosts()를 호출하고 UI를 업데이트하는 함수
    }
    setupSearch();
    startSync();
    initializeSearchMenu();
}

// 캐시에서 포스트 불러오기
function loadPostsFromCache() {
    const cachedData = localStorage.getItem(CACHE_KEY);
    const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

    if (cachedData && cachedTimestamp) {
        const timestamp = parseInt(cachedTimestamp);
        const now = new Date().getTime();

        if (now - timestamp < CACHE_DURATION) {
            try {
                allPosts.splice(0, allPosts.length, ...JSON.parse(cachedData)); // allPosts 업데이트
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

// fetchPosts를 호출하고 응답을 처리하는 로직
async function fetchPostsAndUpdate() {
    try {
        const newPosts = await fetchPosts(); // api.js의 fetchPosts 호출
        const postsChanged = JSON.stringify(newPosts) !== JSON.stringify(allPosts);
        if (postsChanged) {
            allPosts.splice(0, allPosts.length, ...newPosts);
            renderPosts(allPosts);
            savePostsToCache(allPosts);
            handleInitialNavigation();
        }
    } catch (error) {
        console.error('포스트 불러오기 및 업데이트 실패:', error);
        // 오류 발생 시 캐시된 데이터 표시를 시도
        const container = document.querySelector('.posts-container');
        if (container && !container.children.length) { // container가 있을 때만 처리
            loadPostsFromCache();
        }
    }
}

// 동기화 시작/중지 함수
function startSync() {
    if (syncIntervalId) {
        clearInterval(syncIntervalId);
    }
    syncIntervalId = setInterval(fetchPostsAndUpdate, SYNC_INTERVAL);
    window.addEventListener('beforeunload', stopSync);
}

function stopSync() {
    if (syncIntervalId) {
        clearInterval(syncIntervalId);
        syncIntervalId = null;
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

// 초기 URL 해시 처리
function handleInitialNavigation() {
    const hash = window.location.hash;
    if (hash.startsWith('#post-')) {
        const index = parseInt(hash.replace('#post-', ''));
        if (!isNaN(index) && allPosts[index]) {
            showPostDetail(allPosts[index], index);
        }
    }
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

// window에 전역 함수 노출
window.toggleLoading = toggleLoading; // dom.js에서 임포트한 함수를 전역으로 노출
window.editPost = (index) => {
    const post = allPosts[index];
    localStorage.setItem('editPost', JSON.stringify(post));
    window.location.href = 'write.html?edit=1';
};
window.deletePost = deletePost; // api.js에서 임포트한 deletePost를 전역으로 노출