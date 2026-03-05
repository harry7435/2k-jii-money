export const DEFAULT_CATEGORIES = [
  { name: '식비', icon: 'restaurant', color: '#FF6B6B', isDefault: true },
  { name: '교통', icon: 'directions_car', color: '#4ECDC4', isDefault: true },
  { name: '주거', icon: 'home', color: '#45B7D1', isDefault: true },
  { name: '의료', icon: 'local_hospital', color: '#96CEB4', isDefault: true },
  { name: '여가', icon: 'sports_esports', color: '#FFEAA7', isDefault: true },
  { name: '쇼핑', icon: 'shopping_bag', color: '#DDA0DD', isDefault: true },
  { name: '교육', icon: 'school', color: '#98D8C8', isDefault: true },
  { name: '통신', icon: 'phone', color: '#F7DC6F', isDefault: true },
  { name: '보험', icon: 'security', color: '#BB8FCE', isDefault: true },
  { name: '급여', icon: 'payments', color: '#82E0AA', isDefault: true },
  { name: '기타수입', icon: 'add_circle', color: '#85C1E9', isDefault: true },
  { name: '기타지출', icon: 'remove_circle', color: '#AEB6BF', isDefault: true },
]

// 예산 설정에서 제외할 수입 카테고리
export const INCOME_CATEGORY_NAMES = ['급여', '기타수입']
