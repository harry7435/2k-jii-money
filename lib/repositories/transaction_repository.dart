import 'package:uuid/uuid.dart';
import '../config/supabase_config.dart';
import '../models/transaction.dart';

class TransactionRepository {
  final _client = SupabaseConfig.client;
  final _uuid = const Uuid();

  Future<List<Transaction>> getTransactions(
    String familyId, {
    required String yearMonth,
  }) async {
    final startDate = '$yearMonth-01';
    final year = int.parse(yearMonth.split('-')[0]);
    final month = int.parse(yearMonth.split('-')[1]);
    final nextMonth = month == 12
        ? '${year + 1}-01-01'
        : '$year-${(month + 1).toString().padLeft(2, '0')}-01';

    final response = await _client
        .from('transactions')
        .select()
        .eq('family_id', familyId)
        .gte('date', startDate)
        .lt('date', nextMonth)
        .order('date', ascending: false)
        .order('created_at', ascending: false);

    return response.map((e) => Transaction.fromJson(e)).toList();
  }

  Future<Transaction> addTransaction({
    required String familyId,
    required String memberId,
    required String categoryId,
    required TransactionType type,
    required int amount,
    String? memo,
    required DateTime date,
  }) async {
    final id = _uuid.v4();
    final now = DateTime.now();
    final data = {
      'id': id,
      'family_id': familyId,
      'member_id': memberId,
      'category_id': categoryId,
      'type': type == TransactionType.income ? 'income' : 'expense',
      'amount': amount,
      'memo': memo,
      'date': date.toIso8601String().split('T').first,
      'created_at': now.toIso8601String(),
    };

    await _client.from('transactions').insert(data);
    return Transaction(
      id: id,
      familyId: familyId,
      memberId: memberId,
      categoryId: categoryId,
      type: type,
      amount: amount,
      memo: memo,
      date: date,
      createdAt: now,
    );
  }

  Future<void> updateTransaction(Transaction transaction) async {
    await _client
        .from('transactions')
        .update(transaction.toJson())
        .eq('id', transaction.id);
  }

  Future<void> deleteTransaction(String id) async {
    await _client.from('transactions').delete().eq('id', id);
  }

  Future<Map<String, int>> getMonthlySummary(
    String familyId, {
    required String yearMonth,
  }) async {
    final transactions = await getTransactions(familyId, yearMonth: yearMonth);

    int totalIncome = 0;
    int totalExpense = 0;
    for (final t in transactions) {
      if (t.type == TransactionType.income) {
        totalIncome += t.amount;
      } else {
        totalExpense += t.amount;
      }
    }

    return {'income': totalIncome, 'expense': totalExpense};
  }
}
