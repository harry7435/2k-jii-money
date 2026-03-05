import 'package:flutter/material.dart';
import '../utils/formatters.dart';

class BudgetProgressBar extends StatelessWidget {
  final String categoryName;
  final String categoryColor;
  final int budgetAmount;
  final int spentAmount;

  const BudgetProgressBar({
    super.key,
    required this.categoryName,
    required this.categoryColor,
    required this.budgetAmount,
    required this.spentAmount,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = Color(colorFromHex(categoryColor));
    final ratio = budgetAmount > 0 ? spentAmount / budgetAmount : 0.0;
    final isOver = ratio > 1.0;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                categoryName,
                style: theme.textTheme.bodyLarge?.copyWith(
                  fontWeight: FontWeight.w500,
                ),
              ),
              Text(
                '${formatCurrency(spentAmount)} / ${formatCurrency(budgetAmount)}',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: isOver
                      ? theme.colorScheme.error
                      : theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: ratio.clamp(0.0, 1.0),
              backgroundColor: color.withValues(alpha: 0.15),
              valueColor: AlwaysStoppedAnimation(
                isOver ? theme.colorScheme.error : color,
              ),
              minHeight: 8,
            ),
          ),
          if (isOver) ...[
            const SizedBox(height: 4),
            Text(
              '${formatCurrency(spentAmount - budgetAmount)} 초과',
              style: theme.textTheme.labelSmall?.copyWith(
                color: theme.colorScheme.error,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
