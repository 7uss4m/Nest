import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/nest_api.dart';
import '../../core/auth/auth_provider.dart';
import '../../core/theme/app_theme.dart';

class UpdateValueSheet extends ConsumerStatefulWidget {
  final AssetDto asset;
  const UpdateValueSheet({super.key, required this.asset});

  @override
  ConsumerState<UpdateValueSheet> createState() => _UpdateValueSheetState();
}

class _UpdateValueSheetState extends ConsumerState<UpdateValueSheet> {
  late final TextEditingController _ctrl;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _ctrl = TextEditingController(text: widget.asset.currentValue.toStringAsFixed(2));
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final value = double.tryParse(_ctrl.text.trim());
    if (value == null || value < 0) return;
    setState(() => _saving = true);
    try {
      final api = ref.read(nestApiProvider);
      final wsId = ref.read(authSessionProvider).workspaceId;
      await api.recordAssetValue(wsId, widget.asset.id, value);
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: NestColors.expense),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.only(bottom: bottom),
      child: Container(
        decoration: const BoxDecoration(
          color: Color(0xFF141925),
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Center(child: Container(
            width: 36, height: 4,
            decoration: BoxDecoration(color: NestColors.text4.withOpacity(0.5), borderRadius: BorderRadius.circular(99)),
          )),
          const SizedBox(height: 16),
          Row(children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Update Value', style: TextStyle(fontFamily: 'InterTight', fontWeight: FontWeight.w700, fontSize: 18, color: NestColors.text1)),
              const SizedBox(height: 2),
              Text(widget.asset.name, style: const TextStyle(fontSize: 13, color: NestColors.text4)),
            ])),
            IconButton(icon: const Icon(Icons.close, color: NestColors.text4, size: 20), onPressed: () => Navigator.of(context).pop()),
          ]),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
            decoration: BoxDecoration(
              color: NestColors.teal.withOpacity(0.08),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: NestColors.teal.withOpacity(0.25)),
            ),
            child: Row(children: [
              Text(widget.asset.currency, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: NestColors.teal, fontFamily: 'InterTight')),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  controller: _ctrl,
                  autofocus: true,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d+\.?\d{0,2}'))],
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: NestColors.teal, fontFamily: 'InterTight'),
                  decoration: const InputDecoration(border: InputBorder.none, contentPadding: EdgeInsets.zero),
                ),
              ),
            ]),
          ),
          const SizedBox(height: 8),
          Text(
            'Previous: ${formatCurrency(widget.asset.currentValue, widget.asset.currency)}',
            style: const TextStyle(fontSize: 12, color: NestColors.text4),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: _saving ? null : _save,
              style: FilledButton.styleFrom(
                backgroundColor: NestColors.teal,
                disabledBackgroundColor: NestColors.teal.withOpacity(0.4),
                foregroundColor: NestColors.base,
                padding: const EdgeInsets.symmetric(vertical: 15),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: _saving
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : const Text('Save New Value', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
            ),
          ),
        ]),
      ),
    );
  }
}
