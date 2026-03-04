enum TransactionType { income, expense }

class Transaction {
  final String id;
  final String familyId;
  final String memberId;
  final String categoryId;
  final TransactionType type;
  final int amount;
  final String? memo;
  final DateTime date;
  final DateTime createdAt;

  Transaction({
    required this.id,
    required this.familyId,
    required this.memberId,
    required this.categoryId,
    required this.type,
    required this.amount,
    this.memo,
    required this.date,
    required this.createdAt,
  });

  factory Transaction.fromJson(Map<String, dynamic> json) {
    return Transaction(
      id: json['id'] as String,
      familyId: json['family_id'] as String,
      memberId: json['member_id'] as String,
      categoryId: json['category_id'] as String,
      type: json['type'] == 'income'
          ? TransactionType.income
          : TransactionType.expense,
      amount: json['amount'] as int,
      memo: json['memo'] as String?,
      date: DateTime.parse(json['date'] as String),
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'family_id': familyId,
      'member_id': memberId,
      'category_id': categoryId,
      'type': type == TransactionType.income ? 'income' : 'expense',
      'amount': amount,
      'memo': memo,
      'date': date.toIso8601String().split('T').first,
      'created_at': createdAt.toIso8601String(),
    };
  }
}
