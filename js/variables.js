// 구글 sheets api url
export const SCRIPT_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbwKf419HOph2rBS0aCHCZ18dUAKyik_xUv7VUcUIEB669lB9Vw8z0EYoDVa45HTlEZfEw/exec';

// 글 목록 캐시
export const CACHE_KEY = 'blog_posts_cache';
export const CACHE_TIMESTAMP_KEY = 'blog_posts_cache_timestamp';
export const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days cache duration
export const SYNC_INTERVAL = 3000; // 3 seconds sync interval

// 이미지 업로드 제한
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_FILES = 10; // Max number of images that can be uploaded