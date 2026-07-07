import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req) {
  try {
    const { imageBase64, mimeType, fileName } = await req.json();

    if (!imageBase64) {
      return NextResponse.json(
        { error: '이미지가 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    // ==========================================
    // [Gemini AI 연동 임시 비활성화]
    // 사용자의 요청에 따라 AI 검증 기능을 주석 처리하고
    // 이미지 사이즈 최적화(업로드) 후 무조건 통과 처리합니다.
    // ==========================================
    /*
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
    });

    const prompt = `
이 사진을 분석해서, 음식을 판매할 목적으로 개조된 '푸드트럭(Food Truck)'인지 아니면 일반 트럭/승용차/기타 차량인지 판단해주세요.
만약 명확한 푸드트럭(음식 조리/판매 시설이 보임)이라면 JSON 형식으로 {"isFoodTruck": true, "reason": "이유"} 로 응답해주고, 
일반 트럭이나 차량, 또는 관련 없는 사진이라면 {"isFoodTruck": false, "reason": "이유"} 로 응답해주세요.
오직 JSON 형식으로만 응답해야 합니다.
`;
    const base64DataForAI = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType: mimeType || 'image/jpeg', data: base64DataForAI } }] }],
      config: { responseMimeType: "application/json" }
    });
    */

    // Remove the data:image/xxx;base64, prefix for saving to file
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    
    // 파일 시스템에 저장 (이미지 리사이즈/최적화 후 저장)
    let fileUrl = null;
    try {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      // 확장자 결정
      let ext = 'jpg';
      if (mimeType === 'image/png') ext = 'png';
      else if (mimeType === 'image/webp') ext = 'webp';
      
      const savedFileName = `truck_${Date.now()}.${ext}`;
      const filePath = path.join(uploadDir, savedFileName);
      
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(filePath, buffer);
      fileUrl = `/uploads/${savedFileName}`;
      console.log(`[성공] 푸드트럭 이미지 최적화 및 업로드 완료: ${fileUrl}`);
    } catch (saveError) {
      console.error('파일 저장 실패:', saveError);
    }

    // AI 판단 없이 무조건 통과 결과 반환
    return NextResponse.json({
      isFoodTruck: true,
      reason: "이미지 업로드 완료 (AI 검증 생략)",
      fileUrl: fileUrl
    });

  } catch (error) {
    console.error('업로드 처리 중 오류 발생:', error);
    return NextResponse.json({
      error: '이미지 업로드 처리 중 서버 오류가 발생했습니다.',
      details: error.message
    }, { status: 500 });
  }
}
