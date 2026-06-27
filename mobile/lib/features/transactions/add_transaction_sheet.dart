import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/nest_api.dart';
import '../../core/auth/auth_provider.dart';
import '../../core/theme/app_theme.dart';

class AddTransactionSheet extends ConsumerStatefulWidget {
  const AddTransactionSheet({super.key});

  @override
  ConsumerState<AddTransactionSheet> createState() => _AddTransactionSheetState();
}

class _AddTransactionSheetState extends ConsumerState<AddTransactionSheet> {
  int _type = 1; // 0=Income, 1=Expense, 2=Transfer
  final _amountCtrl = TextEditingController();
  final _payeeCtrl = TextEditingController();
  final _noteCtrl = TextEditingController();
  final _templateNameCtrl = TextEditingController();
  String? _accountId;
  String? _categoryId;
  DateTime _date = DateTime.now();
  bool _saving = false;
  bool _savingTemplate = false;
  bool _showSaveTemplate = false;
  bool _loading = true;
  String? _loadError;
  List<AccountDto> _accounts = [];
  List<CategoryDto> _categories = [];
  List<TemplateDto> _templates = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final api = ref.read(nestApiProvider);
      final wsId = ref.read(authSessionProvider).workspaceId;
      final results = await Future.wait([
        api.getAccounts(wsId),
        api.getCategories(wsId),
        api.getTemplates(wsId),
      ]);
      if (mounted) {
        setState(() {
          _accounts = results[0] as List<AccountDto>;
          _categories = results[1] as List<CategoryDto>;
          _templates = results[2] as List<TemplateDto>;
          _accountId = (_accounts).isNotEmpty ? _accounts.first.id : null;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() { _loadError = e.toString(); _loading = false; });
    }
  }

  void _applyTemplate(TemplateDto t) {
    setState(() {
      _type = t.type;
      _categoryId = t.categoryId;
      if (t.accountId != null && _accounts.any((a) => a.id == t.accountId)) _accountId = t.accountId;
      if (t.amount != null) _amountCtrl.text = t.amount!.toStringAsFixed(2);
      _payeeCtrl.text = t.payee ?? '';
      _noteCtrl.text = t.note ?? '';
    });
    Navigator.of(context).pop(); // close the template picker sheet
  }

