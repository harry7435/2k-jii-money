// 카테고리 계층 트리 타입
export interface CategoryNode {
  name: string
  icon: string
  color: string
  isDefault: boolean
  isFixed?: boolean
  children?: CategoryNode[]
}

// 3단계 계층형 기본 카테고리
export const DEFAULT_CATEGORY_TREE: CategoryNode[] = [
  {
    name: '수입', icon: 'trending_up', color: '#82E0AA', isDefault: true,
    children: [
      {
        name: '수입', icon: 'payments', color: '#82E0AA', isDefault: true,
        children: [
          { name: '익준급여', icon: 'payments', color: '#82E0AA', isDefault: true },
          { name: '현지급여', icon: 'payments', color: '#82E0AA', isDefault: true },
          { name: '금융수입', icon: 'account_balance', color: '#85C1E9', isDefault: true },
          { name: '기타부수입', icon: 'add_circle', color: '#85C1E9', isDefault: true },
          { name: '부모님용돈', icon: 'volunteer_activism', color: '#82E0AA', isDefault: true },
        ],
      },
    ],
  },
  {
    name: '저축', icon: 'savings', color: '#45B7D1', isDefault: true,
    children: [
      {
        name: '저축', icon: 'savings', color: '#45B7D1', isDefault: true,
        children: [
          { name: '주택청약', icon: 'home', color: '#45B7D1', isDefault: true },
          { name: '연금', icon: 'elderly', color: '#45B7D1', isDefault: true },
          { name: '투자', icon: 'trending_up', color: '#45B7D1', isDefault: true },
          { name: '적금', icon: 'savings', color: '#45B7D1', isDefault: true },
          { name: '비상금', icon: 'shield', color: '#45B7D1', isDefault: true },
          { name: '대출상환', icon: 'money_off', color: '#45B7D1', isDefault: true },
        ],
      },
    ],
  },
  {
    name: '지출', icon: 'trending_down', color: '#FF6B6B', isDefault: true,
    children: [
      {
        name: '식비', icon: 'restaurant', color: '#FF6B6B', isDefault: true,
        children: [
          { name: '식재료', icon: 'grocery', color: '#FF6B6B', isDefault: true },
          { name: '함께 외식', icon: 'restaurant', color: '#FF6B6B', isDefault: true },
          { name: '간식', icon: 'cookie', color: '#FF6B6B', isDefault: true },
          { name: '현지 커피', icon: 'coffee', color: '#FF6B6B', isDefault: true },
          { name: '기타식비', icon: 'restaurant', color: '#FF6B6B', isDefault: true },
          { name: '익준 개인', icon: 'person', color: '#FF6B6B', isDefault: true },
          { name: '현지 개인', icon: 'person', color: '#FF6B6B', isDefault: true },
          { name: '함께 카페', icon: 'coffee', color: '#FF6B6B', isDefault: true },
        ],
      },
      {
        name: '생활', icon: 'home', color: '#4ECDC4', isDefault: true,
        children: [
          { name: '생필품', icon: 'cleaning_services', color: '#4ECDC4', isDefault: true },
          { name: '잡화', icon: 'category', color: '#4ECDC4', isDefault: true },
          { name: '화장품', icon: 'face', color: '#4ECDC4', isDefault: true },
          { name: '가구', icon: 'chair', color: '#4ECDC4', isDefault: true },
          { name: '미용실', icon: 'content_cut', color: '#4ECDC4', isDefault: true },
          { name: '용돈', icon: 'payments', color: '#4ECDC4', isDefault: true },
          { name: '기타생활비', icon: 'more_horiz', color: '#4ECDC4', isDefault: true },
        ],
      },
      {
        name: '꾸밈', icon: 'checkroom', color: '#DDA0DD', isDefault: true,
        children: [
          { name: '의류', icon: 'checkroom', color: '#DDA0DD', isDefault: true },
          { name: '화장품', icon: 'face', color: '#DDA0DD', isDefault: true },
          { name: '미용실', icon: 'content_cut', color: '#DDA0DD', isDefault: true },
          { name: '기타꾸밈', icon: 'more_horiz', color: '#DDA0DD', isDefault: true },
        ],
      },
      {
        name: '교통', icon: 'directions_bus', color: '#4ECDC4', isDefault: true,
        children: [
          { name: '대중교통', icon: 'directions_bus', color: '#4ECDC4', isDefault: true },
          { name: '택시', icon: 'local_taxi', color: '#4ECDC4', isDefault: true },
          { name: '철도', icon: 'train', color: '#4ECDC4', isDefault: true },
          { name: '기타교통비', icon: 'more_horiz', color: '#4ECDC4', isDefault: true },
        ],
      },
      {
        name: '자동차', icon: 'directions_car', color: '#F39C12', isDefault: true,
        children: [
          { name: '주유', icon: 'local_gas_station', color: '#F39C12', isDefault: true },
          { name: '주차/통행료', icon: 'local_parking', color: '#F39C12', isDefault: true },
          { name: '수리 등', icon: 'build', color: '#F39C12', isDefault: true },
          { name: '자동차세', icon: 'receipt', color: '#F39C12', isDefault: true },
          { name: '자동차보험', icon: 'security', color: '#F39C12', isDefault: true },
          { name: '벌금', icon: 'gavel', color: '#F39C12', isDefault: true },
          { name: '기타자동차관련', icon: 'more_horiz', color: '#F39C12', isDefault: true },
        ],
      },
      {
        name: '배드민턴', icon: 'sports_tennis', color: '#9B59B6', isDefault: true,
        children: [
          { name: '대관', icon: 'stadium', color: '#9B59B6', isDefault: true },
          { name: '입장료', icon: 'confirmation_number', color: '#9B59B6', isDefault: true },
          { name: '대기시간', icon: 'schedule', color: '#9B59B6', isDefault: true },
          { name: '대회출전', icon: 'emoji_events', color: '#9B59B6', isDefault: true },
          { name: '주차', icon: 'local_parking', color: '#9B59B6', isDefault: true },
          { name: '기타배드민턴', icon: 'more_horiz', color: '#9B59B6', isDefault: true },
        ],
      },
      {
        name: '주거', icon: 'apartment', color: '#45B7D1', isDefault: true, isFixed: true,
        children: [
          { name: '관리비', icon: 'apartment', color: '#45B7D1', isDefault: true },
          { name: '가스비', icon: 'local_fire_department', color: '#45B7D1', isDefault: true },
          { name: '전기세', icon: 'bolt', color: '#45B7D1', isDefault: true },
          { name: '수도세', icon: 'water_drop', color: '#45B7D1', isDefault: true },
          { name: '월세', icon: 'home', color: '#45B7D1', isDefault: true },
          { name: '기타주거비', icon: 'more_horiz', color: '#45B7D1', isDefault: true },
        ],
      },
      {
        name: '통신', icon: 'phone_android', color: '#F7DC6F', isDefault: true, isFixed: true,
        children: [
          { name: '휴대폰', icon: 'phone_android', color: '#F7DC6F', isDefault: true },
          { name: '인터넷/TV', icon: 'wifi', color: '#F7DC6F', isDefault: true },
          { name: '기타통신비', icon: 'more_horiz', color: '#F7DC6F', isDefault: true },
        ],
      },
      {
        name: '건강', icon: 'favorite', color: '#E74C3C', isDefault: true,
        children: [
          { name: '병원', icon: 'local_hospital', color: '#E74C3C', isDefault: true },
          { name: '약국', icon: 'medication', color: '#E74C3C', isDefault: true },
          { name: '건강식품', icon: 'nutrition', color: '#E74C3C', isDefault: true },
          { name: '운동', icon: 'fitness_center', color: '#E74C3C', isDefault: true },
          { name: '기타건강관리', icon: 'more_horiz', color: '#E74C3C', isDefault: true },
        ],
      },
      {
        name: '금융지출', icon: 'account_balance', color: '#BB8FCE', isDefault: true, isFixed: true,
        children: [
          { name: '보험료', icon: 'security', color: '#BB8FCE', isDefault: true },
          { name: '대출이자', icon: 'money_off', color: '#BB8FCE', isDefault: true },
          { name: '기타금융지출', icon: 'more_horiz', color: '#BB8FCE', isDefault: true },
        ],
      },
      {
        name: '문화여가', icon: 'theater_comedy', color: '#FFEAA7', isDefault: true,
        children: [
          { name: '영화관람', icon: 'movie', color: '#FFEAA7', isDefault: true },
          { name: '공연관람', icon: 'theater_comedy', color: '#FFEAA7', isDefault: true },
          { name: '카페', icon: 'coffee', color: '#FFEAA7', isDefault: true },
          { name: '도서', icon: 'menu_book', color: '#FFEAA7', isDefault: true },
          { name: '기타문화비', icon: 'more_horiz', color: '#FFEAA7', isDefault: true },
        ],
      },
      {
        name: '교육', icon: 'school', color: '#98D8C8', isDefault: true,
        children: [
          { name: '학원/강의', icon: 'school', color: '#98D8C8', isDefault: true },
          { name: '교재', icon: 'menu_book', color: '#98D8C8', isDefault: true },
          { name: '자녀교육', icon: 'child_care', color: '#98D8C8', isDefault: true },
          { name: '기타교육비', icon: 'more_horiz', color: '#98D8C8', isDefault: true },
        ],
      },
      {
        name: '자녀', icon: 'child_care', color: '#F1948A', isDefault: true,
        children: [
          { name: '육아용품', icon: 'child_friendly', color: '#F1948A', isDefault: true },
          { name: '돌봄비', icon: 'child_care', color: '#F1948A', isDefault: true },
          { name: '자녀식용품', icon: 'restaurant', color: '#F1948A', isDefault: true },
          { name: '가족외식', icon: 'restaurant', color: '#F1948A', isDefault: true },
          { name: '놀이/체험', icon: 'toys', color: '#F1948A', isDefault: true },
          { name: '기타양육비', icon: 'more_horiz', color: '#F1948A', isDefault: true },
        ],
      },
      {
        name: '경조선물', icon: 'redeem', color: '#C39BD3', isDefault: true,
        children: [
          { name: '축의/부의', icon: 'card_giftcard', color: '#C39BD3', isDefault: true },
          { name: '선물', icon: 'redeem', color: '#C39BD3', isDefault: true },
          { name: '가족축하', icon: 'celebration', color: '#C39BD3', isDefault: true },
          { name: '기타경조비', icon: 'more_horiz', color: '#C39BD3', isDefault: true },
        ],
      },
      {
        name: '여행', icon: 'flight', color: '#76D7C4', isDefault: true,
        children: [
          { name: '항공권', icon: 'flight', color: '#76D7C4', isDefault: true },
          { name: '숙박비', icon: 'hotel', color: '#76D7C4', isDefault: true },
          { name: '현지입장료', icon: 'confirmation_number', color: '#76D7C4', isDefault: true },
          { name: '기타여행비', icon: 'more_horiz', color: '#76D7C4', isDefault: true },
        ],
      },
      {
        name: '업무지출', icon: 'work', color: '#AEB6BF', isDefault: true,
        children: [
          { name: '교통비', icon: 'directions_car', color: '#AEB6BF', isDefault: true },
          { name: '식사', icon: 'restaurant', color: '#AEB6BF', isDefault: true },
          { name: '용품', icon: 'inventory_2', color: '#AEB6BF', isDefault: true },
          { name: '기타업무지출', icon: 'more_horiz', color: '#AEB6BF', isDefault: true },
        ],
      },
      {
        name: '기타', icon: 'more_horiz', color: '#BDC3C7', isDefault: true,
        children: [
          { name: '세금', icon: 'receipt_long', color: '#BDC3C7', isDefault: true },
          { name: '연간비', icon: 'calendar_month', color: '#BDC3C7', isDefault: true },
          { name: '기타업무처리', icon: 'more_horiz', color: '#BDC3C7', isDefault: true },
        ],
      },
    ],
  },
]

// 기본 거래출처
export const DEFAULT_PAYMENT_SOURCES = [
  { name: '신용카드1', isDefault: true },
  { name: '신용카드2', isDefault: true },
  { name: '신용카드3', isDefault: true },
  { name: '지역상품권', isDefault: true },
  { name: '온누리상품권', isDefault: true },
  { name: '현금', isDefault: true },
]

// 지출평가 라벨
export const EVALUATION_LABELS: Record<string, string> = {
  consumption: '소비',
  waste: '낭비',
  investment: '투자',
}

// 대분류별 거래 타입 매핑
export const MAJOR_CATEGORY_TYPE_MAP: Record<string, 'income' | 'expense' | 'savings'> = {
  '수입': 'income',
  '저축': 'savings',
  '지출': 'expense',
}
