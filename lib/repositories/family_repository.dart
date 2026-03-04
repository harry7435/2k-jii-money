import 'dart:math';
import 'package:uuid/uuid.dart';
import '../config/supabase_config.dart';
import '../models/family.dart';
import '../models/member.dart';

class FamilyRepository {
  final _client = SupabaseConfig.client;
  final _uuid = const Uuid();

  String _generateFamilyCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    final random = Random.secure();
    return List.generate(6, (_) => chars[random.nextInt(chars.length)]).join();
  }

  Future<({Family family, Member member})> createFamily(
      String nickname) async {
    final familyId = _uuid.v4();
    final memberId = _uuid.v4();
    final familyCode = _generateFamilyCode();
    final now = DateTime.now();

    await _client.from('families').insert({
      'id': familyId,
      'family_code': familyCode,
      'created_at': now.toIso8601String(),
    });

    await _client.from('members').insert({
      'id': memberId,
      'family_id': familyId,
      'nickname': nickname,
      'created_at': now.toIso8601String(),
    });

    final family = Family(
      id: familyId,
      familyCode: familyCode,
      createdAt: now,
    );
    final member = Member(
      id: memberId,
      familyId: familyId,
      nickname: nickname,
      createdAt: now,
    );

    return (family: family, member: member);
  }

  Future<Family?> findByCode(String code) async {
    final response = await _client
        .from('families')
        .select()
        .eq('family_code', code.toUpperCase())
        .maybeSingle();

    if (response == null) return null;
    return Family.fromJson(response);
  }

  Future<Member> joinFamily(String familyId, String nickname) async {
    final memberId = _uuid.v4();
    final now = DateTime.now();

    await _client.from('members').insert({
      'id': memberId,
      'family_id': familyId,
      'nickname': nickname,
      'created_at': now.toIso8601String(),
    });

    return Member(
      id: memberId,
      familyId: familyId,
      nickname: nickname,
      createdAt: now,
    );
  }

  Future<List<Member>> getMembers(String familyId) async {
    final response = await _client
        .from('members')
        .select()
        .eq('family_id', familyId)
        .order('created_at');

    return response.map((e) => Member.fromJson(e)).toList();
  }
}
