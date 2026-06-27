import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/login_screen.dart';
import '../../features/auth/register_screen.dart';
import '../../features/dashboard/dashboard_screen.dart';
import '../../features/transactions/transactions_screen.dart';
import '../../features/transactions/add_transaction_sheet.dart';
import '../../features/budgets/budgets_screen.dart';
import '../../features/accounts/accounts_screen.dart';
import '../../features/planned_payments/planned_payments_screen.dart';
import '../../features/assets/assets_screen.dart';
import '../../features/liabilities/liabilities_screen.dart';
import '../../features/net_worth/net_worth_screen.dart';
import '../auth/auth_provider.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final router = GoRouter(
    initialLocation: '/splash',
    redirect: (context, state) {
      final auth = ref.read(authNotifierProvider);
      final loc = state.matchedLocation;

      // While reading tokens from secure storage, stay on splash
      if (auth.isLoading) {
        return loc == '/splash' ? null : '/splash';
      }

      // Auth determined — leave splash
      if (loc == '/splash') {
        return auth.value != null ? '/dashboard' : '/login';
      }

      final isLoggedIn = auth.value != null;
      final isOnAuth = loc == '/login' || loc == '/register';
      if (!isLoggedIn && !isOnAuth) return '/login';
      if (isLoggedIn && isOnAuth) return '/dashboard';
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, __) => const _SplashScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
      ShellRoute(
        builder: (context, state, child) => MainShell(child: child),
        routes: [
          GoRoute(path: '/dashboard', builder: (_, __) => const DashboardScreen()),
          GoRoute(path: '/transactions', builder: (_, __) => const TransactionsScreen()),
          GoRoute(path: '/budgets', builder: (_, __) => const BudgetsScreen()),
          GoRoute(path: '/more', builder: (_, __) => const _MoreScreen()),
          GoRoute(path: '/accounts', builder: (_, __) => const AccountsScreen()),
          GoRoute(path: '/planned-payments', builder: (_, __) => const PlannedPaymentsScreen()),
          GoRoute(path: '/assets', builder: (_, __) => const AssetsScreen()),
          GoRoute(path: '/liabilities', builder: (_, __) => const LiabilitiesScreen()),
          GoRoute(path: '/net-worth', builder: (_, __) => const NetWorthScreen()),
        ],
      ),
    ],
  );

  // Refresh the router whenever auth state changes
  ref.listen(authNotifierProvider, (_, __) => router.refresh());

  return router;
});

// ── Main shell with bottom nav + FAB ──────────────────────────────────────────

class MainShell extends ConsumerStatefulWidget {
  final Widget child;
  const MainShell({super.key, required this.child});

  @override
  ConsumerState<MainShell> createState() => _MainShellState();
}

class _MainShellState extends ConsumerState<MainShell> {
  int _tabIndex = 0; // 0=Home, 1=Activity, 2=Budgets, 3=More

  static const _routes = ['/dashboard', '/transactions', '/budgets', '/more'];

  void _onNavTap(int i) {
    // i: 0=Home, 1=Activity, 2=FAB(skip), 3=Budgets, 4=More
    if (i == 2) {
      _openAddTransaction();
      return;
    }
    final routeIdx = i < 2 ? i : i - 1;
    setState(() => _tabIndex = routeIdx);
    context.go(_routes[routeIdx]);
  }

  void _openAddTransaction() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const AddTransactionSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final navIndex = _tabIndex < 2 ? _tabIndex : _tabIndex + 1;

    return Scaffold(
      body: widget.child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: navIndex,
        onDestinationSelected: _onNavTap,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.space_dashboard_outlined),
            selectedIcon: Icon(Icons.space_dashboard),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            selectedIcon: Icon(Icons.receipt_long),
            label: 'Activity',
          ),
          NavigationDestination(icon: SizedBox.shrink(), label: ''),
          NavigationDestination(
            icon: Icon(Icons.donut_small_outlined),
            selectedIcon: Icon(Icons.donut_small),
            label: 'Budgets',
          ),
          NavigationDestination(
            icon: Icon(Icons.apps_outlined),
            selectedIcon: Icon(Icons.apps),
            label: 'More',
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _openAddTransaction,
        backgroundColor: Colors.transparent,
        elevation: 0,
        child: Container(
          width: 52,
          height: 52,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF6366F1), Color(0xFF2DD4BF)],
            ),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF6366F1).withOpacity(0.45),
                blurRadius: 24,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: const Icon(Icons.add, color: Color(0xFF0B0E14), size: 26),
        ),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
    );
  }
}

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 52, height: 52,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.all(Radius.circular(15)),
                  gradient: LinearGradient(colors: [Color(0xFF6366F1), Color(0xFF2DD4BF)]),
                ),
                child: Center(
                  child: Text('W', style: TextStyle(fontFamily: 'InterTight', fontWeight: FontWeight.w800, fontSize: 28, color: Color(0xFF0B0E14))),
                ),
              ),
            ),
            SizedBox(height: 28),
            CircularProgressIndicator(color: Color(0xFF6366F1), strokeWidth: 2.5),
          ],
        ),
      ),
    );
  }
}

class _MoreScreen extends StatelessWidget {
  const _MoreScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('More', style: TextStyle(fontFamily: 'InterTight', fontWeight: FontWeight.w800, fontSize: 28, color: Color(0xFFEEF1F6))),
              const SizedBox(height: 24),
              _MoreTile(icon: Icons.account_balance_outlined, label: 'Accounts', onTap: () => context.push('/accounts')),
              _MoreTile(icon: Icons.event_repeat_outlined, label: 'Planned Payments', onTap: () => context.push('/planned-payments')),
              const Divider(color: Color(0x12FFFFFF), height: 32),
              _MoreTile(icon: Icons.diamond_outlined, label: 'Assets', onTap: () => context.push('/assets')),
              _MoreTile(icon: Icons.trending_down, label: 'Liabilities', onTap: () => context.push('/liabilities')),
              _MoreTile(icon: Icons.show_chart, label: 'Net Worth', onTap: () => context.push('/net-worth')),
              const Divider(color: Color(0x12FFFFFF), height: 32),
              _MoreTile(icon: Icons.settings_outlined, label: 'Settings', onTap: () {}),
            ],
          ),
        ),
      ),
    );
  }
}

class _MoreTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _MoreTile({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 4),
        child: Row(
          children: [
            Icon(icon, color: const Color(0xFF98A2B3), size: 22),
            const SizedBox(width: 14),
            Text(label, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500, color: Color(0xFFEEF1F6))),
            const Spacer(),
            const Icon(Icons.chevron_right, color: Color(0xFF5B6573), size: 20),
          ],
        ),
      ),
    );
  }
}
