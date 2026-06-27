import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/nest_api.dart';
import '../../core/auth/auth_provider.dart';
import '../../core/theme/app_theme.dart';

final _paymentsProvider = FutureProvider.autoDispose<List<PlannedPaymentDto>>((ref) async {
  final api = ref.read(nestApiProvider);
  final wsId = ref.read(authSessionProvider).workspaceId;
  return api.getPlannedPayments(wsId);
});

class PlannedPaymentsScreen extends ConsumerStatefulWidget {
  const PlannedPaymentsScreen({super.key});

  @override
  ConsumerState<PlannedPaymentsScreen> createState() => _PlannedPaymentsScreenState();
}

class _PlannedPaymentsScreenState extends ConsumerState<PlannedPaymentsScreen> {
  int _filter = 0; // 0=All, 1=Upcoming, 2=Overdue, 3=Paid

  List<PlannedPaymentDto> _applyFilter(List<PlannedPaymentDto> all) {
    final today = DateTime.now();
    final todayOnly = DateTime(today.year, today.month, today.day);

    return all.where((p) {
      final due = DateTime.tryParse(p.dueDate);
      final dueOnly = due != null ? DateTime(due.year, due.month, due.day) : null;
      switch (_filter) {
        case 1: return !p.isPaid;
        case 2: return !p.isPaid && dueOnly != null && dueOnly.isBefore(todayOnly);
        case 3: return p.isPaid;
        default: return true;
      }
    }).toList()
      ..sort((a, b) {
        if (a.isPaid != b.isPaid) return a.isPaid ? 1 : -1;
        return a.dueDate.compareTo(b.dueDate);
      });
  }

