import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/nest_api.dart';
import '../../core/auth/auth_provider.dart';
import '../../core/theme/app_theme.dart';

// ── Data class ────────────────────────────────────────────────────────────────

class _DashboardData {
  final DashboardSummary summary;
  final List<CategoryDto> categories;
  final List<BudgetDto> budgets;
  final List<CategorySpend> spending;
  final List<ActivityLogDto> activity;
  const _DashboardData({required this.summary, required this.categories, required this.budgets, required this.spending, required this.activity});
}

final _dashboardProvider = FutureProvider.autoDispose<_DashboardData>((ref) async {
  final api = ref.read(nestApiProvider);
  final wsId = ref.read(authSessionProvider).workspaceId;

  final results = await Future.wait([
    api.getSummary(wsId),
    api.getCategories(wsId),
    api.getBudgets(wsId),
    api.getSpendingByCategory(wsId),
    api.getActivity(wsId),
  ]);

  return _DashboardData(
    summary: results[0] as DashboardSummary,
    categories: results[1] as List<CategoryDto>,
    budgets: results[2] as List<BudgetDto>,
    spending: results[3] as List<CategorySpend>,
    activity: results[4] as List<ActivityLogDto>,
  );
});

// ── Screen ────────────────────────────────────────────────────────────────────

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(authSessionProvider);
    final dataAsync = ref.watch(_dashboardProvider);

    return Scaffold(
      body: RefreshIndicator(
        color: NestColors.indigo,
        backgroundColor: NestColors.surface,
        onRefresh: () => ref.refresh(_dashboardProvider.future),
        child: SafeArea(
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
            child: dataAsync.when(
              loading: () => const _LoadingBody(),
              error: (e, _) => _ErrorBody(message: e.toString(), onRetry: () => ref.refresh(_dashboardProvider)),
              data: (data) => _Body(session: session, data: data),
            ),
          ),
        ),
      ),
    );
  }
}

class _LoadingBody extends StatelessWidget {
  const _LoadingBody();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: MediaQuery.of(context).size.height * 0.8,
      child: const Center(
        child: CircularProgressIndicator(color: NestColors.indigo, strokeWidth: 2.5),
      ),
    );
  }
}

class _ErrorBody extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorBody({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: MediaQuery.of(context).size.height * 0.7,
      child: Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Icon(Icons.wifi_off_rounded, color: NestColors.text4, size: 48),
          const SizedBox(height: 16),
          Text(message, style: const TextStyle(color: NestColors.text3, fontSize: 13), textAlign: TextAlign.center),
          const SizedBox(height: 20),
          TextButton(
            onPressed: onRetry,
            child: const Text('Retry', style: TextStyle(color: NestColors.indigoL)),
          ),
        ]),
      ),
    );
  }
}

class _Body extends StatelessWidget {
  final AuthSession session;
  final _DashboardData data;
  const _Body({required this.session, required this.data});

  @override
  Widget build(BuildContext context) {
    final catMap = {for (final c in data.categories) c.id: c};
    final spendMap = {for (final s in data.spending) s.categoryId: s.total};

    final totalBalance = data.summary.accounts.fold(0.0, (s, a) => s + a.balance);
    final savingsRate = data.summary.income > 0
        ? (data.summary.saved / data.summary.income * 100).round()
        : 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _AppBarRow(session: session),
        const SizedBox(height: 18),
        _NetWorthCard(netWorth: totalBalance, income: data.summary.income, expense: data.summary.expense),
        const SizedBox(height: 14),
        Row(children: [
          Expanded(child: _SummaryCard(
            icon: Icons.south_west, iconColor: NestColors.income, label: 'Income',
            amount: formatCurrency(data.summary.income),
            sub: '$savingsRate% saved',
          )),
          const SizedBox(width: 12),
          Expanded(child: _SummaryCard(
            icon: Icons.north_east, iconColor: NestColors.expense, label: 'Expenses',
            amount: formatCurrency(data.summary.expense),
          )),
        ]),
        const SizedBox(height: 18),
        if (data.budgets.isNotEmpty) ...[
          _BudgetSection(budgets: data.budgets, catMap: catMap, spendMap: spendMap),
          const SizedBox(height: 18),
        ],
        if (data.summary.upcomingPayments.isNotEmpty) ...[
          _UpcomingSection(payments: data.summary.upcomingPayments),
          const SizedBox(height: 18),
        ],
        if (data.summary.accounts.isNotEmpty) ...[
          _AccountsSection(accounts: data.summary.accounts),
          const SizedBox(height: 18),
        ],
        if (data.activity.isNotEmpty) ...[
          _ActivitySection(events: data.activity),
        ],
        const SizedBox(height: 80),
      ],
    );
  }
}

