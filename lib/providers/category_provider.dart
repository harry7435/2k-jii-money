import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/category.dart';
import '../repositories/category_repository.dart';
import 'family_provider.dart';

final categoryRepositoryProvider = Provider((_) => CategoryRepository());

final categoriesProvider =
    StateNotifierProvider<CategoriesNotifier, AsyncValue<List<Category>>>(
  (ref) {
    final family = ref.watch(familyProvider);
    return CategoriesNotifier(
      ref.read(categoryRepositoryProvider),
      family?.id,
    );
  },
);

class CategoriesNotifier extends StateNotifier<AsyncValue<List<Category>>> {
  final CategoryRepository _repository;
  final String? _familyId;

  CategoriesNotifier(this._repository, this._familyId)
      : super(const AsyncValue.loading()) {
    if (_familyId != null) {
      load();
    }
  }

  Future<void> load() async {
    if (_familyId == null) return;
    state = const AsyncValue.loading();
    try {
      final categories = await _repository.getCategories(_familyId);
      state = AsyncValue.data(categories);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> add({
    required String name,
    required String icon,
    required String color,
  }) async {
    if (_familyId == null) return;
    await _repository.addCategory(
      _familyId,
      name: name,
      icon: icon,
      color: color,
    );
    await load();
  }

  Future<void> update(Category category) async {
    await _repository.updateCategory(category);
    await load();
  }

  Future<void> delete(String id) async {
    await _repository.deleteCategory(id);
    await load();
  }
}
