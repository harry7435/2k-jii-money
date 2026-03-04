import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/budget_provider.dart';
import '../../providers/category_provider.dart';
import '../../providers/transaction_provider.dart';
import '../../models/transaction.dart';
import '../../utils/formatters.dart';
import '../../widgets/budget_progress_bar.dart';
import 'set_budget_screen.dart';

class BudgetScreen extends ConsumerWidget {
  const BudgetScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final budgets = ref.watch(budgetsProvider);
    final categories = ref.watch(categoriesProvider);
    final transactions = ref.watch(transactionsProvider);
    final selectedMonth = ref.watch(selectedMonthProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('예산'),
        centerTitle: true,
      ),
      body: Column(
        children: [
          // 월 표시
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              formatYearMonth(selectedMonth),
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          // 총 예산 요약
          budgets.when(
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
            data: (budgetList) {
              final totalBudget =
                  budgetList.fold<int>(0, (sum, b) => sum + b.amount);
              final totalSpent = transactions.valueOrNull
                      ?.where((t) => t.type == TransactionType.expense)
                      .fold<int>(0, (sum, t) => sum + t.amount) ??
                  0;

              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 16),
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      Text('총 예산', style: theme.textTheme.labelLarge),
                      const SizedBox(height: 4),
                      Text(
                        formatCurrency(totalBudget),
                        style: theme.textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          Column(
                            children: [
                              Text('사용', style: theme.textTheme.labelSmall),
                              Text(
                                formatCurrency(totalSpent),
                                style: theme.textTheme.bodyLarge?.copyWith(
                                  color: theme.colorScheme.error,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                          Column(
                            children: [
                              Text('남은 예산',
                                  style: theme.textTheme.labelSmall),
                              Text(
                                formatCurrency(totalBudget - totalSpent),
                                style: theme.textTheme.bodyLarge?.copyWith(
                                  color: totalBudget - totalSpent >= 0
                                      ? theme.colorScheme.primary
                                      : theme.colorScheme.error,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
          const SizedBox(height: 16),
          const Divider(height: 1),
          // 카테고리별 예산
          Expanded(
            child: budgets.when(
              loading: () =>
                  const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('오류: $e')),
              data: (budgetList) {
                if (budgetList.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.savings,
                          size: 64,
                          color: theme.colorScheme.onSurfaceVariant
                              .withValues(alpha: 0.3),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          '설정된 예산이 없습니다',
                          style: theme.textTheme.bodyLarge?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          '+ 버튼을 눌러 예산을 설정하세요',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  );
                }

                return ListView.builder(
                  itemCount: budgetList.length,
                  itemBuilder: (context, index) {
                    final budget = budgetList[index];
                    final category = categories.valueOrNull?.where(
                      (c) => c.id == budget.categoryId,
                    );
                    final spent = transactions.valueOrNull
                            ?.where((t) =>
                                t.type == TransactionType.expense &&
                                t.categoryId == budget.categoryId)
                            .fold<int>(0, (sum, t) => sum + t.amount) ??
                        0;

                    return BudgetProgressBar(
                      categoryName:
                          category?.isNotEmpty == true
                              ? category!.first.name
                              : '알 수 없음',
                      categoryColor:
                          category?.isNotEmpty == true
                              ? category!.first.color
                              : '#AEB6BF',
                      budgetAmount: budget.amount,
                      spentAmount: spent,
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => const SetBudgetScreen(),
            ),
          );
        },
        child: const Icon(Icons.add),
      ),
    );
  }
}