// ── App bar ───────────────────────────────────────────────────────────────────

class _AppBarRow extends ConsumerWidget {
  final AuthSession session;
  const _AppBarRow({required this.session});

  String _greeting() {
    final h = DateTime.now().hour;
    if (h < 12) return 'Good morning,';
    if (h < 17) return 'Good afternoon,';
    return 'Good evening,';
  }

  void _showWorkspaceSwitcher(BuildContext context, WidgetRef ref) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => _WorkspaceSwitcherSheet(
        currentId: session.workspaceId,
        onSwitch: (ws) {
          ref.read(authNotifierProvider.notifier).switchWorkspace(ws);
          ref.refresh(_dashboardProvider);
          Navigator.of(context).pop();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Row(
      children: [
        GestureDetector(
          onTap: () async {
            final ok = await showDialog<bool>(
              context: context,
              builder: (_) => AlertDialog(
                backgroundColor: NestColors.surface,
                title: const Text('Sign out?', style: TextStyle(color: NestColors.text1)),
                content: const Text('You will need to sign in again.', style: TextStyle(color: NestColors.text3)),
                actions: [
                  TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
                  TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Sign out', style: TextStyle(color: NestColors.expense))),
                ],
              ),
            );
            if (ok == true) ref.read(authNotifierProvider.notifier).logout();
          },
          child: Container(
            width: 38, height: 38,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(colors: [Color(0xFFFB7185), Color(0xFFA78BFA)]),
            ),
            alignment: Alignment.center,
            child: Text(session.initials, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF0B0E14))),
          ),
        ),
        const SizedBox(width: 11),
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(_greeting(), style: Theme.of(context).textTheme.labelSmall),
          Text(session.displayName, style: Theme.of(context).textTheme.titleMedium),
        ]),
        const Spacer(),
        // Workspace switcher button
        GestureDetector(
          onTap: () => _showWorkspaceSwitcher(context, ref),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: NestColors.surface,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: NestColors.border),
            ),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              const Icon(Icons.group_outlined, color: NestColors.indigoL, size: 15),
              const SizedBox(width: 5),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 90),
                child: Text(session.workspaceName, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: NestColors.text2), overflow: TextOverflow.ellipsis),
              ),
              const SizedBox(width: 3),
              const Icon(Icons.unfold_more, color: NestColors.text4, size: 14),
            ]),
          ),
        ),
      ],
    );
  }
}

// ── Net worth card ────────────────────────────────────────────────────────────

class _NetWorthCard extends StatelessWidget {
  final double netWorth;
  final double income;
  final double expense;
  const _NetWorthCard({required this.netWorth, required this.income, required this.expense});

