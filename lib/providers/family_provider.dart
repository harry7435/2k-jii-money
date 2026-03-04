import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/family.dart' as model;
import '../models/member.dart';
import '../repositories/family_repository.dart';

typedef Family = model.Family;

final familyRepositoryProvider = Provider((_) => FamilyRepository());

final familyProvider = StateNotifierProvider<FamilyNotifier, Family?>(
  (ref) => FamilyNotifier(ref.read(familyRepositoryProvider)),
);

final currentMemberProvider = StateNotifierProvider<MemberNotifier, Member?>(
  (ref) => MemberNotifier(),
);

final membersProvider =
    FutureProvider.family<List<Member>, String>((ref, familyId) {
  return ref.read(familyRepositoryProvider).getMembers(familyId);
});

class FamilyNotifier extends StateNotifier<Family?> {
  final FamilyRepository _repository;

  FamilyNotifier(this._repository) : super(null);

  Future<void> loadFromLocal() async {
    final prefs = await SharedPreferences.getInstance();
    final familyId = prefs.getString('family_id');
    final familyCode = prefs.getString('family_code');
    final createdAt = prefs.getString('family_created_at');

    if (familyId != null && familyCode != null && createdAt != null) {
      state = Family(
        id: familyId,
        familyCode: familyCode,
        createdAt: DateTime.parse(createdAt),
      );
    }
  }

  Future<({Family family, Member member})> createFamily(
      String nickname) async {
    final result = await _repository.createFamily(nickname);
    state = result.family;
    await _saveToLocal(result.family, result.member);
    return result;
  }

  Future<Family?> findByCode(String code) async {
    return _repository.findByCode(code);
  }

  Future<Member> joinFamily(String familyId, String nickname) async {
    final member = await _repository.joinFamily(familyId, nickname);
    final family = await _repository.findByCode('');
    if (family != null) {
      state = family;
    }
    return member;
  }

  Future<void> setFamily(Family family, Member member) async {
    state = family;
    await _saveToLocal(family, member);
  }

  Future<void> _saveToLocal(Family family, Member member) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('family_id', family.id);
    await prefs.setString('family_code', family.familyCode);
    await prefs.setString('family_created_at', family.createdAt.toIso8601String());
    await prefs.setString('member_id', member.id);
    await prefs.setString('member_nickname', member.nickname);
  }
}

class MemberNotifier extends StateNotifier<Member?> {
  MemberNotifier() : super(null);

  Future<void> loadFromLocal() async {
    final prefs = await SharedPreferences.getInstance();
    final memberId = prefs.getString('member_id');
    final familyId = prefs.getString('family_id');
    final nickname = prefs.getString('member_nickname');

    if (memberId != null && familyId != null && nickname != null) {
      state = Member(
        id: memberId,
        familyId: familyId,
        nickname: nickname,
        createdAt: DateTime.now(),
      );
    }
  }

  void setMember(Member member) {
    state = member;
  }
}
