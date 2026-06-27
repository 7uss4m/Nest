import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/nest_api.dart';
import '../../core/auth/auth_provider.dart';
import '../../core/theme/app_theme.dart';
import 'update_balance_sheet.dart';

final _liabilitiesProvider = FutureProvider.autoDispose<List<LiabilityDto>>((ref) async {
  final api = ref.read(nestApiProvider);
  final wsId = ref.read(authSessionProvider).workspaceId;
  return api.getLiabilities(wsId);
});

const _liabilityTypeLabels = [
  'Mortgage', 'Vehicle Loan', 'Personal Loan', 'Credit Card',
  'Student Loan', 'Business Loan', 'Owed to Person', 'Other',
];
const _liabilityTypeIcons = [
  Icons.home_outlined,
  Icons.directions_car_outlined,
  Icons.person_outlined,
  Icons.credit_card_outlined,
  Icons.school_outlined,
  Icons.business_outlined,
  Icons.handshake_outlined,
  Icons.more_horiz,
];

class LiabilitiesScreen extends ConsumerWidget {
  const LiabilitiesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dataAsync = ref.watch(_liabilitiesProvider);

    return Scaffold(
      appBar: AppBar(
        leading: const BackButton(color: NestColors.text1),
        title: const Text('Liabilities', style: TextStyle(fontFamily: 'InterTight', fontWeight: FontWeight.w700, fontSize: 18, color: NestColors.text1)),
        backgroundColor: NestColors.base,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
      ),
      body: RefreshIndicator(
        color: NestColors.indigo,
        backgroundColor: NestColors.surface,
        onRefresh: () => ref.refresh(_liabilitiesProvider.future),
        child: dataAsync.when(
          loading: () => const Center(child: CircularProgressIndicator(color: NestColors.indigo, strokeWidth: 2.5)),
          error: (e, _) => Center(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              const Icon(Icons.wifi_off_rounded, color: NestColors.text4, size: 40),
              const SizedBox(height: 12),
              Text(e.toString(), style: const TextStyle(color: NestColors.text3, fontSize: 13), textAlign: TextAlign.center),
              const SizedBox(height: 16),
              TextButton(onPressed: () => ref.refresh(_liabilitiesProvider), child: const Text('Retry', style: TextStyle(color: NestColors.indigoL))),
            ]),
          ),
          data: (liabilities) => _LiabilityList(liabilities: liabilities),
        ),
      ),
    );
  }
}

class _LiabilityList extends ConsumerWidget {
  final List<LiabilityDto> liabilities;
  const _LiabilityList({required this.liabilities});

  Future<void> _openUpdateSheet(BuildContext context, WidgetRef ref, LiabilityDto liability) async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) => UpdateBalanceSheet(liability: liability),
    );
    if (saved == true) ref.invalidate(_liabilitiesProvider);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (liabilities.isEmpty) {
      return const Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Icon(Icons.trending_down, size: 48, color: NestColors.text4),
          SizedBox(height: 16),
          Text('No liabilities', style: TextStyle(color: NestColors.text2, fontSize: 15, fontWeight: FontWeight.w600)),
          SizedBox(height: 6),
          Text('Add liabilities on the web app to track your debt.', style: TextStyle(color: NestColors.text4, fontSize: 13)),
        ]),
      );
    }

    final totalDebt = liabilities.fold(0.0, (s, l) => s + l.currentBalance.amount);
    final totalOriginal = liabilities.fold(0.0, (s, l) => s + l.originalAmount.amount);
    final totalPaid = (totalOriginal - totalDebt).clamp(0.0, double.infinity);
    final refMoney = liabilities.first.currentBalance;

    return CustomScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      slivers: [
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xFF8B1A2C), Color(0xFF5B1A3C)],
                ),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Total Debt', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Colors.white70)),
                const SizedBox(height: 6),
                Text(
                  formatCurrency(totalDebt, refMoney.currencyCode),
                  style: const TextStyle(fontFamily: 'InterTight', fontWeight: FontWeight.w800, fontSize: 30, color: Colors.white),
                ),
                const SizedBox(height: 14),
                Row(children: [
                  _HeroStat(label: 'Original', value: formatCurrency(totalOriginal, refMoney.currencyCode), color: Colors.white70),
                  const SizedBox(width: 24),
                  _HeroStat(label: 'Paid Off', value: formatCurrency(totalPaid, refMoney.currencyCode), color: NestColors.income),
                ]),
              ]),
            ),
          ),
        ),
        SliverList(
          delegate: SliverChildBuilderDelegate(
            (context, i) => _LiabilityTile(
              liability: liabilities[i],
              onUpdateTap: () => _openUpdateSheet(context, ref, liabilities[i]),
            ),
            childCount: liabilities.length,
          ),
        ),
        const SliverToBoxAdapter(child: SizedBox(height: 24)),
      ],
    );
  }
}

