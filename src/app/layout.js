import "./globals.css";

export const metadata = {
  title: "🚚 Yojari (요자리) - 내 주변 실시간 푸드트럭 탐색 플랫폼",
  description: "요자리(Yojari)에서 내 주변의 실시간 푸드트럭 위치, 메뉴, 재고 상태를 바로 확인하고 길찾기 기능으로 빠르게 찾아가세요. 푸드트럭 사장님들을 위한 스마트 영업 분석 도구도 지원합니다.",
};

import GlobalAlertModal from "@/components/GlobalAlertModal";

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <GlobalAlertModal />
        {children}
      </body>
    </html>
  );
}

