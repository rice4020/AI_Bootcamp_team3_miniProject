import { NextResponse } from 'next/server';

/**
 * 🚚 SNS 홍보 문구 자동생성을 위한 Claude API Route
 * Vercel 배포 시 API Key를 환경변수(`ANTHROPIC_API_KEY`)로 받아와 연동됩니다.
 */
export async function POST(request) {
  try {
    const { truckName, intro, menus, locationName } = await request.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // API Key가 없으면 Mock(모의) 응답을 반환하여 정상 빌드 유지
      return NextResponse.json({
        success: true,
        text: `🚚💨 [${truckName}] 실시간 영업 개시! 
📍 위치: ${locationName || '서울시청 광장 근처'}

${intro}

오늘의 대표 메뉴를 소개합니다! 👇
${menus && menus.length > 0 ? menus.map(m => `✨ ${m.name} - ${m.price.toLocaleString()}원`).join('\n') : '✨ 맛있는 수제 닭꼬치와 타코야끼'}

날씨도 좋은 오늘, 맛있는 푸드트럭 간식 먹고 힐링하시는 건 어떨까요? 
지금 바로 오셔서 대기 없이 따뜻하게 받아가세요! 💛

#푸드트럭 #맛집 #길거리음식 #맛집추천 #먹스타그램 #푸드스타그램 #일상 #실시간맛집`,
        isMock: true
      });
    }

    // 실제 Claude API 호출 로직 (API Key가 존재할 때)
    const prompt = `
당신은 마케팅 전문가이자 센스 넘치는 푸드트럭 사장님입니다. 
아래 정보를 기반으로 인스타그램 및 SNS에 즉시 업로드할 수 있는 맛깔나고 매력적인 홍보/공지 문구를 작성해 주세요.
해시태그를 포함하며, 줄바꿈과 이모지(Emoji)를 풍부하게 섞어 친근하고 식욕을 자극하는 문체로 만드세요.

[푸드트럭 정보]
- 이름: ${truckName}
- 위치: ${locationName}
- 한줄소개: ${intro}
- 판매메뉴: ${menus.map(m => `${m.name}(${m.price}원)`).join(', ')}
    `;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    const generatedText = data.content[0].text;

    return NextResponse.json({
      success: true,
      text: generatedText,
      isMock: false
    });

  } catch (error) {
    console.error("Claude API 호출 중 오류:", error);
    return NextResponse.json({
      success: false,
      error: "AI 홍보 문구 생성에 실패했습니다."
    }, { status: 500 });
  }
}