class _LiabilityTile extends StatelessWidget {
  final LiabilityDto liability;
  final VoidCallback onUpdateTap;
  const _LiabilityTile({required this.liability, required this.onUpdateTap});

  @override
  Widget build(BuildContext context) {
    final typeIdx = liability.type.clamp(0, _liabilityTypeLabels.length - 1);
    final paidPct = liability.originalAmount.amount > 0
        ? ((liability.originalAmount.amount - liability.currentBalance.amount) / liability.originalAmount.amount).clamp(0.0, 1.0)
        : 0.0;
    final paidPctDisplay = (paidPct * 100).round();

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: NestColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: NestColors.border),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Container(
              width: 42, height: 42,
              decoration: BoxDecoration(
                color: NestColors.expense.withOpacity(0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(_liabilityTypeIcons[typeIdx], color: NestColors.expense, size: 20),
            ),
            const SizedBox(width: 14),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(liability.name, style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w600, color: NestColors.text1)),
              Text(
                '${_liabilityTypeLabels[typeIdx]}${liability.lenderName != null ? " · ${liability.lenderName}" : ""}',
                style: const TextStyle(fontSize: 11.5, color: NestColors.text4),
                maxLines: 1, overflow: TextOverflow.ellipsis,
              ),
            ])),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text(
                formatMoney(liability.currentBalance),
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: NestColors.expense, fontFamily: 'InterTight'),
              ),
              Text(
                'of ${formatMoney(liability.originalAmount)}',
                style: const TextStyle(fontSize: 11, color: NestColors.text4),
              ),
            ]),
          ]),
          const SizedBox(height: 12),
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text('Paid off', style: const TextStyle(fontSize: 11, color: NestColors.text4)),
            Text('$paidPctDisplay%', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: NestColors.income)),
          ]),
          const SizedBox(height: 5),
          ClipRRect(
            borderRadius: BorderRadius.circular(99),
            child: LinearProgressIndicator(
              value: paidPct,
              backgroundColor: Colors.white.withOpacity(0.06),
              valueColor: const AlwaysStoppedAnimation(NestColors.income),
              minHeight: 6,
            ),
          ),
          Padding(
            padding: const EdgeInsets.only(top: 10),
            child: Row(children: [
              if (liability.interestRate != null) ...[
                const Icon(Icons.percent, color: NestColors.text4, size: 13),
                const SizedBox(width: 3),
                Text('${liability.interestRate!.toStringAsFixed(1)}% APR', style: const TextStyle(fontSize: 11, color: NestColors.text4)),
                const SizedBox(width: 16),
              ],
              if (liability.monthlyPayment != null) ...[
                const Icon(Icons.calendar_month_outlined, color: NestColors.text4, size: 13),
                const SizedBox(width: 3),
                Text('${formatMoney(liability.monthlyPayment!)}/mo', style: const TextStyle(fontSize: 11, color: NestColors.text4)),
                const SizedBox(width: 16),
              ],
              const Spacer(),
              GestureDetector(
                onTap: onUpdateTap,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: NestColors.income.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(99),
                    border: Border.all(color: NestColors.income.withOpacity(0.25)),
                  ),
                  child: const Text('Update', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: NestColors.income)),
                ),
              ),
            ]),
          ),
        ]),
      ),
    );
  }
}

class _HeroStat extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _HeroStat({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontSize: 11, color: Colors.white60)),
      const SizedBox(height: 2),
      Text(value, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: color, fontFamily: 'InterTight')),
    ]);
  }
}
