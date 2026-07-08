import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { adText, spotName, username } = await req.json();

    // =====================================================================
    // [푸시 발송 구현 로직 삽입부]
    // 여기서 Aligo(문자), Solapi(카카오톡), Nodemailer(이메일) 등의 외부 API를 호출합니다.
    // 현재는 사용자의 요청에 따라 '사장님 본인에게 발송되는 Mock 동작'으로 대체합니다.
    // =====================================================================
    
    console.log(`\n=================================================`);
    console.log(`[PUSH NOTIFICATION 발송 시뮬레이션]`);
    console.log(`- 수신자(사장님 계정): ${username || '알 수 없음'}`);
    console.log(`- 발송 영업 장소: ${spotName}`);
    console.log(`- 최종 선택된 광고 문구:\n${adText}`);
    console.log(`=================================================\n`);

    // 실제 프로덕션 환경이라면 여기서 외부 서비스와의 통신 결과를 기다립니다.
    // const result = await sendSms({ to: ownerPhone, message: adText });
    
    // 강제로 1초 지연을 주어 실제 네트워크를 타는 느낌을 줍니다.
    await new Promise(resolve => setTimeout(resolve, 1000));

    return NextResponse.json({ 
      success: true, 
      message: '광고 문구가 성공적으로 사장님 연락처로 발송되었습니다.' 
    });

  } catch (error) {
    console.error('Error in push notification:', error);
    return NextResponse.json({ success: false, error: 'Failed to push notification' }, { status: 500 });
  }
}
