import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../providers/family_provider.dart';

class JoinFamilyScreen extends ConsumerStatefulWidget {
  const JoinFamilyScreen({super.key});

  @override
  ConsumerState<JoinFamilyScreen> createState() => _JoinFamilyScreenState();
}

class _JoinFamilyScreenState extends ConsumerState<JoinFamilyScreen> {
  final _codeController = TextEditingController();
  final _nicknameController = TextEditingController();
  bool _isLoading = false;
  bool _showScanner = false;
  String? _foundFamilyId;

  @override
  void dispose() {
    _codeController.dispose();
    _nicknameController.dispose();
    super.dispose();
  }

  Future<void> _findFamily(String code) async {
    setState(() => _isLoading = true);
    try {
      final family =
          await ref.read(familyProvider.notifier).findByCode(code);
      if (family != null) {
        setState(() => _foundFamilyId = family.id);
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('가족 코드를 찾을 수 없습니다')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('오류가 발생했습니다: $e')),
        );
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _joinFamily() async {
    final nickname = _nicknameController.text.trim();
    if (nickname.isEmpty || _foundFamilyId == null) return;

    setState(() => _isLoading = true);
    try {
      final member = await ref
          .read(familyRepositoryProvider)
          .joinFamily(_foundFamilyId!, nickname);
      final family = await ref
          .read(familyRepositoryProvider)
          .findByCode(_codeController.text.trim());

      if (family != null) {
        await ref.read(familyProvider.notifier).setFamily(family, member);
        ref.read(currentMemberProvider.notifier).setMember(member);

        if (mounted) context.go('/home');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('오류가 발생했습니다: $e')),
        );
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (_showScanner) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('QR 코드 스캔'),
          leading: IconButton(
            icon: const Icon(Icons.close),
            onPressed: () => setState(() => _showScanner = false),
          ),
        ),
        body: MobileScanner(
          onDetect: (capture) {
            final barcode = capture.barcodes.firstOrNull;
            if (barcode?.rawValue != null) {
              setState(() {
                _codeController.text = barcode!.rawValue!;
                _showScanner = false;
              });
              _findFamily(barcode!.rawValue!);
            }
          },
        ),
      );
    }

    if (_foundFamilyId != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('가족 참여')),
        body: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 32),
              Icon(
                Icons.check_circle,
                size: 48,
                color: theme.colorScheme.primary,
              ),
              const SizedBox(height: 16),
              Text(
                '가족을 찾았습니다!',
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                '닉네임을 입력하고 참여하세요',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 32),
              TextField(
                controller: _nicknameController,
                decoration: const InputDecoration(
                  labelText: '닉네임',
                  hintText: '예: 남편, 아내, 엄마, 아빠',
                  border: OutlineInputBorder(),
                ),
                textInputAction: TextInputAction.done,
                onSubmitted: (_) => _joinFamily(),
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                height: 56,
                child: FilledButton(
                  onPressed: _isLoading ? null : _joinFamily,
                  child: _isLoading
                      ? const CircularProgressIndicator()
                      : const Text('참여하기', style: TextStyle(fontSize: 16)),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('기존 가족 참여')),
      body: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 32),
            Text(
              '가족 코드를 입력하세요',
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              '배우자에게 받은 6자리 코드를 입력하세요',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 32),
            TextField(
              controller: _codeController,
              decoration: const InputDecoration(
                labelText: '가족 코드',
                hintText: 'ABC123',
                border: OutlineInputBorder(),
              ),
              textCapitalization: TextCapitalization.characters,
              textInputAction: TextInputAction.done,
              onSubmitted: (code) => _findFamily(code.trim()),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 56,
              child: FilledButton(
                onPressed: _isLoading
                    ? null
                    : () => _findFamily(_codeController.text.trim()),
                child: _isLoading
                    ? const CircularProgressIndicator()
                    : const Text('코드로 찾기', style: TextStyle(fontSize: 16)),
              ),
            ),
            const SizedBox(height: 24),
            Center(
              child: Text(
                '또는',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 56,
              child: OutlinedButton.icon(
                onPressed: () => setState(() => _showScanner = true),
                icon: const Icon(Icons.qr_code_scanner),
                label: const Text(
                  'QR 코드 스캔',
                  style: TextStyle(fontSize: 16),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
