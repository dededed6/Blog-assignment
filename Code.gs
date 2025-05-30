// CORS 및 HTTP 메소드 처리를 위한 헤더
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

/**
 * POST 요청 처리
 * 블로그 포스트 데이터를 스프레드시트에 저장하거나 이미지를 Drive에 업로드
 */
function doPost(e) {
  try {
    // 이미지 업로드 요청인지 확인
    if (e.parameter.filename && e.parameter.mimeType) {
      return handleImageUpload(e);
    }
    
    // 일반 포스트 데이터 저장
    const data = {
      title: e.parameter.title,
      content: e.parameter.content,
      imageUrl: e.parameter.imageUrl,
      timestamp: e.parameter.timestamp
    };
    
    // 스프레드시트에 데이터 추가
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Posts");
    sheet.appendRow([
      data.title,          // A열: 제목
      data.content,        // B열: 내용
      data.imageUrl,       // C열: 이미지 URL
      data.timestamp       // D열: 작성일시
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ 
        status: "success",
        message: "포스트가 성공적으로 저장되었습니다."
      }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders(CORS_HEADERS);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ 
        status: "error",
        message: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders(CORS_HEADERS);
  }
}

/**
 * 이미지 업로드 처리
 */
function handleImageUpload(e) {
  try {
    // 이미지 데이터 파싱
    const imageData = JSON.parse(e.postData.contents);
    const bytes = new Uint8Array(imageData);
    const blob = Utilities.newBlob(bytes, e.parameter.mimeType, e.parameter.filename);
    
    // 이미지를 Drive에 업로드
    const folder = DriveApp.getFolderById('1xVRHTe-umMt0oV4_nYSWoq5-XmTuyweB'); // 실제 폴더 ID로 변경 필요
    const file = folder.createFile(blob);
    
    // 공개 액세스 설정
    file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
    
    // 이미지 URL 생성 (Google Drive 직접 링크)
    const imageUrl = `https://drive.google.com/uc?id=${file.getId()}`;
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        status: "success",
        imageUrl: imageUrl
      }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders(CORS_HEADERS);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ 
        status: "error",
        message: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders(CORS_HEADERS);
  }
}

/**
 * GET 요청 처리
 * 간단한 상태 메시지 반환
 */
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: "active",
      message: "API is running. Use POST to submit data."
    }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders(CORS_HEADERS);
}

/**
 * OPTIONS 요청 처리 (CORS preflight)
 */
function doOptions(e) {
  return ContentService
    .createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeaders(CORS_HEADERS);
} 