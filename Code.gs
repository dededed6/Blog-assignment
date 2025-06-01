// CORS 및 HTTP 메소드 처리를 위한 헤더
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function doOptions(e) {
  const output = ContentService.createTextOutput("");
  output.setMimeType(ContentService.MimeType.TEXT);

  const origin = e?.parameter?.origin || e?.headers?.origin || "";
  const ALLOWED_ORIGINS = [
    "http://localhost:8080",
    "https://dededed6.github.io"
  ];

  if (ALLOWED_ORIGINS.includes(origin)) {
    output.setHeader("Access-Control-Allow-Origin", origin);
    output.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    output.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Requested-With");
    output.setHeader("Access-Control-Max-Age", "3600");
  }

  return output;
}

/**
 * POST 요청 처리
 * 이미지 업로드 또는 블로그 포스트 데이터 저장
 */
function doPost(e) {
  try {
    // 이미지 업로드 요청인지 확인
    if (e.parameter.filename && e.parameter.mimeType) {
      // 이미지 데이터 파싱
      const imageData = JSON.parse(e.postData.contents);
      const bytes = new Uint8Array(imageData);
      const blob = Utilities.newBlob(bytes, e.parameter.mimeType, e.parameter.filename);
      
      // 이미지를 Drive에 업로드
      const folder = DriveApp.getFolderById('1xVRHTe-umMt0oV4_nYSWoq5-XmTuyweB');
      const file = folder.createFile(blob);
      
      // 링크가 있는 사용자에게 보기 권한 부여
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      // 파일 ID만 반환
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        fileId: file.getId()
      })).setMimeType(ContentService.MimeType.JSON);
    } else {
      // 블로그 포스트 데이터 파싱
      const postData = JSON.parse(e.postData.contents);
      
      // 스프레드시트에 데이터 추가
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Posts");
      sheet.appendRow([
        postData.title,          // A열: 제목
        postData.content,        // B열: 내용
        postData.imageUrl,       // C열: 이미지 URL
        postData.timestamp       // D열: 작성일시
      ]);
      
      // 성공 응답
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "포스트가 성공적으로 저장되었습니다."
      })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    // 에러 로깅
    Logger.log('Error: ' + err.toString());
    // 에러 응답
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * GET 요청 처리
 */
function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Posts');
    const data = sheet.getDataRange().getValues();
    const posts = data.map(row => ({
      title: row[0],
      content: row[1],
      imageUrl: row[2],
      timestamp: row[3]
    }));

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      data: posts
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
