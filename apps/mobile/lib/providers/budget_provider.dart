import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/budget.dart';
import '../repositories/budget_repository.dart';
import 'family_provider.dart';
import 'transaction_provider.dart';

final budgetRepositoryProvider = Provider((_) => BudgetRepository());

final budgetsProvider =
    StateNotifierProvider<BudgetsNotifier, AsyncValue<List<Budget>>>(
  (ref) {
    final family = ref.watch(familyProvider);
    final yearMonth = ref.watch(selectedMonthProvider);
    return BudgetsNotifier(
      ref.read(budgetRepositoryProvider),
      family?.id,
      yearMonth,
    );
  },
);

class BudgetsNotifier extends StateNotifier<AsyncValue<List<Budget>>> {
  final BudgetRepository _repository;
  final String? _familyId;
  final String _yearMonth;

  BudgetsNotifier(this._repository, this._familyId, this._yearMonth)
      : super(const AsyncValue.loading()) {
    if (_familyId != null) {
      load();
    }
  }

  Future<void> load() async {
    if (_familyId == null) return;
    state = const AsyncValue.loading();
    try {
      final budgets = await _repository.getBudgets(
        _familyId,
        yearMonth: _yearMonth,
      );
      state = AsyncValue.data(budgets);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> set({
    required String categoryId,
    required int amount,
  }) async {
    if (_familyId == null) return;
    await _repository.setBudget(
      familyId: _familyId,
      categoryId: categoryId,
      yearMonth: _yearMonth,
      amount: amount,
    );
    await load();
  }

  Future<void> delete(String id) async {
    await _repository.deleteBudget(id);
    await load();
  }
}
