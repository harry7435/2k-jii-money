import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/budget_provider.dart';
import '../../providers/category_provider.dart';
import '../../utils/formatters.dart';

class SetBudgetScreen extends ConsumerStatefulWidget {
  const SetBudgetScreen({super.key});

  @override
  ConsumerState<SetBudgetScreen> createState() => _SetBudgetScreenState();
}

class _SetBudgetScreenState extends ConsumerState<SetBudgetScreen> {
  final _amountController = TextEditingController();
  String? _selectedCategoryId;
  bool _isLoading = false;

  @override
  void dispose() {
    _amountController.dispose();
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

    setState(() => _isLoading = true);
    try {
      await ref.read(budgetsProvider.notifier).set(
            categoryId: _selectedCategoryId!,
            amount: amount,
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
        title: const Text('예산 설정'),
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
            Text('카테고리', style: theme.textTheme.titleSmall),
            const SizedBox(height: 8),
            categories.when(
              loading: () => const CircularProgressIndicator(),
              error: (e, _) => Text('오류: $e'),
              data: (cats) => Wrap(
                spacing: 8,
                runSpacing: 8,
                children: cats
                    .where((c) =>
                        !['급여', '기타수입'].contains(c.name))
                    .map(
                      (c) => FilterChip(
                        label: Text(c.name),
                        selected: c.id == _selectedCategoryId,
                        onSelected: (_) {
                          setState(
                              () => _selectedCategoryId = c.id);
                        },
                        avatar: CircleAvatar(
                          backgroundColor:
                              Color(colorFromHex(c.color))
                                  .withValues(alpha: 0.2),
                          child: Icon(Icons.category,
                              size: 14,
                              color: Color(colorFromHex(c.color))),
                        ),
                      ),
                    )
                    .toList(),
              ),
            ),
            const SizedBox(height: 24),
            TextField(
              controller: _amountController,
              decoration: const InputDecoration(
                labelText: '월 예산 금액',
                suffixText: '원',
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.number,
              style: theme.textTheme.headlineSmall,
            ),
          ],
        ),
      ),
    );
  }
}
