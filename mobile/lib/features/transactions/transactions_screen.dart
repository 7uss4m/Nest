import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/nest_api.dart';
import '../../core/auth/auth_provider.dart';
import '../../core/theme/app_theme.dart';

// ── Provider ──────────────────────────────────────────────────────────────────

final _txProvider = FutureProvider.autoDispose<_TxData>((ref) async {
  final api = ref.read(nestApiProvider);
  final wsId = ref.read(authSessionProvider).workspaceId;

  final pageFut = api.getTransactions(wsId, pageSize: 50);
  final catsFut = api.getCategories(wsId);
  final acctsFut = api.getAccounts(wsId);

  return _TxData(
    page: await pageFut,
    categories: await catsFut,
    accounts: await acctsFut,
  );
});

class _TxData {
  final TransactionPage page;
  final List<CategoryDto> categories;
  final List<AccountDto> accounts;
  const _TxData({required this.page, required this.categories, required this.accounts});
}

// ── Screen ────────────────────────────────────────────────────────────────────

const _typeLabels = ['Income', 'Expense', 'Transfer'];
const _typeColors = [NestColors.income, NestColors.expense, NestColors.indigoL];

class TransactionsScreen extends ConsumerWidget {
  const TransactionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dataAsync = ref.watch(_txProvider);

    return Scaffold(
      body: RefreshIndicator(
        color: NestColors.indigo,
        backgroundColor: NestColors.surface,
        onRefresh: () => ref.refresh(_txProvider.future),
        child: SafeArea(
          child: dataAsync.when(
            loading: () => const Center(child: CircularProgressIndicator(color: NestColors.indigo, strokeWidth: 2.5)),
            error: (e, _) => Center(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                const Icon(Icons.wifi_off_rounded, color: NestColors.text4, size: 40),
                const SizedBox(height: 12),
                Text(e.toString(), style: const TextStyle(color: NestColors.text3, fontSize: 13), textAlign: TextAlign.center),
                const SizedBox(height: 16),
                TextButton(onPressed: () => ref.refresh(_txProvider), child: const Text('Retry', style: TextStyle(color: NestColors.indigoL))),
              ]),
            ),
            data: (data) => _TxList(data: data),
          ),
        ),
      ),
    );
  }
}

class _TxList extends StatelessWidget {
  final _TxData data;
  const _TxList({required this.data});

  @override
  Widget build(BuildContext context) {
    final catMap = {for (final c in data.categories) c.id: c};
    final acctMap = {for (final a in data.accounts) a.id: a};
    final items = data.page.items;

    if (items.isEmpty) {
      return const Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Icon(Icons.receipt_long_outlined, size: 48, color: NestColors.text4),
          SizedBox(height: 16),
          Text('No transactions yet', style: TextStyle(color: NestColors.text2, fontSize: 15, fontWeight: FontWeight.w600)),
          SizedBox(height: 6),
          Text('Tap + to add your first transaction.', style: TextStyle(color: NestColors.text4, fontSize: 13)),
        ]),
      );
    }

    // Group by date
    final Map<String, List<TransactionDto>> grouped = {};
    for (final tx in items) {
      final key = tx.date.substring(0, 10);
      grouped.putIfAbsent(key, () => []).add(tx);
    }
    final dates = grouped.keys.toList()..sort((a, b) => b.compareTo(a));

    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(18, 16, 18, 4),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Transactions', style: TextStyle(fontFamily: 'InterTight', fontWeight: FontWeight.w800, fontSize: 26, color: NestColors.text1)),
                Text('${data.page.totalCount} total', style: const TextStyle(fontSize: 12, color: NestColors.text4)),
              ],
            ),
          ),
        ),
        for (final date in dates) ...[
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(18, 14, 18, 6),
              child: Text(_formatDate(date), style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: NestColors.text4, letterSpacing: 0.3)),
            ),
          ),
          SliverList(
            delegate: SliverChildBuilderDelegate(
              (context, i) {
                final tx = grouped[date]![i];
                return _TxTile(tx: tx, cat: catMap[tx.categoryId], acct: acctMap[tx.accountId]);
              },
              childCount: grouped[date]!.length,
            ),
          ),
        ],
        const SliverToBoxAdapter(child: SizedBox(height: 100)),
      ],
    );
  }

  String _formatDate(String iso) {
    final dt = DateTime.tryParse(iso);
    if (dt == null) return iso;
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final d = DateTime(dt.year, dt.month, dt.day);
    if (d == today) return 'Today';
    if (d == today.subtract(const Duration(days: 1))) return 'Yesterday';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${months[dt.month - 1]} ${dt.day}, ${dt.year}';
  }
}

class _TxTile extends StatelessWidget {
  final TransactionDto tx;
  final CategoryDto? cat;
  final AccountDto? acct;
  const _TxTile({required this.tx, this.cat, this.acct});

  Color _parseHex(String hex) {
    final h = hex.replaceAll('#', '');
    return Color(int.parse('FF$h', radix: 16));
  }

  @override
  Widget build(BuildContext context) {
    final typeColor = _typeColors[tx.type.clamp(0, 2)];
    final catColor = cat != null ? _parseHex(cat!.color) : NestColors.indigoL;
    final isExpense = tx.type == 1;
    final sign = isExpense ? '-' : tx.type == 0 ? '+' : '';

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
        decoration: BoxDecoration(
          color: NestColors.surface,
          borderRadius: BorderRadius.circular(13),
          border: Border.all(color: NestColors.border),
        ),
        child: Row(
          children: [
            Container(
              width: 36, height: 36,
              decoration: BoxDecoration(color: catColor.withOpacity(0.14), borderRadius: BorderRadius.circular(10)),
              child: Icon(Icons.category_outlined, color: catColor, size: 18),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(
                  tx.payee ?? cat?.name ?? _typeLabels[tx.type.clamp(0, 2)],
                  style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600, color: NestColors.text1),
                  maxLines: 1, overflow: TextOverflow.ellipsis,
                ),
                if (tx.note != null && tx.note!.isNotEmpty)
                  Text(tx.note!, style: const TextStyle(fontSize: 11, color: NestColors.text4), maxLines: 1, overflow: TextOverflow.ellipsis)
                else if (acct != null)
                  Text(acct!.name, style: const TextStyle(fontSize: 11, color: NestColors.text4)),
              ]),
            ),
            Text(
              '$sign${formatMoney(tx.amount)}',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: typeColor),
            ),
          ],
        ),
      ),
    );
  }
}