  Future<void> _saveTemplate() async {
    final name = _templateNameCtrl.text.trim();
    if (name.isEmpty) return;
    setState(() => _savingTemplate = true);
    try {
      final api = ref.read(nestApiProvider);
      final wsId = ref.read(authSessionProvider).workspaceId;
      await api.createTemplate(wsId, {
        'name': name,
        'type': _type,
        'amount': double.tryParse(_amountCtrl.text),
        'accountId': _accountId,
        'categoryId': _categoryId,
        'payee': _payeeCtrl.text.trim().isEmpty ? null : _payeeCtrl.text.trim(),
        'note': _noteCtrl.text.trim().isEmpty ? null : _noteCtrl.text.trim(),
      });
      _templateNameCtrl.clear();
      setState(() { _showSaveTemplate = false; _savingTemplate = false; });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Template saved'), backgroundColor: Color(0xFF2DD4BF)),
        );
      }
      // Refresh templates list
      final updated = await api.getTemplates(wsId);
      if (mounted) setState(() => _templates = updated);
    } catch (e) {
      if (mounted) setState(() => _savingTemplate = false);
    }
  }

  void _showTemplatePicker() {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => _TemplatePicker(
        templates: _templates,
        accounts: _accounts,
        categories: _categories,
        onApply: _applyTemplate,
        onDelete: (id) async {
          final api = ref.read(nestApiProvider);
          final wsId = ref.read(authSessionProvider).workspaceId;
          await api.deleteTemplate(wsId, id);
          final updated = await api.getTemplates(wsId);
          if (mounted) setState(() => _templates = updated);
        },
      ),
    );
  }

  List<CategoryDto> get _filteredCategories {
    if (_type == 2) return _categories;
    return _categories.where((c) => c.type == _type).toList();
  }

  @override
  void dispose() {
    _amountCtrl.dispose();
    _payeeCtrl.dispose();
    _noteCtrl.dispose();
    _templateNameCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final amountStr = _amountCtrl.text.trim();
    if (amountStr.isEmpty || _accountId == null) return;
    final amount = double.tryParse(amountStr);
    if (amount == null || amount <= 0) return;

    setState(() => _saving = true);
    try {
      final api = ref.read(nestApiProvider);
      final wsId = ref.read(authSessionProvider).workspaceId;
      await api.createTransaction(wsId, CreateTransactionDto(
        amount: amount,
        type: _type,
        date: '${_date.year.toString().padLeft(4, '0')}-${_date.month.toString().padLeft(2, '0')}-${_date.day.toString().padLeft(2, '0')}',
        accountId: _accountId!,
        categoryId: _categoryId,
        payee: _payeeCtrl.text.trim().isEmpty ? null : _payeeCtrl.text.trim(),
        note: _noteCtrl.text.trim().isEmpty ? null : _noteCtrl.text.trim(),
      ));
      if (mounted) Navigator.of(context).pop(true); // return true = saved
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
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Center(
              child: Container(
                margin: const EdgeInsets.only(top: 12, bottom: 8),
                width: 36, height: 4,
                decoration: BoxDecoration(
                  color: NestColors.text4.withOpacity(0.5),
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 4, 8, 0),
              child: Row(
                children: [
                  const Text('Add Transaction', style: TextStyle(fontFamily: 'InterTight', fontWeight: FontWeight.w700, fontSize: 18, color: NestColors.text1)),
                  const Spacer(),
                  if (_templates.isNotEmpty)
                    TextButton.icon(
                      onPressed: _showTemplatePicker,
                      icon: const Icon(Icons.auto_awesome_outlined, size: 16),
                      label: Text('Templates (${_templates.length})'),
                      style: TextButton.styleFrom(
                        foregroundColor: NestColors.indigoL,
                        textStyle: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600),
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      ),
                    ),
                  IconButton(icon: const Icon(Icons.close, color: NestColors.text4, size: 20), onPressed: () => Navigator.of(context).pop()),
                ],
              ),
            ),
            if (_loading)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 40),
                child: CircularProgressIndicator(color: NestColors.indigo, strokeWidth: 2.5),
              )
            else if (_loadError != null)
              Padding(
                padding: const EdgeInsets.all(24),
                child: Text(_loadError!, style: const TextStyle(color: NestColors.expense, fontSize: 13)),
              )
            else
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
                  child: Column(children: [
                    _TypeToggle(selected: _type, onChanged: (v) => setState(() {
                      _type = v;
                      _categoryId = null;
                    })),
                    const SizedBox(height: 16),
                    _AmountField(controller: _amountCtrl, type: _type),
                    const SizedBox(height: 14),
                    _SheetDropdown<String>(
                      label: 'Account',
                      value: _accountId,
                      items: _accounts.map((a) => DropdownMenuItem(value: a.id, child: Text(a.name))).toList(),
                      onChanged: (v) => setState(() => _accountId = v),
                    ),
                    const SizedBox(height: 10),
                    _SheetDropdown<String>(
                      label: 'Category (optional)',
                      value: _filteredCategories.any((c) => c.id == _categoryId) ? _categoryId : null,
                      items: _filteredCategories.map((c) => DropdownMenuItem(value: c.id, child: Text(c.name))).toList(),
                      onChanged: (v) => setState(() => _categoryId = v),
                    ),
                    const SizedBox(height: 10),
                    _DateField(date: _date, onChanged: (d) => setState(() => _date = d)),
                    const SizedBox(height: 10),
                    _SheetTextField(controller: _payeeCtrl, label: 'Payee (optional)', icon: Icons.store_outlined),
                    const SizedBox(height: 10),
                    _SheetTextField(controller: _noteCtrl, label: 'Note (optional)', icon: Icons.notes_outlined),
                    const SizedBox(height: 16),
                    // Save as template
                    GestureDetector(
                      onTap: () => setState(() => _showSaveTemplate = !_showSaveTemplate),
                      child: Row(children: [
                        Icon(_showSaveTemplate ? Icons.keyboard_arrow_down : Icons.keyboard_arrow_right, size: 16, color: NestColors.text4),
                        const SizedBox(width: 4),
                        const Text('Save as template', style: TextStyle(fontSize: 12.5, color: NestColors.text4, fontWeight: FontWeight.w500)),
                      ]),
                    ),
                    if (_showSaveTemplate) ...[
                      const SizedBox(height: 10),
                      Row(children: [
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.04),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: NestColors.border),
                            ),
                            child: TextField(
                              controller: _templateNameCtrl,
                              style: const TextStyle(color: NestColors.text1, fontSize: 13),
                              decoration: const InputDecoration(
                                labelText: 'Template name',
                                labelStyle: TextStyle(color: NestColors.text4, fontSize: 12),
                                border: InputBorder.none,
                                isDense: true,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        FilledButton(
                          onPressed: _savingTemplate ? null : _saveTemplate,
                          style: FilledButton.styleFrom(
                            backgroundColor: const Color(0xFF2DD4BF),
                            foregroundColor: const Color(0xFF0B0E14),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: _savingTemplate
                            ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF0B0E14)))
                            : const Text('Save', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                        ),
                      ]),
                    ],
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: _saving ? null : _save,
                        style: FilledButton.styleFrom(
                          backgroundColor: NestColors.indigo,
                          disabledBackgroundColor: NestColors.indigo.withOpacity(0.4),
                          padding: const EdgeInsets.symmetric(vertical: 15),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        child: _saving
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Text('Save Transaction', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                      ),
                    ),
                  ]),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// ── Type toggle ───────────────────────────────────────────────────────────────

