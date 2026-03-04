import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../models/transaction.dart';
import '../../providers/transaction_provider.dart';
import '../../providers/category_provider.dart';
import '../../utils/formatters.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final transactions = ref.watch(transactionsProvider);
    final categories = ref.watch(categoriesProvider);
    final selectedMonth = ref.watch(selectedMonthProvider);
    final summary = ref.watch(monthlySummaryProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('대시보드'),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 월 표시
            Center(
              child: Text(
                formatYearMonth(selectedMonth),
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(height: 16),

            // 요약 카드
            summary.when(
              loading: () => const SizedBox.shrink(),
              error: (_, __) => const SizedBox.shrink(),
              data: (data) {
                final income = data['income'] ?? 0;
                final expense = data['expense'] ?? 0;

                return Row(
                  children: [
                    Expanded(
                      child: _SummaryCard(
                        title: '수입',
                        amount: income,
                        color: theme.colorScheme.primary,
                        icon: Icons.arrow_upward,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _SummaryCard(
                        title: '지출',
                        amount: expense,
                        color: theme.colorScheme.error,
                        icon: Icons.arrow_downward,
                      ),
                    ),
                  ],
                );
              },
            ),
            const SizedBox(height: 24),

            // 카테고리별 지출 파이 차트
            Text(
              '카테고리별 지출',
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            transactions.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Text('오류: $e'),
              data: (txList) {
                final expenses = txList
                    .where((t) => t.type == TransactionType.expense)
                    .toList();

                if (expenses.isEmpty) {
                  return SizedBox(
                    height: 200,
                    child: Center(
                      child: Text(
                        '지출 내역이 없습니다',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ),
                  );
                }

                // 카테고리별 집계
                final categoryTotals = <String, int>{};
                for (final tx in expenses) {
                  categoryTotals[tx.categoryId] =
                      (categoryTotals[tx.categoryId] ?? 0) + tx.amount;
                }

                final sortedEntries = categoryTotals.entries.toList()
                  ..sort((a, b) => b.value.compareTo(a.value));

                final totalExpense =
                    sortedEntries.fold<int>(0, (s, e) => s + e.value);

                final sections = sortedEntries.map((entry) {
                  final cat = categories.valueOrNull?.where(
                    (c) => c.id == entry.key,
                  );
                  final color = cat?.isNotEmpty == true
                      ? Color(colorFromHex(cat!.first.color))
                      : Colors.grey;
                  final percent = totalExpense > 0
                      ? (entry.value / totalExpense * 100)
                      : 0.0;

                  return PieChartSectionData(
                    color: color,
                    value: entry.value.toDouble(),
                    title: '${percent.toStringAsFixed(0)}%',
                    radius: 60,
                    titleStyle: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  );
                }).toList();

                return Column(
                  children: [
                    SizedBox(
                      height: 200,
                      child: PieChart(
                        PieChartData(
                          sections: sections,
                          centerSpaceRadius: 40,
                          sectionsSpace: 2,
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    // 범례
                    ...sortedEntries.map((entry) {
                      final cat = categories.valueOrNull?.where(
                        (c) => c.id == entry.key,
                      );
                      final color = cat?.isNotEmpty == true
                          ? Color(colorFromHex(cat!.first.color))
                          : Colors.grey;
                      final name = cat?.isNotEmpty == true
                          ? cat!.first.name
                          : '알 수 없음';
                      final percent = totalExpense > 0
                          ? (entry.value / totalExpense * 100)
                          : 0.0;

                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Row(
                          children: [
                            Container(
                              width: 12,
                              height: 12,
                              decoration: BoxDecoration(
                                color: color,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(child: Text(name)),
                            Text(
                              formatCurrency(entry.value),
                              style: theme.textTheme.bodyMedium?.copyWith(
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const SizedBox(width: 8),
                            SizedBox(
                              width: 45,
                              child: Text(
                                '${percent.toStringAsFixed(1)}%',
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: theme.colorScheme.onSurfaceVariant,
                                ),
                                textAlign: TextAlign.end,
                              ),
                            ),
                          ],
                        ),
                      );
                    }),
                  ],
                );
              },
            ),
            const SizedBox(height: 32),

            // 일별 지출 추이
            Text(
              '일별 지출 추이',
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            transactions.when(
              loading: () => const SizedBox.shrink(),
              error: (_, __) => const SizedBox.shrink(),
              data: (txList) {
                final expenses = txList
                    .where((t) => t.type == TransactionType.expense)
                    .toList();

                if (expenses.isEmpty) return const SizedBox.shrink();

                // 일별 집계
                final dailyTotals = <int, int>{};
                for (final tx in expenses) {
                  dailyTotals[tx.date.day] =
                      (dailyTotals[tx.date.day] ?? 0) + tx.amount;
                }

                final spots = dailyTotals.entries
                    .map((e) => FlSpot(
                          e.key.toDouble(),
                          e.value.toDouble(),
                        ))
                    .toList()
                  ..sort((a, b) => a.x.compareTo(b.x));

                if (spots.isEmpty) return const SizedBox.shrink();

                final maxY = spots
                    .map((s) => s.y)
                    .reduce((a, b) => a > b ? a : b);

                return SizedBox(
                  height: 200,
                  child: LineChart(
                    LineChartData(
                      gridData: const FlGridData(show: false),
                      titlesData: FlTitlesData(
                        topTitles: const AxisTitles(
                          sideTitles: SideTitles(showTitles: false),
                        ),
                        rightTitles: const AxisTitles(
                          sideTitles: SideTitles(showTitles: false),
                        ),
                        bottomTitles: AxisTitles(
                          sideTitles: SideTitles(
                            showTitles: true,
                            interval: 5,
                            getTitlesWidget: (value, _) => Text(
                              '${value.toInt()}일',
                              style: const TextStyle(fontSize: 10),
                            ),
                          ),
                        ),
                        leftTitles: const AxisTitles(
                          sideTitles: SideTitles(showTitles: false),
                        ),
                      ),
                      borderData: FlBorderData(show: false),
                      lineBarsData: [
                        LineChartBarData(
                          spots: spots,
                          isCurved: true,
                          color: theme.colorScheme.primary,
                          barWidth: 2,
                          dotData: const FlDotData(show: true),
                          belowBarData: BarAreaData(
                            show: true,
                            color:
                                theme.colorScheme.primary.withValues(alpha: 0.1),
                          ),
                        ),
                      ],
                      minY: 0,
                      maxY: maxY * 1.2,
                    ),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  final String title;
  final int amount;
  final Color color;
  final IconData icon;

  const _SummaryCard({
    required this.title,
    required this.amount,
    required this.color,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 16, color: color),
                const SizedBox(width: 4),
                Text(
                  title,
                  style: theme.textTheme.labelLarge?.copyWith(color: color),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              formatCurrency(amount),
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
