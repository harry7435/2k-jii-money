class Category {
  final String id;
  final String familyId;
  final String name;
  final String icon;
  final String color;
  final bool isDefault;

  Category({
    required this.id,
    required this.familyId,
    required this.name,
    required this.icon,
    required this.color,
    this.isDefault = false,
  });

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: json['id'] as String,
      familyId: json['family_id'] as String,
      name: json['name'] as String,
      icon: json['icon'] as String,
      color: json['color'] as String,
      isDefault: json['is_default'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'family_id': familyId,
      'name': name,
      'icon': icon,
      'color': color,
      'is_default': isDefault,
    };
  }
}