class _TypeToggle extends StatelessWidget {
  final int selected;
  final ValueChanged<int> onChanged;
  const _TypeToggle({required this.selected, required this.onChanged});

  static const _labels = ['Income', 'Expense', 'Transfer'];
  static const _colors = [NestColors.income, NestColors.expense, NestColors.indigoL];

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12)),
      padding: const EdgeInsets.all(4),
      child: Row(
        children: List.generate(3, (i) {
          final isSelected = selected == i;
          return Expanded(
            child: GestureDetector(
              onTap: () => onChanged(i),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                padding: const EdgeInsets.symmetric(vertical: 9),
                decoration: BoxDecoration(
                  color: isSelected ? _colors[i].withOpacity(0.16) : Colors.transparent,
                  borderRadius: BorderRadius.circular(9),
                  border: Border.all(color: isSelected ? _colors[i].withOpacity(0.35) : Colors.transparent),
                ),
                alignment: Alignment.center,
                child: Text(
                  _labels[i],
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w600,
                    color: isSelected ? _colors[i] : NestColors.text4,
                  ),
                ),
              ),
            ),
          );
        }),
      ),
    );
  }
}

// ── Amount field ──────────────────────────────────────────────────────────────

class _AmountField extends StatelessWidget {
  final TextEditingController controller;
  final int type;
  const _AmountField({required this.controller, required this.type});

  static const _colors = [NestColors.income, NestColors.expense, NestColors.indigoL];
  static const _signs = ['+', '-', ''];