  @override
  Widget build(BuildContext context) {
    final saved = income - expense;
    final momPct = income > 0 ? (saved / income * 100) : 0.0;
    final isPositive = saved >= 0;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF6366F1), Color(0xFF2DD4BF)],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'TOTAL BALANCE',
            style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, letterSpacing: 1.2, color: Color(0x99000000)),
          ),
          const SizedBox(height: 6),
          Text(
            formatCurrency(netWorth),
            style: const TextStyle(fontFamily: 'InterTight', fontSize: 34, fontWeight: FontWeight.w800, color: Color(0xFF0B0E14), letterSpacing: -1),
          ),
          const SizedBox(height: 8),
          Row(children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.4),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Row(children: [
                Icon(isPositive ? Icons.arrow_upward : Icons.arrow_downward, size: 13, color: const Color(0xFF0B0E14)),
                const SizedBox(width: 2),
                Text('${momPct.abs().toStringAsFixed(1)}%',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF0B0E14))),
              ]),
            ),
            const SizedBox(width: 8),
            Text(
              '${isPositive ? "+" : ""}${formatCurrency(saved)} saved this month',
              style: TextStyle(fontSize: 12, color: const Color(0xFF0B0E14).withOpacity(0.65), fontWeight: FontWeight.w500),
            ),
          ]),
        ],
      ),
    );
  }
}

// ── Summary card ──────────────────────────────────────────────────────────────

class _SummaryCard extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String label;
  final String amount;
  final String? sub;
  const _SummaryCard({required this.icon, required this.iconColor, required this.label, required this.amount, this.sub});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: NestColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: NestColors.border),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(icon, color: iconColor, size: 16),
          const SizedBox(width: 6),
          Text(label, style: const TextStyle(fontSize: 11, color: NestColors.text3)),
        ]),
        const SizedBox(height: 8),
        Text(amount, style: const TextStyle(fontFamily: 'InterTight', fontSize: 20, fontWeight: FontWeight.w700, color: NestColors.text1)),
        if (sub != null)
          Text(sub!, style: const TextStyle(fontSize: 10.5, color: NestColors.text4)),
      ]),
    );
  }
}

// ── Budget section ────────────────────────────────────────────────────────────

class _BudgetSection extends StatelessWidget {
  final List<BudgetDto> budgets;
  final Map<String, CategoryDto> catMap;
  final Map<String, double> spendMap;
  const _BudgetSection({required this.budgets, required this.catMap, required this.spendMap});

  Color _parseHex(String hex) {
    final h = hex.replaceAll('#', '');
    return Color(int.parse('FF$h', radix: 16));
  }

  @override
  Widget build(BuildContext context) {
    final items = budgets
        .where((b) => catMap.containsKey(b.categoryId))
        .take(5)
        .toList();

    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Text('Budgets', style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700, color: NestColors.text1)),
        Text('See all', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: NestColors.indigoL)),
      ]),
      const SizedBox(height: 12),
      SizedBox(
        height: 90,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          itemCount: items.length,
          separatorBuilder: (_, __) => const SizedBox(width: 16),
          itemBuilder: (_, i) {
            final b = items[i];
            final cat = catMap[b.categoryId]!;
            final spent = spendMap[b.categoryId] ?? 0.0;
            final pct = b.amountLimit > 0 ? (spent / b.amountLimit).clamp(0.0, 1.0) : 0.0;
            final isOver = spent > b.amountLimit;
            final color = _parseHex(cat.color);

            return Column(children: [
              SizedBox(
                width: 62, height: 62,
                child: Stack(alignment: Alignment.center, children: [
                  CircularProgressIndicator(
                    value: pct,
                    backgroundColor: Colors.white.withOpacity(0.08),
                    valueColor: AlwaysStoppedAnimation(isOver ? NestColors.expense : color),
                    strokeWidth: 4,
                  ),
                  Container(
                    width: 46, height: 46,
                    decoration: const BoxDecoration(shape: BoxShape.circle, color: NestColors.base),
                    child: Icon(Icons.category, color: color, size: 20),
                  ),
                ]),
              ),
              const SizedBox(height: 8),
              Text(
                cat.name.length > 8 ? '${cat.name.substring(0, 7)}…' : cat.name,
                style: TextStyle(fontSize: 10.5, color: isOver ? NestColors.expense : NestColors.text3),
              ),
            ]);
          },
        ),
      ),
    ]);
  }
}

// ── Upcoming payments ─────────────────────────────────────────────────────────

class _UpcomingSection extends StatelessWidget {
  final List<UpcomingPaymentDto> payments;
  const _UpcomingSection({required this.payments});

