import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../models/transaction.dart';
import '../../models/category.dart' as cat;
import '../../providers/transaction_provider.dart';
import '../../providers/category_provider.dart';
import '../../providers/family_provider.dart';
import '../../utils/formatters.dart';

class AddTransactionScreen extends ConsumerStatefulWidget {
  const AddTransactionScreen({super.key});

  @override
  ConsumerState<AddTransactionScreen> createState() =>
      _AddTransactionScreenState();
}

class _AddTransactionScreenState extends ConsumerState<AddTransactionScreen> {
  TransactionType _type = TransactionType.expense;
  final _amountController = TextEditingController();
  final _memoController = TextEditingController();
  String? _selectedCategoryId;
  DateTime _selectedDate = DateTime.now();
  bool _isLoading = false;

  @override
  void dispose() {
    _amountController.dispose();
    _memoController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final amountText = _amountController.text.replaceAll(',', '');
    final amount = int.tryParse(amountText);
    if (amount == null || amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('금액을 입력하세요')),
      );
      return;
    }
    if (_selectedCategoryId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('카테고리를 선택하세요')),
      );
      return;
    }

    final member = ref.read(currentMemberProvider);
    if (member == null) return;

    setState(() => _isLoading = true);
    try {
      await ref.read(transactionsProvider.notifier).add(
            memberId: member.id,
            categoryId: _selectedCategoryId!,
            type: _type,
            amount: amount,
            memo: _memoController.text.trim().isEmpty
                ? null
                : _memoController.text.trim(),
            date: _selectedDate,
          );
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('오류: $e')),
        );
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final categories = ref.watch(categoriesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('내역 추가'),
        actions: [
          TextButton(
            onPressed: _isLoading ? null : _submit,
            child: _isLoading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('저장'),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 수입/지출 토글
            SegmentedButton<TransactionType>(
              segments: const [
                ButtonSegment(
                  value: TransactionType.expense,
                  label: Text('지출'),
                  icon: Icon(Icons.arrow_downward),
                ),
                ButtonSegment(
                  value: TransactionType.income,
                  label: Text('수입'),
                  icon: Icon(Icons.arrow_upward),
                ),
              ],
              selected: {_type},
              onSelectionChanged: (set) {
                setState(() => _type = set.first);
              },
            ),
            const SizedBox(height: 24),

            // 금액 입력
            TextField(
              controller: _amountController,
              decoration: const InputDecoration(
                labelText: '금액',
                suffixText: '원',
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.number,
              style: theme.textTheme.headlineSmall,
              autofocus: true,
            ),
            const SizedBox(height: 24),

            // 날짜 선택
            ListTile(
              leading: const Icon(Icons.calendar_today),
              title: Text(formatDate(_selectedDate)),
              trailing: const Icon(Icons.chevron_right),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: BorderSide(color: theme.colorScheme.outlineVariant),
              ),
              onTap: () async {
                final date = await showDatePicker(
                  context: context,
                  initialDate: _selectedDate,
                  firstDate: DateTime(2020),
                  lastDate: DateTime.now().add(const Duration(days: 365)),
                );
                if (date != null) {
                  setState(() => _selectedDate = date);
                }
              },
            ),
            const SizedBox(height: 24),

            // 카테고리 선택
            Text('카테고리', style: theme.textTheme.titleSmall),
            const SizedBox(height: 8),
            categories.when(
              loading: () => const CircularProgressIndicator(),
              error: (e, _) => Text('오류: $e'),
              data: (cats) => Wrap(
                spacing: 8,
                runSpacing: 8,
                children: cats.map((c) => _CategoryChip(
                  category: c,
                  selected: c.id == _selectedCategoryId,
                  onTap: () {
                    setState(() => _selectedCategoryId = c.id);
                  },
                )).toList(),
              ),
            ),
            const SizedBox(height: 24),

            // 메모
            TextField(
              controller: _memoController,
              decoration: const InputDecoration(
                labelText: '메모 (선택)',
                border: OutlineInputBorder(),
              ),
              maxLines: 2,
            ),
          ],
        ),
      ),
    );
  }
}

class _CategoryChip extends StatelessWidget {
  final cat.Category category;
  final bool selected;
  final VoidCallback onTap;

  const _CategoryChip({
    required this.category,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final color = Color(colorFromHex(category.color));

    return FilterChip(
      label: Text(category.name),
      selected: selected,
      onSelected: (_) => onTap(),
      avatar: CircleAvatar(
        backgroundColor: color.withValues(alpha: 0.2),
        child: Icon(Icons.category, size: 14, color: color),
      ),
      selectedColor: color.withValues(alpha: 0.2),
      checkmarkColor: color,
    );
  }
}