  @override
  Widget build(BuildContext context) {
    final idx = type.clamp(0, 2);
    final color = _colors[idx];

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (_signs[idx].isNotEmpty)
            Text(_signs[idx], style: TextStyle(fontSize: 28, fontWeight: FontWeight.w700, color: color, fontFamily: 'InterTight')),
          Expanded(
            child: TextField(
              controller: controller,
              autofocus: true,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d+\.?\d{0,2}'))],
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 34, fontWeight: FontWeight.w800, color: color, fontFamily: 'InterTight'),
              decoration: InputDecoration(
                hintText: '0.00',
                hintStyle: TextStyle(fontSize: 34, fontWeight: FontWeight.w800, color: color.withOpacity(0.3), fontFamily: 'InterTight'),
                border: InputBorder.none,
                contentPadding: EdgeInsets.zero,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Dropdown ──────────────────────────────────────────────────────────────────

class _SheetDropdown<T> extends StatelessWidget {
  final String label;
  final T? value;
  final List<DropdownMenuItem<T>> items;
  final ValueChanged<T?> onChanged;
  const _SheetDropdown({required this.label, required this.value, required this.items, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.04),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: NestColors.border),
      ),
      child: DropdownButtonFormField<T>(
        value: value,
        items: items,
        onChanged: onChanged,
        decoration: InputDecoration(
          labelText: label,
          labelStyle: const TextStyle(color: NestColors.text4, fontSize: 12),
          border: InputBorder.none,
          isDense: true,
          contentPadding: const EdgeInsets.symmetric(vertical: 8),
        ),
        dropdownColor: const Color(0xFF1E2535),
        style: const TextStyle(color: NestColors.text1, fontSize: 14),
        icon: const Icon(Icons.keyboard_arrow_down, color: NestColors.text4, size: 20),
        isExpanded: true,
      ),
    );
  }
}

// ── Date field ────────────────────────────────────────────────────────────────

class _DateField extends StatelessWidget {
  final DateTime date;
  final ValueChanged<DateTime> onChanged;
  const _DateField({required this.date, required this.onChanged});

  static const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  @override
  Widget build(BuildContext context) {
    final label = '${_months[date.month - 1]} ${date.day}, ${date.year}';

    return GestureDetector(
      onTap: () async {
        final picked = await showDatePicker(
          context: context,
          initialDate: date,
          firstDate: DateTime(2020),
          lastDate: DateTime.now().add(const Duration(days: 365)),
          builder: (ctx, child) => Theme(
            data: ThemeData.dark().copyWith(
              colorScheme: const ColorScheme.dark(primary: NestColors.indigo, surface: Color(0xFF1E2535)),
            ),
            child: child!,
          ),
        );
        if (picked != null) onChanged(picked);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.04),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: NestColors.border),
        ),
        child: Row(children: [
          const Icon(Icons.calendar_today_outlined, color: NestColors.text4, size: 17),
          const SizedBox(width: 10),
          const Text('Date', style: TextStyle(color: NestColors.text4, fontSize: 12)),
          const Spacer(),
          Text(label, style: const TextStyle(color: NestColors.text1, fontSize: 14, fontWeight: FontWeight.w500)),
          const SizedBox(width: 6),
          const Icon(Icons.keyboard_arrow_down, color: NestColors.text4, size: 18),
        ]),
      ),
    );
  }
}

// ── Text field ────────────────────────────────────────────────────────────────

class _SheetTextField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final IconData icon;
  const _SheetTextField({required this.controller, required this.label, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.04),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: NestColors.border),
      ),
      child: TextField(
        controller: controller,
        style: const TextStyle(color: NestColors.text1, fontSize: 14),
        decoration: InputDecoration(
          labelText: label,
          labelStyle: const TextStyle(color: NestColors.text4, fontSize: 12),
          prefixIcon: Icon(icon, color: NestColors.text4, size: 18),
          border: InputBorder.none,
          isDense: true,
        ),
      ),
    );
  }
}

// ── Template picker sheet ─────────────────────────────────────────────────────

