class Member {
  final String id;
  final String familyId;
  final String nickname;
  final DateTime createdAt;

  Member({
    required this.id,
    required this.familyId,
    required this.nickname,
    required this.createdAt,
  });

  factory Member.fromJson(Map<String, dynamic> json) {
    return Member(
      id: json['id'] as String,
      familyId: json['family_id'] as String,
      nickname: json['nickname'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'family_id': familyId,
      'nickname': nickname,
      'created_at': createdAt.toIso8601String(),
    };
  }
}
