import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

// DB 주소가 없으면 모의 모드로 동작하도록 설정
export const IS_MOCK_MODE = !process.env.DATABASE_URL || process.env.DATABASE_URL.trim() === "";

if (IS_MOCK_MODE) {
  console.warn('⚠️  DATABASE_URL 환경변수가 없거나 비어있습니다. 모의(Mock) 데이터 모드로 동작합니다.');
}

// SQL 실행 객체 생성 (비어있으면 가짜 함수 전달)
export const sql = !IS_MOCK_MODE 
  ? neon(process.env.DATABASE_URL!) 
  : async (strings: any, ...values: any[]) => {
      // 쿼리 분석용 콘솔 로그 (디버깅용)
      const query = strings.reduce((acc: string, str: string, i: number) => acc + str + (values[i] !== undefined ? `$${i + 1}` : ''), '');
      // console.log(`[Mock SQL Run]: ${query}`);
      return [] as any; // 기본 빈 배열 반환
    };

