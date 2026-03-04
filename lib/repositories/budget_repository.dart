import 'package:uuid/uuid.dart';
import '../config/supabase_config.dart';
import '../models/budget.dart';

class BudgetRepository {
  final _client = SupabaseConfig.client;
  final _uuid = const Uuid();

  Future<List<Budget>> getBudgets(
    String familyId, {
    required String yearMonth,
  }) async {
    final response = await _client
        .from('budgets')
        .select()
        .eq('family_id', familyId)
        .eq('year_month', yearMonth);

    return response.map((e) => Budget.fromJson(e)).toList();
  }

  Future<Budget> setBudget({
    required String familyId,
    required String categoryId,
    required String yearMonth,
    required int amount,
  }) async {
    final existing = await _client
        .from('budgets')
        .select()
        .eq('family_id', familyId)
        .eq('category_id', categoryId)
        .eq('year_month', yearMonth)
        .maybeSingle();

    if (existing != null) {
      await _client
          .from('budgets')
          .update({'amount': amount}).eq('id', existing['id']);
      return Budget.fromJson({...existing, 'amount': amount});
    }

    final id = _uuid.v4();
    final now = DateTime.now();
    final data = {
      'id': id,
      'family_id': familyId,
      'category_id': categoryId,
      'year_month': yearMonth,
      'amount': amount,
      'created_at': now.toIso8601String(),
    };

    await _client.from('budgets').insert(data);
    return Budget.fromJson(data);
  }

  Future<void> deleteBudget(String id) async {
    await _client.from('budgets').delete().eq('id', id);
  }
}
