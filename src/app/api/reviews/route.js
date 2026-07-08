import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const REVIEWS_FILE = path.join(DATA_DIR, 'reviews.json');

// 리뷰 데이터 읽기
async function getReviewsData() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(REVIEWS_FILE);
    } catch {
      await fs.writeFile(REVIEWS_FILE, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }

    const fileContent = await fs.readFile(REVIEWS_FILE, 'utf-8');
    const data = JSON.parse(fileContent);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('리뷰 파일 읽기 에러:', error);
    return [];
  }
}

// 리뷰 데이터 쓰기
async function saveReviewsData(data) {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(REVIEWS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('리뷰 파일 쓰기 에러:', error);
    return false;
  }
}

// GET /api/reviews: 리뷰 조회
export async function GET() {
  const reviews = await getReviewsData();
  return NextResponse.json({ success: true, data: reviews });
}

// POST /api/reviews: 리뷰 등록
export async function POST(request) {
  try {
    const newReview = await request.json();
    if (!newReview || !newReview.name || !newReview.comment) {
      return NextResponse.json({ success: false, error: '방명록 양식이 부적합합니다.' }, { status: 400 });
    }

    const reviews = await getReviewsData();
    const formattedReview = {
      id: `rev-${Date.now()}`,
      name: newReview.name,
      stars: parseInt(newReview.stars) || 5,
      comment: newReview.comment,
      date: new Date().toISOString().split('T')[0] // YYYY-MM-DD
    };

    reviews.unshift(formattedReview); // 최신 리뷰가 맨 앞으로

    const success = await saveReviewsData(reviews);
    if (success) {
      return NextResponse.json({ success: true, data: formattedReview });
    } else {
      return NextResponse.json({ success: false, error: '파일 저장 중 에러 발생' }, { status: 500 });
    }
  } catch (error) {
    console.error('리뷰 등록 API 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
