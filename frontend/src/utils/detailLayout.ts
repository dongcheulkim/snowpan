// PC(lg~) 상세 화면 2단 배치 — 사진 왼쪽(스크롤해도 따라옴), 정보 오른쪽 (2026-10-05).
// 루트에 DETAIL_2COL, 사진 묶음에 DETAIL_PHOTO 를 붙인다. 첫 자식(뒤로가기 줄)은 두 칸을 다 쓰고, 나머지는 오른쪽 칸에 차례로 쌓인다.
// 폰·태블릿에서는 아무 영향이 없다 (전부 lg: 접두).
export const DETAIL_2COL = 'lg:max-w-5xl lg:grid lg:grid-cols-2 lg:gap-x-8 lg:items-start lg:min-h-[560px] lg:[&>*]:col-start-2 lg:[&>*:first-child]:!col-start-1 lg:[&>*:first-child]:!col-span-2';
// 사진 칸은 높이 0 으로 두고 내용만 아래로 흘려보낸다 — 높이를 가지면 그리드가 그 높이를 오른쪽 칸의 행들에 나눠 줘서 카드 사이가 벌어진다.
// 그래서 오른쪽 내용이 사진보다 짧을 때를 대비해 루트에 최소 높이를 준다.
export const DETAIL_PHOTO = 'lg:!col-start-1 lg:row-start-2 lg:row-span-[30] lg:sticky lg:top-24 lg:h-0 lg:!mt-5';
