import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../models/transaction.dart';
import '../../providers/transaction_provider.dart';
import '../../providers/category_provider.dart';
import '../../providers/family_provider.dart';
import '../../utils/formatters.dart';
import '../../widgets/transaction_tile.dart';
import 'add_transaction_screen.dart';

class TransactionListScreen extends ConsumerWidget {
  const TransactionListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final transactions = ref.watch(transactionsProvider);
    final categories = ref.watch(categoriesProvider);
    final selectedMonth = ref.watch(selectedMonthProvider);
    final family = ref.watch(familyProvider);
    final members = family != null
        ? ref.watch(membersProvider(family.id))
        : const AsyncValue<List<dynamic>>.data([]);

    return Scaffold(
      appBar: AppBar(
        title: const Text('내역'),
        centerTitle: true,
      ),
      body: Column(
        children: [
          // 월 선택 헤더
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                IconButton(
                  icon: const Icon(Icons.chevron_left),
                  onPressed: () {
                    final parts = selectedMonth.split('-');
                    final year = int.parse(parts[0]);
                    final month = int.parse(parts[1]);
                    final prev = month == 1
                        ? '${year - 1}-12'
                        : '$year-${(month - 1).toString().padLeft(2, '0')}';
                    ref.read(selectedMonthProvider.notifier).state = prev;
                  },
                ),
                Text(
                  formatYearMonth(selectedMonth),
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.chevron_right),
                  onPressed: () {
                    final parts = selectedMonth.split('-');
                    final year = int.parse(parts[0]);
                    final month = int.parse(parts[1]);
                    final next = month == 12
                        ? '${year + 1}-01'
                        : '$year-${(month + 1).toString().padLeft(2, '0')}';
                    ref.read(selectedMonthProvider.notifier).state = next;
                  },
                ),
              ],
            ),
          ),
          // 월간 요약
          _MonthlySummaryCard(ref: ref),
          const Divider(height: 1),
          // 거래 목록
          Expanded(
            child: transactions.when(
              loading: () =>
                  const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('오류: $e')),
              data: (txList) {
                if (txList.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.receipt_long,
                          size: 64,
                          color: theme.colorScheme.onSurfaceVariant
                              .withValues(alpha: 0.3),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          '이번 달 내역이 없습니다',
                          style: theme.textTheme.bodyLarge?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  );
                }

                // 날짜별 그룹핑
                final grouped = <String, List<Transaction>>{};
                for (final tx in txList) {
                  final key =
                      DateFormat('yyyy-MM-dd').format(tx.date);
                  grouped.putIfAbsent(key, () => []).add(tx);
                }

                final sortedKeys = grouped.keys.toList()..sort((a, b) => b.compareTo(a));

                return ListView.builder(
                  itemCount: sortedKeys.length,
                  itemBuilder: (context, index) {
                    final dateKey = sortedKeys[index];
                    final dayTxs = grouped[dateKey]!;
                    final date = DateTime.parse(dateKey);

                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(
                          padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
                          child: Text(
                            formatDate(date),
                            style: theme.textTheme.labelLarge?.copyWith(
                              color: theme.colorScheme.onSurfaceVariant,
                            ),
                          ),
                        ),
                        ...dayTxs.map((tx) {
                          final cat = categories.valueOrNull?.where(
                            (c) => c.id == tx.categoryId,
                          );
                          final mem = members.valueOrNull?.where(
                            (m) => m.id == tx.memberId,
                          );
                          return TransactionTile(
                            transaction: tx,
                            category: cat?.isNotEmpty == true
                                ? cat!.first
                                : null,
                            member: mem?.isNotEmpty == true
                                ? mem!.first
                                : null,
                          );
                        }),
                      ],
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
              builder: (_) => const AddTransactionScreen(),
            ),
          );
        },
        child: const Icon(Icons.add),
      ),
    );
  }
}

class _MonthlySummaryCard extends StatelessWidget {
  final WidgetRef ref;

  const _MonthlySummaryCard({required this.ref});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final summary = ref.watch(monthlySummaryProvider);

    return summary.when(
      loading: () => const SizedBox(height: 60),
      error: (_, __) => const SizedBox.shrink(),
      data: (data) {
        final income = data['income'] ?? 0;
        final expense = data['expense'] ?? 0;

        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  children: [
                    Text('수입', style: theme.textTheme.labelSmall),
                    const SizedBox(height: 4),
                    Text(
                      formatCurrency(income),
                      style: theme.textTheme.titleSmall?.copyWith(
                        color: theme.colorScheme.primary,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Column(
                  children: [
                    Text('지출', style: theme.textTheme.labelSmall),
                    const SizedBox(height: 4),
                    Text(
                      formatCurrency(expense),
                      style: theme.textTheme.titleSmall?.copyWith(
                        color: theme.colorScheme.error,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Column(
                  children: [
                    Text('잔액', style: theme.textTheme.labelSmall),
                    const SizedBox(height: 4),
                    Text(
                      formatCurrency(income - expense),
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
