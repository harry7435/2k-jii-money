import 'package:flutter/material.dart';
import '../models/transaction.dart';
import '../models/category.dart' as cat;
import '../models/member.dart';
import '../utils/formatters.dart';

class TransactionTile extends StatelessWidget {
  final Transaction transaction;
  final cat.Category? category;
  final Member? member;
  final VoidCallback? onTap;

  const TransactionTile({
    super.key,
    required this.transaction,
    this.category,
    this.member,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isExpense = transaction.type == TransactionType.expense;
    final amountColor = isExpense
        ? theme.colorScheme.error
        : theme.colorScheme.primary;

    return ListTile(
      onTap: onTap,
      leading: CircleAvatar(
        backgroundColor: category != null
            ? Color(colorFromHex(category!.color)).withValues(alpha: 0.2)
            : theme.colorScheme.surfaceContainerHighest,
        child: Icon(
          Icons.category,
          color: category != null
              ? Color(colorFromHex(category!.color))
              : theme.colorScheme.onSurfaceVariant,
          size: 20,
        ),
      ),
      title: Text(
        category?.name ?? '카테고리 없음',
        style: theme.textTheme.bodyLarge,
      ),
      subtitle: Text(
        [
          if (member != null) member!.nickname,
          if (transaction.memo != null && transaction.memo!.isNotEmpty)
            transaction.memo!,
        ].join(' · '),
        style: theme.textTheme.bodySmall?.copyWith(
          color: theme.colorScheme.onSurfaceVariant,
        ),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      trailing: Text(
        '${isExpense ? '-' : '+'}${formatCurrency(transaction.amount)}',
        style: theme.textTheme.bodyLarge?.copyWith(
          color: amountColor,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
