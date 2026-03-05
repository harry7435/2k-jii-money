import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../providers/family_provider.dart';
import '../../providers/category_provider.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final family = ref.watch(familyProvider);
    final member = ref.watch(currentMemberProvider);
    final categories = ref.watch(categoriesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('설정'),
        centerTitle: true,
      ),
      body: ListView(
        children: [
          // 프로필 섹션
          Padding(
            padding: const EdgeInsets.all(16),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    CircleAvatar(
                      radius: 32,
                      backgroundColor: theme.colorScheme.primaryContainer,
                      child: Text(
                        member?.nickname.characters.first ?? '?',
                        style: theme.textTheme.headlineMedium?.copyWith(
                          color: theme.colorScheme.onPrimaryContainer,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      member?.nickname ?? '알 수 없음',
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // 가족 코드 섹션
          _SectionHeader(title: '가족 정보'),
          ListTile(
            leading: const Icon(Icons.group),
            title: const Text('가족 코드'),
            subtitle: Text(family?.familyCode ?? '-'),
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  icon: const Icon(Icons.copy),
                  onPressed: family != null
                      ? () {
                          Clipboard.setData(
                              ClipboardData(text: family.familyCode));
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('코드가 복사되었습니다')),
                          );
                        }
                      : null,
                ),
                IconButton(
                  icon: const Icon(Icons.qr_code),
                  onPressed: family != null
                      ? () => _showQrDialog(context, family.familyCode)
                      : null,
                ),
              ],
            ),
          ),
          ListTile(
            leading: const Icon(Icons.people),
            title: const Text('구성원'),
            trailing: const Icon(Icons.chevron_right),
            onTap: family != null
                ? () => _showMembersDialog(context, ref, family.id)
                : null,
          ),
          const Divider(),

          // 카테고리 관리
          _SectionHeader(title: '카테고리 관리'),
          categories.when(
            loading: () => const ListTile(
              title: Center(child: CircularProgressIndicator()),
            ),
            error: (e, _) => ListTile(title: Text('오류: $e')),
            data: (cats) => Column(
              children: cats
                  .map(
                    (c) => ListTile(
                      leading: CircleAvatar(
                        backgroundColor: Color(
                          int.parse(
                              c.color.replaceFirst('#', 'FF'),
                              radix: 16),
                        ).withValues(alpha: 0.2),
                        child: Icon(
                          Icons.category,
                          color: Color(
                            int.parse(
                                c.color.replaceFirst('#', 'FF'),
                                radix: 16),
                          ),
                          size: 18,
                        ),
                      ),
                      title: Text(c.name),
                      trailing: c.isDefault
                          ? Chip(
                              label: const Text('기본'),
                              labelStyle: theme.textTheme.labelSmall,
                              visualDensity: VisualDensity.compact,
                            )
                          : IconButton(
                              icon: const Icon(Icons.delete_outline),
                              onPressed: () async {
                                final confirm = await showDialog<bool>(
                                  context: context,
                                  builder: (ctx) => AlertDialog(
                                    title: const Text('카테고리 삭제'),
                                    content: Text(
                                        '"${c.name}" 카테고리를 삭제하시겠습니까?'),
                                    actions: [
                                      TextButton(
                                        onPressed: () =>
                                            Navigator.pop(ctx, false),
                                        child: const Text('취소'),
                                      ),
                                      TextButton(
                                        onPressed: () =>
                                            Navigator.pop(ctx, true),
                                        child: const Text('삭제'),
                                      ),
                                    ],
                                  ),
                                );
                                if (confirm == true) {
                                  ref
                                      .read(categoriesProvider.notifier)
                                      .delete(c.id);
                                }
                              },
                            ),
                    ),
                  )
                  .toList(),
            ),
          ),
          const Divider(),

          // 앱 정보
          _SectionHeader(title: '앱 정보'),
          const ListTile(
            leading: Icon(Icons.info_outline),
            title: Text('버전'),
            subtitle: Text('1.0.0'),
          ),
        ],
      ),
    );
  }

  void _showQrDialog(BuildContext context, String code) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('가족 QR 코드'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            QrImageView(
              data: code,
              version: QrVersions.auto,
              size: 200,
            ),
            const SizedBox(height: 16),
            Text(
              code,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    letterSpacing: 4,
                    fontWeight: FontWeight.bold,
                  ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('닫기'),
          ),
        ],
      ),
    );
  }

  void _showMembersDialog(
      BuildContext context, WidgetRef ref, String familyId) {
    final members = ref.read(membersProvider(familyId));

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('가족 구성원'),
        content: members.when(
          loading: () => const SizedBox(
            height: 100,
            child: Center(child: CircularProgressIndicator()),
          ),
          error: (e, _) => Text('오류: $e'),
          data: (memberList) => Column(
            mainAxisSize: MainAxisSize.min,
            children: memberList
                .map(
                  (m) => ListTile(
                    leading: CircleAvatar(
                      child: Text(m.nickname.characters.first),
                    ),
                    title: Text(m.nickname),
                  ),
                )
                .toList(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('닫기'),
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader({required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
      child: Text(
        title,
        style: Theme.of(context).textTheme.labelLarge?.copyWith(
              color: Theme.of(context).colorScheme.primary,
              fontWeight: FontWeight.bold,
            ),
      ),
    );
  }
}
