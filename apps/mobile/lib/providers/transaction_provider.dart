import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../models/transaction.dart';
import '../repositories/transaction_repository.dart';
import 'family_provider.dart';

final transactionRepositoryProvider =
    Provider((_) => TransactionRepository());

final selectedMonthProvider = StateProvider<String>(
  (_) => DateFormat('yyyy-MM').format(DateTime.now()),
);

final transactionsProvider = StateNotifierProvider<TransactionsNotifier,
    AsyncValue<List<Transaction>>>(
  (ref) {
    final family = ref.watch(familyProvider);
    final yearMonth = ref.watch(selectedMonthProvider);
    return TransactionsNotifier(
      ref.read(transactionRepositoryProvider),
      family?.id,
      yearMonth,
    );
  },
);

final monthlySummaryProvider =
    FutureProvider<Map<String, int>>((ref) async {
  final family = ref.watch(familyProvider);
  final yearMonth = ref.watch(selectedMonthProvider);
  if (family == null) return {'income': 0, 'expense': 0};

  return ref
      .read(transactionRepositoryProvider)
      .getMonthlySummary(family.id, yearMonth: yearMonth);
});

class TransactionsNotifier
    extends StateNotifier<AsyncValue<List<Transaction>>> {
  final TransactionRepository _repository;
  final String? _familyId;
  final String _yearMonth;

  TransactionsNotifier(this._repository, this._familyId, this._yearMonth)
      : super(const AsyncValue.loading()) {
    if (_familyId != null) {
      load();
    }
  }

  Future<void> load() async {
    if (_familyId == null) return;
    state = const AsyncValue.loading();
    try {
      final transactions = await _repository.getTransactions(
        _familyId,
        yearMonth: _yearMonth,
      );
      state = AsyncValue.data(transactions);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> add({
    required String memberId,
    required String categoryId,
    required TransactionType type,
    required int amount,
    String? memo,
    required DateTime date,
  }) async {
    if (_familyId == null) return;
    await _repository.addTransaction(
      familyId: _familyId,
      memberId: memberId,
      categoryId: categoryId,
      type: type,
      amount: amount,
      memo: memo,
      date: date,
    );
    await load();
  }

  Future<void> update(Transaction transaction) async {
    await _repository.updateTransaction(transaction);
    await load();
  }

  Future<void> delete(String id) async {
    await _repository.deleteTransaction(id);
    await load();
  }
}
