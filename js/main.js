// Google Visualization API 로드
google.charts.load('current', {'packages':['corechart']});
google.charts.setOnLoadCallback(initialize);

// 구글 시트 ID (실제 사용시 변경 필요)
const SHEET_ID = '1l2jYreTwsaCcsZzMp4hd_B6L09TVNRvwAf13_ZG7Iv8';
const SHEET_NAME = 'Posts'; // 시트 이름

function initialize() {
    fetchPosts();
}

function fetchPosts() {
    const query = new google.visualization.Query(
        `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${SHEET_NAME}`
    );
    
    query.send(handleQueryResponse);
}

function handleQueryResponse(response) {
    if (response.isError()) {
        console.error('Error in query: ' + response.getMessage());
        return;
    }

    const data = response.getDataTable();
    const posts = [];

    // 데이터 파싱
    for (let i = 0; i < data.getNumberOfRows(); i++) {
        posts.push({
            title: data.getValue(i, 0),      // A열: 제목
            content: data.getValue(i, 1),    // B열: 내용
            imageUrl: data.getValue(i, 2),   // C열: 이미지 URL
            timestamp: data.getValue(i, 3)    // D열: 작성일시
        });
    }

    // 포스트 카드 렌더링
    renderPosts(posts);
}

function renderPosts(posts) {
    const container = document.querySelector('.posts-container');
    container.innerHTML = ''; // 기존 내용 초기화

    posts.forEach(post => {
        const postCard = createPostCard(post);
        container.appendChild(postCard);
    });
}

function createPostCard(post) {
    const article = document.createElement('article');
    article.className = 'post-card';

    // 카드 HTML 구성
    article.innerHTML = `
        <img src="${post.imageUrl}" alt="${post.title}">
        <div class="post-card-content">
            <h2>${post.title}</h2>
            <p>${post.content}</p>
        </div>
    `;

    return article;
}

// 페이지 로드시 초기화
document.addEventListener('DOMContentLoaded', () => {
    // Google Charts API가 이미 로드되어 있으므로 추가 작업 불필요
}); 