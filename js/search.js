// js/search.js

import { allPosts } from './app.js'; // app.js의 allPosts를 임포트
import { renderPosts } from './dom.js'; // dom.js에서 renderPosts 임포트

// 검색 기능 설정
export function setupSearch() {
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
export function highlightSearchTerm(searchTerm) {
    if (!searchTerm) return;

    const elements = document.querySelectorAll('.post-title, .post-content');
    elements.forEach(element => {
        const text = element.textContent;
        const regex = new RegExp(searchTerm, 'gi');
        element.innerHTML = text.replace(regex, match => `<mark>${match}</mark>`);
    });
}

// 검색 메뉴 동작
export function initializeSearchMenu() {
    const searchToggleBtn = document.querySelector('.search-toggle-btn');
    const navRight = document.querySelector('.nav-right');
    const searchInput = document.querySelector('#search-input');

    if (searchToggleBtn && navRight) {
        searchToggleBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            this.classList.toggle('active');
            navRight.classList.toggle('active');

            if (navRight.classList.contains('active') && searchInput) {
                setTimeout(() => searchInput.focus(), 100);
            }
        });

        document.addEventListener('click', function (e) {
            if (!navRight.contains(e.target) && !searchToggleBtn.contains(e.target)) {
                searchToggleBtn.classList.remove('active');
                navRight.classList.remove('active');
            }
        });

        if (searchInput) {
            searchInput.addEventListener('click', (e) => {
                e.stopPropagation();
            });

            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    searchToggleBtn.classList.remove('active');
                    navRight.classList.remove('active');
                }
            });
        }
    }
}