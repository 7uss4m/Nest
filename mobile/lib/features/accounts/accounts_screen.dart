import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/nest_api.dart';
import '../../core/auth/auth_provider.dart';
import '../../core/theme/app_theme.dart';

final _accountsProvider = FutureProvider.autoDispose<List<AccountDto>>((ref) async {
  final api = ref.read(nestApiProvider);
  final wsId = ref.read(authSessionProvider).workspaceId;
  return api.getAccounts(wsId);
});

const _typeLabels = ['Checking', 'Savings', 'Investment', 'Credit Card', 'Cash', 'Wallet', 'Loan', 'Other'];
const _typeIcons = [
  Icons.account_balance_outlined,
  Icons.savings_outlined,
  Icons.trending_up_outlined,
  Icons.credit_card_outlined,
  Icons.payments_outlined,
  Icons.account_balance_wallet_outlined,
  Icons.money_off_outlined,
  Icons.more_horiz,
];

class AccountsScreen extends ConsumerWidget {
  const AccountsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dataAsync = ref.watch(_accountsProvider);

    return Scaffold(
      appBar: AppBar(
        leading: const BackButton(color: NestColors.text1),
        title: const Text('Accounts', style: TextStyle(fontFamily: 'InterTight', fontWeight: FontWeight.w700, fontSize: 18, color: NestColors.text1)),
        backgroundColor: NestColors.base,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
      ),
      body: RefreshIndicator(
        color: NestColors.indigo,
        backgroundColor: NestColors.surface,
        onRefresh: () => ref.refresh(_accountsProvider.future),
        child: dataAsync.when(
          loading: () => const Center(child: CircularProgressIndicator(color: NestColors.indigo, strokeWidth: 2.5)),
          error: (e, _) => Center(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              const Icon(Icons.wifi_off_rounded, color: NestColors.text4, size: 40),
              const SizedBox(height: 12),
              Text(e.toString(), style: const TextStyle(color: NestColors.text3, fontSize: 13), textAlign: TextAlign.center),
              const SizedBox(height: 16),
              TextButton(onPressed: () => ref.refresh(_accountsProvider), child: const Text('Retry', style: TextStyle(color: NestColors.indigoL))),
            ]),
          ),
          data: (accounts) => _AccountList(accounts: accounts),
        ),
      ),
    );
  }
}

class _AccountList extends StatelessWidget {
  final List<AccountDto> accounts;
  const _AccountList({required this.accounts});

  Color _parseHex(String hex) {
    final h = hex.replaceAll('#', '');
    return Color(int.parse('FF$h', radix: 16));
  }

  @override
  Widget build(BuildContext context) {
    if (accounts.isEmpty) {
      return const Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Icon(Icons.account_balance_outlined, size: 48, color: NestColors.text4),
          SizedBox(height: 16),
          Text('No accounts yet', style: TextStyle(color: NestColors.text2, fontSize: 15, fontWeight: FontWeight.w600)),
          SizedBox(height: 6),
          Text('Create accounts on the web app to get started.', style: TextStyle(color: NestColors.text4, fontSize: 13)),
        ]),
      );
    }

    // Debt accounts (Credit Card, Loan) have negative-style balances shown separately
    final isDebt = (AccountDto a) => a.type == 3 || a.type == 6;
    final totalAssets = accounts.where((a) => !isDebt(a)).fold(0.0, (s, a) => s + a.balance.clamp(0, double.infinity));
    final totalDebt = accounts.where(isDebt).fold(0.0, (s, a) => s + a.balance.abs());
    final net = totalAssets - totalDebt;

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
                  colors: [Color(0xFF3B3FBB), Color(0xFF1A9B8A)],
                ),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Net Balance', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Colors.white70)),
                const SizedBox(height: 6),
                Text(
                  formatCurrency(net),
                  style: const TextStyle(fontFamily: 'InterTight', fontWeight: FontWeight.w800, fontSize: 30, color: Colors.white),
                ),
                const SizedBox(height: 14),
                Row(children: [
                  _HeroStat(label: 'Assets', value: formatCurrency(totalAssets), color: NestColors.income),
                  const SizedBox(width: 24),
                  _HeroStat(label: 'Debt', value: formatCurrency(totalDebt), color: NestColors.expense),
                ]),
              ]),
            ),
          ),
        ),
        SliverList(
          delegate: SliverChildBuilderDelegate(
            (context, i) {
              final a = accounts[i];
              final color = _parseHex(a.color);
              final typeIdx = a.type.clamp(0, _typeLabels.length - 1);
              final isDebtAcct = a.type == 3 || a.type == 6;
              final balColor = a.balance < 0 ? NestColors.expense : isDebtAcct ? NestColors.expense : NestColors.text1;

              return Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: NestColors.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: NestColors.border),
                  ),
                  child: Row(children: [
                    Container(
                      width: 44, height: 44,
                      decoration: BoxDecoration(color: color.withOpacity(0.14), borderRadius: BorderRadius.circular(12)),
                      child: Icon(_typeIcons[typeIdx], color: color, size: 22),
                    ),
                    const SizedBox(width: 14),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(a.name, style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w600, color: NestColors.text1)),
                      Text(
                        '${_typeLabels[typeIdx]} · ${a.currency}',
                        style: const TextStyle(fontSize: 11.5, color: NestColors.text4),
                      ),
                    ])),
                    Text(
                      formatCurrency(a.balance.abs()),
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: balColor, fontFamily: 'InterTight'),
                    ),
                  ]),
                ),
              );
            },
            childCount: accounts.length,
          ),
        ),
        const SliverToBoxAdapter(child: SizedBox(height: 24)),
      ],
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