  _DueInfo _dueInfo(String dueDate) {
    final due = DateTime.tryParse(dueDate);
    if (due == null) return _DueInfo('Unknown', NestColors.text4, false);
    final today = DateTime(DateTime.now().year, DateTime.now().month, DateTime.now().day);
    final diff = due.difference(today).inDays;
    if (diff < 0) return _DueInfo('Overdue by ${-diff} day${-diff == 1 ? '' : 's'}', NestColors.expense, true);
    if (diff == 0) return _DueInfo('Due today', NestColors.amber, false);
    return _DueInfo('Due in $diff day${diff == 1 ? '' : 's'}', NestColors.text4, false);
  }

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Text('Upcoming', style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700, color: NestColors.text1)),
        Text('View all', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: NestColors.indigoL)),
      ]),
      const SizedBox(height: 10),
      ...payments.map((p) {
        final info = _dueInfo(p.dueDate);
        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: NestColors.surface,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: info.isOverdue ? NestColors.expense.withOpacity(0.3) : NestColors.border),
          ),
          child: Row(children: [
            Container(
              width: 36, height: 36,
              decoration: BoxDecoration(
                color: (info.isOverdue ? NestColors.expense : NestColors.indigoL).withOpacity(0.14),
                borderRadius: BorderRadius.circular(11),
              ),
              child: Icon(Icons.event_outlined, color: info.isOverdue ? NestColors.expense : NestColors.indigoL, size: 19),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(p.name, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600, color: NestColors.text1)),
              Text(info.text, style: TextStyle(fontSize: 11, color: info.color)),
            ])),
            Text(formatCurrency(p.amount, p.currency),
              style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600, color: NestColors.text1)),
          ]),
        );
      }),
    ]);
  }
}

class _DueInfo {
  final String text;
  final Color color;
  final bool isOverdue;
  const _DueInfo(this.text, this.color, this.isOverdue);
}

// ── Accounts section ──────────────────────────────────────────────────────────

class _AccountsSection extends StatelessWidget {
  final List<AccountDto> accounts;
  const _AccountsSection({required this.accounts});

  Color _parseHex(String hex) {
    final h = hex.replaceAll('#', '');
    return Color(int.parse('FF$h', radix: 16));
  }

  @override
  Widget build(BuildContext context) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('Accounts', style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700, color: NestColors.text1)),
      const SizedBox(height: 10),
      ...accounts.take(4).map((a) {
        final color = _parseHex(a.color);
        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: NestColors.surface,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: NestColors.border),
          ),
          child: Row(children: [
            Container(
              width: 36, height: 36,
              decoration: BoxDecoration(color: color.withOpacity(0.14), borderRadius: BorderRadius.circular(11)),
              child: Icon(Icons.account_balance_outlined, color: color, size: 19),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(a.name, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600, color: NestColors.text1)),
              Text(a.currency, style: const TextStyle(fontSize: 11, color: NestColors.text4)),
            ])),
            Text(formatCurrency(a.balance, a.currency),
              style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600, color: a.balance >= 0 ? NestColors.text1 : NestColors.expense)),
          ]),
        );
      }),
    ]);
  }
}

// ── Activity section ──────────────────────────────────────────────────────────

class _ActivitySection extends StatelessWidget {
  final List<ActivityLogDto> events;
  const _ActivitySection({required this.events});

