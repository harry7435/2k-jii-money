import 'package:uuid/uuid.dart';
import '../config/supabase_config.dart';
import '../models/category.dart';

class CategoryRepository {
  final _client = SupabaseConfig.client;
  final _uuid = const Uuid();

  static const List<Map<String, String>> defaultCategories = [
    {'name': '식비', 'icon': 'restaurant', 'color': '#FF6B6B'},
    {'name': '교통', 'icon': 'directions_car', 'color': '#4ECDC4'},
    {'name': '주거', 'icon': 'home', 'color': '#45B7D1'},
    {'name': '의료', 'icon': 'local_hospital', 'color': '#96CEB4'},
    {'name': '여가', 'icon': 'sports_esports', 'color': '#FFEAA7'},
    {'name': '쇼핑', 'icon': 'shopping_bag', 'color': '#DDA0DD'},
    {'name': '교육', 'icon': 'school', 'color': '#98D8C8'},
    {'name': '통신', 'icon': 'phone', 'color': '#F7DC6F'},
    {'name': '보험', 'icon': 'security', 'color': '#BB8FCE'},
    {'name': '급여', 'icon': 'account_balance_wallet', 'color': '#82E0AA'},
    {'name': '기타수입', 'icon': 'attach_money', 'color': '#85C1E9'},
    {'name': '기타지출', 'icon': 'more_horiz', 'color': '#AEB6BF'},
  ];

  Future<void> createDefaultCategories(String familyId) async {
    final categories = defaultCategories.map((c) {
      return {
        'id': _uuid.v4(),
        'family_id': familyId,
        'name': c['name'],
        'icon': c['icon'],
        'color': c['color'],
        'is_default': true,
      };
    }).toList();

    await _client.from('categories').insert(categories);
  }

  Future<List<Category>> getCategories(String familyId) async {
    final response = await _client
        .from('categories')
        .select()
        .eq('family_id', familyId)
        .order('is_default', ascending: false)
        .order('name');

    return response.map((e) => Category.fromJson(e)).toList();
  }

  Future<Category> addCategory(
    String familyId, {
    required String name,
    required String icon,
    required String color,
  }) async {
    final id = _uuid.v4();
    final data = {
      'id': id,
      'family_id': familyId,
      'name': name,
      'icon': icon,
      'color': color,
      'is_default': false,
    };

    await _client.from('categories').insert(data);
    return Category.fromJson(data);
  }

  Future<void> updateCategory(Category category) async {
    await _client
        .from('categories')
        .update(category.toJson())
        .eq('id', category.id);
  }

  Future<void> deleteCategory(String id) async {
    await _client.from('categories').delete().eq('id', id);
  }
}
