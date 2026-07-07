import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ success: false, message: '업로드된 파일이 없습니다.' }, { status: 400 });
    }

    // 파일 이름에 'fail' 또는 'not_truck' 이 포함되어 있으면 가짜 AI가 반려하는 로직 (수동 테스트용)
    const fileName = file.name.toLowerCase();
    if (fileName.includes('fail') || fileName.includes('not_truck')) {
      return NextResponse.json({ 
        success: false, 
        message: 'AI 검증 실패: 유효한 푸드트럭 사진이 아닙니다. 다시 시도해 주세요.' 
      }, { status: 400 });
    }

    // 실제로는 버킷이나 로컬 파일 시스템에 저장 후 해당 URL을 리턴함
    // 여기서는 파일 크기 최적화 및 업로드 성공 여부만 흉내냄 (Mock)
    console.log(`[AI Mock] 이미지 통과: ${fileName}, 사이즈: ${file.size} bytes`);
    
    // 가짜 URL 반환
    const fakeUrl = `/uploads/trucks/mock_${Date.now()}.jpg`;

    return NextResponse.json({ 
      success: true, 
      message: 'AI 검증 통과 및 업로드 완료', 
      url: fakeUrl 
    });

  } catch (error) {
    console.error('파일 업로드 에러:', error);
    return NextResponse.json({ success: false, message: '서버 에러가 발생했습니다.' }, { status: 500 });
  }
}