  Future<void> _markPaid(String id) async {
    try {
      final api = ref.read(nestApiProvider);
      final wsId = ref.read(authSessionProvider).workspaceId;
      await api.markPaymentPaid(wsId, id);
      ref.invalidate(_paymentsProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: NestColors.expense),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final dataAsync = ref.watch(_paymentsProvider);

    return Scaffold(
      appBar: AppBar(
        leading: const BackButton(color: NestColors.text1),
        title: const Text('Planned Payments', style: TextStyle(fontFamily: 'InterTight', fontWeight: FontWeight.w700, fontSize: 18, color: NestColors.text1)),
        backgroundColor: NestColors.base,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
      ),
      body: RefreshIndicator(
        color: NestColors.indigo,
        backgroundColor: NestColors.surface,
        onRefresh: () => ref.refresh(_paymentsProvider.future),
        child: dataAsync.when(
          loading: () => const Center(child: CircularProgressIndicator(color: NestColors.indigo, strokeWidth: 2.5)),
          error: (e, _) => Center(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              const Icon(Icons.wifi_off_rounded, color: NestColors.text4, size: 40),
              const SizedBox(height: 12),
              Text(e.toString(), style: const TextStyle(color: NestColors.text3, fontSize: 13), textAlign: TextAlign.center),
              const SizedBox(height: 16),
              TextButton(onPressed: () => ref.refresh(_paymentsProvider), child: const Text('Retry', style: TextStyle(color: NestColors.indigoL))),
            ]),
          ),
          data: (all) {
            final payments = _applyFilter(all);
            final overdueCount = all.where((p) {
              if (p.isPaid) return false;
              final due = DateTime.tryParse(p.dueDate);
              return due != null && due.isBefore(DateTime.now());
            }).length;

            return CustomScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              slivers: [
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      // Summary strip
                      if (overdueCount > 0)
                        Container(
                          margin: const EdgeInsets.only(bottom: 14),
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          decoration: BoxDecoration(
                            color: NestColors.expense.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: NestColors.expense.withOpacity(0.3)),
                          ),
                          child: Row(children: [
                            const Icon(Icons.warning_amber_rounded, color: NestColors.expense, size: 18),
                            const SizedBox(width: 10),
                            Text(
                              '$overdueCount payment${overdueCount == 1 ? "" : "s"} overdue',
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: NestColors.expense),
                            ),
                          ]),
                        ),
                      // Filter chips
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(children: [
                          for (int i = 0; i < 4; i++)
                            Padding(
                              padding: const EdgeInsets.only(right: 8),
                              child: ChoiceChip(
                                label: Text(['All', 'Upcoming', 'Overdue', 'Paid'][i]),
                                selected: _filter == i,
                                onSelected: (_) => setState(() => _filter = i),
                                selectedColor: NestColors.indigo.withOpacity(0.28),
                                side: BorderSide(color: _filter == i ? NestColors.indigoL : NestColors.border),
                                labelStyle: TextStyle(
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w500,
                                  color: _filter == i ? NestColors.indigoL : NestColors.text3,
                                ),
                                backgroundColor: NestColors.surface,
                                showCheckmark: false,
                              ),
                            ),
                        ]),
                      ),
                    ]),
                  ),
                ),
                if (payments.isEmpty)
                  SliverFillRemaining(
                    hasScrollBody: false,
                    child: Center(
                      child: Column(mainAxisSize: MainAxisSize.min, children: [
                        const Icon(Icons.event_repeat_outlined, size: 48, color: NestColors.text4),
                        const SizedBox(height: 16),
                        Text(
                          _filter == 0 ? 'No planned payments yet' : 'None in this category',
                          style: const TextStyle(color: NestColors.text2, fontSize: 15, fontWeight: FontWeight.w600),
                        ),
                        if (_filter == 0) ...[
                          const SizedBox(height: 6),
                          const Text('Create payments on the web app.', style: TextStyle(color: NestColors.text4, fontSize: 13)),
                        ],
                      ]),
                    ),
                  )
                else
                  SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, i) => _PaymentTile(
                        payment: payments[i],
                        onMarkPaid: payments[i].isPaid ? null : () => _markPaid(payments[i].id),
                      ),
                      childCount: payments.length,
                    ),
                  ),
                const SliverToBoxAdapter(child: SizedBox(height: 24)),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _PaymentTile extends StatelessWidget {
  final PlannedPaymentDto payment;
  final VoidCallback? onMarkPaid;
  const _PaymentTile({required this.payment, this.onMarkPaid});

  static const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  String _dueLabel() {
    final due = DateTime.tryParse(payment.dueDate);
    if (due == null) return payment.dueDate;
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final d = DateTime(due.year, due.month, due.day);
    final diff = d.difference(today).inDays;
    if (diff < 0) return 'Overdue by ${(-diff)} day${(-diff) == 1 ? "" : "s"}';
    if (diff == 0) return 'Due today';
    if (diff == 1) return 'Due tomorrow';
    if (diff <= 7) return 'Due in $diff days';
    return '${_months[due.month - 1]} ${due.day}, ${due.year}';
  }

  Color _dueColor() {
    if (payment.isPaid) return NestColors.income;
    final due = DateTime.tryParse(payment.dueDate);
    if (due == null) return NestColors.text3;
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final d = DateTime(due.year, due.month, due.day);
    final diff = d.difference(today).inDays;
    if (diff < 0) return NestColors.expense;
    if (diff <= 2) return NestColors.amber;
    return NestColors.text3;
  }

  bool get _isOverdue {
    if (payment.isPaid) return false;
    final due = DateTime.tryParse(payment.dueDate);
    return due != null && due.isBefore(DateTime.now());
  }

  @override
  Widget build(BuildContext context) {
    final dueColor = _dueColor();
    final overdue = _isOverdue;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: NestColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: overdue ? NestColors.expense.withOpacity(0.3) : NestColors.border),
        ),
        child: Row(children: [
          Container(
            width: 42, height: 42,
            decoration: BoxDecoration(
              color: payment.isPaid
                ? NestColors.income.withOpacity(0.12)
                : overdue
                  ? NestColors.expense.withOpacity(0.12)
                  : NestColors.indigo.withOpacity(0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              payment.isPaid ? Icons.check_circle_outline : Icons.event_repeat_outlined,
              color: payment.isPaid ? NestColors.income : overdue ? NestColors.expense : NestColors.indigoL,
              size: 20,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(
              payment.name,
              style: TextStyle(
                fontSize: 14, fontWeight: FontWeight.w600,
                color: payment.isPaid ? NestColors.text3 : NestColors.text1,
                decoration: payment.isPaid ? TextDecoration.lineThrough : null,
              ),
            ),
            const SizedBox(height: 3),
            Text(
              payment.isPaid ? 'Paid' : _dueLabel(),
              style: TextStyle(fontSize: 11.5, color: dueColor, fontWeight: FontWeight.w500),
            ),
          ])),
          const SizedBox(width: 12),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text(
              formatCurrency(payment.amount),
              style: TextStyle(
                fontSize: 14.5, fontWeight: FontWeight.w700, fontFamily: 'InterTight',
                color: payment.isPaid ? NestColors.text3 : NestColors.text1,
              ),
            ),
            const SizedBox(height: 6),
            if (onMarkPaid != null)
              GestureDetector(
                onTap: onMarkPaid,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: NestColors.income.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(99),
                    border: Border.all(color: NestColors.income.withOpacity(0.3)),
                  ),
                  child: const Text('Mark Paid', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, color: NestColors.income)),
                ),
              )
            else
              const Icon(Icons.check_circle_rounded, color: NestColors.income, size: 18),
          ]),
        ]),
      ),
    );
  }
}
