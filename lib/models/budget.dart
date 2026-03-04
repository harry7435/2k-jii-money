class Budget {
  final String id;
  final String familyId;
  final String categoryId;
  final String yearMonth;
  final int amount;
  final DateTime createdAt;

  Budget({
    required this.id,
    required this.familyId,
    required this.categoryId,
    required this.yearMonth,
    required this.amount,
    required this.createdAt,
  });

  factory Budget.fromJson(Map<String, dynamic> json) {
    return Budget(
      id: json['id'] as String,
      familyId: json['family_id'] as String,
      categoryId: json['category_id'] as String,
      yearMonth: json['year_month'] as String,
      amount: json['amount'] as int,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'family_id': familyId,
      'category_id': categoryId,
      'year_month': yearMonth,
      'amount': amount,
      'created_at': createdAt.toIso8601String(),
    };
  }
}
