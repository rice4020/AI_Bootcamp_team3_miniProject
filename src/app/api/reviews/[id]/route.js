import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const REVIEWS_FILE = path.join(DATA_DIR, 'reviews.json');

// 리뷰 데이터 읽기
async function getReviewsData() {
  try {
    const fileContent = await fs.readFile(REVIEWS_FILE, 'utf-8');
    const data = JSON.parse(fileContent);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
}

// 리뷰 데이터 쓰기
async function saveReviewsData(data) {
  try {
    await fs.writeFile(REVIEWS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    return false;
  }
}

// DELETE /api/reviews/[id]: 특정 리뷰 삭제
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ success: false, error: '리뷰 ID가 누락되었습니다.' }, { status: 400 });
    }

    let reviews = await getReviewsData();
    const originalLength = reviews.length;
    reviews = reviews.filter(rev => rev.id !== id);

    if (reviews.length === originalLength) {
      return NextResponse.json({ success: false, error: '해당 리뷰를 찾을 수 없습니다.' }, { status: 404 });
    }

    const success = await saveReviewsData(reviews);
    if (success) {
      return NextResponse.json({ success: true, message: '리뷰가 정상적으로 삭제되었습니다.' });
    } else {
      return NextResponse.json({ success: false, error: '파일 저장 중 에러가 발생했습니다.' }, { status: 500 });
    }
  } catch (error) {
    console.error('리뷰 삭제 API 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
