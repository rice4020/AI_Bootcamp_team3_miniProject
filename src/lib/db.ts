import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not defined. Please check your .env.local file.');
}

// SQL 쿼리를 실행할 수 있는 커넥션 객체 생성
export const sql = neon(process.env.DATABASE_URL);