  String _timeAgo(String iso) {
    final dt = DateTime.tryParse(iso);
    if (dt == null) return '';
    final diff = DateTime.now().toUtc().difference(dt.toUtc());
    if (diff.inSeconds < 60) return 'just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }

  IconData _actionIcon(String action) {
    if (action.contains('created')) return Icons.add_circle_outline;
    if (action.contains('deleted')) return Icons.remove_circle_outline;
    if (action.contains('updated')) return Icons.edit_outlined;
    return Icons.history_outlined;
  }

  Color _actionColor(String action) {
    if (action.contains('created')) return NestColors.income;
    if (action.contains('deleted')) return NestColors.expense;
    return NestColors.indigoL;
  }

  @override
  Widget build(BuildContext context) {
    final shown = events.take(8).toList();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('Recent Activity', style: TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700, color: NestColors.text1)),
      const SizedBox(height: 10),
      Container(
        decoration: BoxDecoration(
          color: NestColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: NestColors.border),
        ),
        child: Column(
          children: shown.asMap().entries.map((entry) {
            final i = entry.key;
            final e = entry.value;
            final color = _actionColor(e.action);
            return Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
              decoration: BoxDecoration(
                border: i < shown.length - 1 ? const Border(bottom: BorderSide(color: Color(0x0DFFFFFF))) : null,
              ),
              child: Row(children: [
                Container(
                  width: 30, height: 30,
                  decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(9)),
                  child: Icon(_actionIcon(e.action), color: color, size: 15),
                ),
                const SizedBox(width: 11),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(e.description, style: const TextStyle(fontSize: 12.5, color: NestColors.text1, fontWeight: FontWeight.w500), maxLines: 1, overflow: TextOverflow.ellipsis),
                  Text(e.userName, style: const TextStyle(fontSize: 11, color: NestColors.text4)),
                ])),
                Text(_timeAgo(e.createdAt), style: const TextStyle(fontSize: 11, color: NestColors.text4)),
              ]),
            );
          }).toList(),
        ),
      ),
    ]);
  }
}

// ── Workspace switcher sheet ──────────────────────────────────────────────────

class _WorkspaceSwitcherSheet extends ConsumerStatefulWidget {
  final String currentId;
  final void Function(WorkspaceDto ws) onSwitch;
  const _WorkspaceSwitcherSheet({required this.currentId, required this.onSwitch});

  @override
  ConsumerState<_WorkspaceSwitcherSheet> createState() => _WorkspaceSwitcherSheetState();
}

class _WorkspaceSwitcherSheetState extends ConsumerState<_WorkspaceSwitcherSheet> {
  List<WorkspaceDto>? _workspaces;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final list = await ref.read(nestApiProvider).getWorkspaces();
      if (mounted) setState(() { _workspaces = list; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
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
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 4, 20, 12),
            child: Row(children: [
              Text('Switch Workspace', style: TextStyle(fontFamily: 'InterTight', fontWeight: FontWeight.w700, fontSize: 17, color: NestColors.text1)),
            ]),
          ),
          if (_loading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child: CircularProgressIndicator(color: NestColors.indigo, strokeWidth: 2),
            )
          else if (_workspaces == null || _workspaces!.isEmpty)
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 0, 20, 28),
              child: Text('No other workspaces found.', style: TextStyle(color: NestColors.text4, fontSize: 13)),
            )
          else
            ...(_workspaces!.map((ws) {
              final isCurrent = ws.id == widget.currentId;
              return GestureDetector(
                onTap: isCurrent ? null : () => widget.onSwitch(ws),
                child: Container(
                  margin: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: isCurrent ? const Color(0xFF6366F1).withOpacity(0.1) : NestColors.base.withOpacity(0.6),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: isCurrent ? const Color(0xFF6366F1).withOpacity(0.35) : NestColors.border),
                  ),
                  child: Row(children: [
                    Container(
                      width: 34, height: 34,
                      decoration: BoxDecoration(
                        color: isCurrent ? const Color(0xFF6366F1).withOpacity(0.18) : Colors.white.withOpacity(0.06),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(Icons.group_outlined, color: isCurrent ? NestColors.indigoL : NestColors.text4, size: 18),
                    ),
                    const SizedBox(width: 12),
                    Expanded(child: Text(ws.name, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: isCurrent ? NestColors.text1 : NestColors.text2))),
                    if (isCurrent) const Icon(Icons.check, color: NestColors.indigoL, size: 18),
                  ]),
                ),
              );
            })),
          const SizedBox(height: 12),
        ],
      ),
    );
  }
}
