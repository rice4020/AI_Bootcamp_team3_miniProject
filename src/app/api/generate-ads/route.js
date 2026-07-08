import { NextResponse } from 'next/server';
import { GoogleGenAI, Type, Schema } from '@google/genai';

// Initialize the Google Gen AI SDK
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req) {
  try {
    const { weather, events, menu, spotName } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not set. Returning mock ads.");
      return NextResponse.json({
        success: true,
        ads: [
          `[Mock] 오늘 ${spotName} 날씨가 ${weather}네요! 맛있는 ${menu} 드시러 오세요!`,
          `[Mock] 주변에 ${events} 행사도 있다던데, 출출할 땐 ${menu} 어떠세요?`,
          `[Mock] ${spotName}에서 기다리고 있습니다. ${menu} 준비 완료!`
        ]
      });
    }

    const prompt = `당신은 센스있고 트렌디한 푸드트럭 마케팅 전문가입니다. 
사장님이 인스타그램이나 당근마켓 동네생활 등에 올릴 SNS 광고 문구를 3가지 다른 컨셉으로 작성해 주세요. 
이모지를 적절히 사용해서 시각적으로 돋보이게 만들어야 합니다.

[정보]
- 장소: ${spotName}
- 현재 날씨: ${weather}
- 주변 행사: ${events}
- 주력 메뉴: ${menu}

[컨셉 조건]
1. 첫 번째 문구: 오늘 '날씨'에 공감하며 감성적으로 어필하는 문구
2. 두 번째 문구: '주변 행사'나 지역 축제 구경꾼들을 타겟으로 한 유머러스한 문구
3. 세 번째 문구: '주력 메뉴'의 맛을 생생하게 묘사하며 당장 먹고싶게 만드는 정보전달형 문구

각 문구는 해시태그를 2~3개씩 포함해 주세요.`;

    // Response Schema to ensure we get an array of 3 strings
    const responseSchema = {
      type: Type.ARRAY,
      description: "List of 3 advertisement texts",
      items: {
        type: Type.STRING,
      },
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
        temperature: 0.7,
      }
    });

    // Parse the JSON string output
    let ads = [];
    try {
      ads = JSON.parse(response.text);
    } catch(e) {
      console.error("JSON parsing error", e);
      // Fallback fallback
      ads = [
        `오늘 ${spotName} 날씨가 ${weather}네요! 맛있는 ${menu} 드시러 오세요! 😋`,
        `주변에 ${events} 행사 오셨나요? 출출할 땐 ${menu} 어떠세요? 🏃‍♂️`,
        `${spotName}에서 기다리고 있습니다. 따끈한 ${menu} 준비 완료! 🔥`
      ];
    }

    return NextResponse.json({ success: true, ads });

  } catch (error) {
    console.error('Error generating ads:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate ads' }, { status: 500 });
  }
}