class _TemplatePicker extends StatefulWidget {
  final List<TemplateDto> templates;
  final List<AccountDto> accounts;
  final List<CategoryDto> categories;
  final ValueChanged<TemplateDto> onApply;
  final Future<void> Function(String id) onDelete;
  const _TemplatePicker({required this.templates, required this.accounts, required this.categories, required this.onApply, required this.onDelete});

  @override
  State<_TemplatePicker> createState() => _TemplatePickerState();
}

class _TemplatePickerState extends State<_TemplatePicker> {
  late List<TemplateDto> _items;
  bool _deleting = false;

  @override
  void initState() {
    super.initState();
    _items = List.of(widget.templates);
  }

  static const _typeColors = [NestColors.income, NestColors.expense, NestColors.indigoL];
  static const _typeLabels = ['Income', 'Expense', 'Transfer'];
  static const _typeIcons = [Icons.south_west, Icons.north_east, Icons.swap_horiz];

  @override
  Widget build(BuildContext context) {
    final accountMap = {for (final a in widget.accounts) a.id: a};
    final catMap = {for (final c in widget.categories) c.id: c};

    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFF141925),
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 12, bottom: 8),
              width: 36, height: 4,
              decoration: BoxDecoration(color: NestColors.text4.withOpacity(0.4), borderRadius: BorderRadius.circular(99)),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
            child: Row(children: [
              const Text('Templates', style: TextStyle(fontFamily: 'InterTight', fontWeight: FontWeight.w700, fontSize: 17, color: NestColors.text1)),
              const Spacer(),
              IconButton(icon: const Icon(Icons.close, color: NestColors.text4, size: 20), onPressed: () => Navigator.of(context).pop()),
            ]),
          ),
          if (_items.isEmpty)
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 0, 20, 32),
              child: Text('No templates saved yet.\nFill in a transaction and tap "Save as template".', style: TextStyle(color: NestColors.text4, fontSize: 13), textAlign: TextAlign.center),
            )
          else
            Flexible(
              child: ListView.separated(
                shrinkWrap: true,
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 28),
                itemCount: _items.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (_, i) {
                  final t = _items[i];
                  final color = _typeColors[t.type.clamp(0, 2)];
                  final account = t.accountId != null ? accountMap[t.accountId] : null;
                  final category = t.categoryId != null ? catMap[t.categoryId] : null;
                  return GestureDetector(
                    onTap: () => widget.onApply(t),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: color.withOpacity(0.07),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: color.withOpacity(0.2)),
                      ),
                      child: Row(children: [
                        Container(
                          width: 34, height: 34,
                          decoration: BoxDecoration(color: color.withOpacity(0.15), borderRadius: BorderRadius.circular(10)),
                          child: Icon(_typeIcons[t.type.clamp(0, 2)], color: color, size: 17),
                        ),
                        const SizedBox(width: 12),
                        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(t.name, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600, color: NestColors.text1)),
                          Row(children: [
                            Text(_typeLabels[t.type.clamp(0, 2)], style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w500)),
                            if (category != null) ...[
                              const Text(' · ', style: TextStyle(fontSize: 11, color: NestColors.text4)),
                              Text(category.name, style: const TextStyle(fontSize: 11, color: NestColors.text4)),
                            ],
                            if (account != null) ...[
                              const Text(' · ', style: TextStyle(fontSize: 11, color: NestColors.text4)),
                              Text(account.name, style: const TextStyle(fontSize: 11, color: NestColors.text4)),
                            ],
                          ]),
                        ])),
                        if (t.amount != null)
                          Text(formatCurrency(t.amount!), style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: color, fontFamily: 'InterTight')),
                        const SizedBox(width: 6),
                        GestureDetector(
                          onTap: _deleting ? null : () async {
                            setState(() { _deleting = true; _items.removeAt(i); });
                            await widget.onDelete(t.id);
                            if (mounted) setState(() => _deleting = false);
                          },
                          child: const Icon(Icons.delete_outline, color: NestColors.text4, size: 18),
                        ),
                      ]),
                    ),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }
}
