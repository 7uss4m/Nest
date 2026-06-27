import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/nest_api.dart';
import '../../core/auth/auth_provider.dart';
import '../../core/theme/app_theme.dart';

// ── Provider ──────────────────────────────────────────────────────────────────

class _BudgetData {
  final List<BudgetDto> budgets;
  final List<CategoryDto> categories;
  final List<CategorySpend> spending;
  const _BudgetData({required this.budgets, required this.categories, required this.spending});
}

final _budgetDataProvider = FutureProvider.autoDispose<_BudgetData>((ref) async {
  final api = ref.read(nestApiProvider);
  final wsId = ref.read(authSessionProvider).workspaceId;

  final budgetsFut = api.getBudgets(wsId);
  final catsFut = api.getCategories(wsId);
  final spendFut = api.getSpendingByCategory(wsId);

  return _BudgetData(
    budgets: await budgetsFut,
    categories: await catsFut,
    spending: await spendFut,
  );
});

// ── Screen ────────────────────────────────────────────────────────────────────

class BudgetsScreen extends ConsumerWidget {
  const BudgetsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dataAsync = ref.watch(_budgetDataProvider);

    return Scaffold(
      body: RefreshIndicator(
        color: NestColors.indigo,
        backgroundColor: NestColors.surface,
        onRefresh: () => ref.refresh(_budgetDataProvider.future),
        child: SafeArea(
          child: dataAsync.when(
            loading: () => const Center(child: CircularProgressIndicator(color: NestColors.indigo, strokeWidth: 2.5)),
            error: (e, _) => Center(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                const Icon(Icons.wifi_off_rounded, color: NestColors.text4, size: 40),
                const SizedBox(height: 12),
                Text(e.toString(), style: const TextStyle(color: NestColors.text3), textAlign: TextAlign.center),
                const SizedBox(height: 16),
                TextButton(onPressed: () => ref.refresh(_budgetDataProvider), child: const Text('Retry', style: TextStyle(color: NestColors.indigoL))),
              ]),
            ),
            data: (data) => _BudgetList(data: data),
          ),
        ),
      ),
    );
  }
}

class _BudgetList extends StatelessWidget {
  final _BudgetData data;
  const _BudgetList({required this.data});

  Color _parseHex(String hex) {
    final h = hex.replaceAll('#', '');
    return Color(int.parse('FF$h', radix: 16));
  }

  @override
  Widget build(BuildContext context) {
    final catMap = {for (final c in data.categories) c.id: c};
    final spendMap = {for (final s in data.spending) s.categoryId: s.total};

    if (data.budgets.isEmpty) {
      return const Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Icon(Icons.donut_small_outlined, size: 48, color: NestColors.text4),
          SizedBox(height: 16),
          Text('No budgets yet', style: TextStyle(color: NestColors.text2, fontSize: 15, fontWeight: FontWeight.w600)),
          SizedBox(height: 6),
          Text('Create budgets on the web app to get started.', style: TextStyle(color: NestColors.text4, fontSize: 13)),
        ]),
      );
    }

    final totalBudgeted = data.budgets.fold(0.0, (s, b) => s + b.amountLimit.amount);
    final refMoney = data.budgets.first.amountLimit;
    final totalSpent = data.budgets.fold(0.0, (s, b) => s + (spendMap[b.categoryId] ?? 0.0));

    return CustomScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      slivers: [
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(18, 16, 18, 18),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Budgets', style: TextStyle(fontFamily: 'InterTight', fontWeight: FontWeight.w800, fontSize: 26, color: NestColors.text1)),
              const SizedBox(height: 16),
              // Summary strip
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: NestColors.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: NestColors.border),
                ),
                child: Row(children: [
                  _SummaryItem(label: 'Budgeted', value: formatCurrency(totalBudgeted, refMoney.currencyCode), color: NestColors.indigoL),
                  const _Divider(),
                  _SummaryItem(label: 'Spent', value: formatCurrency(totalSpent, refMoney.currencyCode), color: NestColors.expense),
                  const _Divider(),
                  _SummaryItem(
                    label: 'Remaining',
                    value: formatCurrency((totalBudgeted - totalSpent).clamp(0, double.infinity), refMoney.currencyCode),
                    color: NestColors.income,
                  ),
                ]),
              ),
            ]),
          ),
        ),
        SliverList(
          delegate: SliverChildBuilderDelegate(
            (context, i) {
              final b = data.budgets[i];
              final cat = catMap[b.categoryId];
              if (cat == null) return const SizedBox.shrink();
              final spent = spendMap[b.categoryId] ?? 0.0;
              final pct = b.amountLimit.amount > 0 ? (spent / b.amountLimit.amount).clamp(0.0, 1.0) : 0.0;
              final isOver = spent > b.amountLimit.amount;
              final color = _parseHex(cat.color);

              return Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: NestColors.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: isOver ? NestColors.expense.withOpacity(0.3) : NestColors.border),
                  ),
                  child: Column(children: [
                    Row(children: [
                      Container(
                        width: 36, height: 36,
                        decoration: BoxDecoration(color: color.withOpacity(0.14), borderRadius: BorderRadius.circular(10)),
                        child: Icon(Icons.category_outlined, color: color, size: 18),
                      ),
                      const SizedBox(width: 12),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(cat.name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: NestColors.text1)),
                        Text(
                          'Monthly${b.rollover ? " · rollover" : ""}',
                          style: const TextStyle(fontSize: 11, color: NestColors.text4),
                        ),
                      ])),
                      Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                        if (isOver)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                            decoration: BoxDecoration(color: NestColors.expense.withOpacity(0.14), borderRadius: BorderRadius.circular(99)),
                            child: const Text('OVER', style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: NestColors.expense)),
                          ),
                        Text(
                          '${formatCurrency(spent, b.amountLimit.currencyCode)} / ${formatMoney(b.amountLimit)}',
                          style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: isOver ? NestColors.expense : NestColors.text1),
                        ),
                      ]),
                    ]),
                    const SizedBox(height: 12),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(99),
                      child: LinearProgressIndicator(
                        value: pct,
                        backgroundColor: Colors.white.withOpacity(0.06),
                        valueColor: AlwaysStoppedAnimation(isOver ? NestColors.expense : color),
                        minHeight: 7,
                      ),
                    ),
                  ]),
                ),
              );
            },
            childCount: data.budgets.length,
          ),
        ),
        const SliverToBoxAdapter(child: SizedBox(height: 100)),
      ],
    );
  }
}

class _SummaryItem extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _SummaryItem({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(child: Column(children: [
      Text(label, style: const TextStyle(fontSize: 11, color: NestColors.text4)),
      const SizedBox(height: 4),
      Text(value, style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: color, fontFamily: 'InterTight')),
    ]));
  }
}

class _Divider extends StatelessWidget {
  const _Divider();

  @override
  Widget build(BuildContext context) {
    return Container(width: 1, height: 32, color: NestColors.border, margin: const EdgeInsets.symmetric(horizontal: 8));
  }
}
