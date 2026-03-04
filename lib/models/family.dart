class Family {
  final String id;
  final String familyCode;
  final DateTime createdAt;

  Family({
    required this.id,
    required this.familyCode,
    required this.createdAt,
  });

  factory Family.fromJson(Map<String, dynamic> json) {
    return Family(
      id: json['id'] as String,
      familyCode: json['family_code'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'family_code': familyCode,
      'created_at': createdAt.toIso8601String(),
    };
  }
}
