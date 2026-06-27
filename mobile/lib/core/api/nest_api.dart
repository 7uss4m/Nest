import 'dart:io';
import 'package:dio/dio.dart';
import 'package:dio/io.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// ── Base URL ──────────────────────────────────────────────────────────────────
// 10.0.2.2 = Android emulator → host machine's localhost.
// For a physical device, replace with your host's LAN IP (e.g. http://192.168.1.x:5000).
const _kBaseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'http://10.0.2.2:5000');

// ── Provider ──────────────────────────────────────────────────────────────────

final storageProvider = Provider<FlutterSecureStorage>(
  (_) => const FlutterSecureStorage(),
);

final nestApiProvider = Provider<NestApi>((ref) {
  return NestApi(storage: ref.read(storageProvider));
});

// ── API client ────────────────────────────────────────────────────────────────

class NestApi {
  final FlutterSecureStorage storage;
  late final Dio _dio;

  NestApi({required this.storage}) {
    _dio = Dio(BaseOptions(
      baseUrl: _kBaseUrl,
      connectTimeout: const Duration(seconds: 12),
      receiveTimeout: const Duration(seconds: 20),
      headers: {'Content-Type': 'application/json'},
    ));
    (_dio.httpClientAdapter as IOHttpClientAdapter).createHttpClient = () =>
        HttpClient()..badCertificateCallback = (_, __, ___) => true;
  }

  // ── Session helpers ────────────────────────────────────────────────────────

  Future<String?> readToken() => storage.read(key: 'accessToken');
  Future<String?> readRefreshToken() => storage.read(key: 'refreshToken');

  Future<void> saveSession({
    required String accessToken,
    required String refreshToken,
    required String workspaceId,
    required String workspaceName,
    required String displayName,
    required String email,
    required String userId,
  }) async {
    await Future.wait([
      storage.write(key: 'accessToken', value: accessToken),
      storage.write(key: 'refreshToken', value: refreshToken),
      storage.write(key: 'workspaceId', value: workspaceId),
      storage.write(key: 'workspaceName', value: workspaceName),
      storage.write(key: 'displayName', value: displayName),
      storage.write(key: 'email', value: email),
      storage.write(key: 'userId', value: userId),
    ]);
  }

  Future<void> clearSession() => storage.deleteAll();

  // ── Internal request helper ────────────────────────────────────────────────

  Future<T> _req<T>(
    String method,
    String path, {
    Object? body,
    Map<String, dynamic>? query,
    required T Function(dynamic) parse,
  }) async {
    final token = await readToken();
    final headers = token != null ? {'Authorization': 'Bearer $token'} : null;

    try {
      final res = await _dio.request<dynamic>(
        path,
        data: body,
        queryParameters: query,
        options: Options(method: method, headers: headers),
      );
      return parse(res.data);
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        final refreshed = await _tryRefresh();
        if (refreshed != null) {
          final res = await _dio.request<dynamic>(
            path,
            data: body,
            queryParameters: query,
            options: Options(method: method, headers: {'Authorization': 'Bearer $refreshed'}),
          );
          return parse(res.data);
        }
        throw AuthException('Session expired. Please sign in again.');
      }
      final msg = _extractMessage(e);
      throw ApiException(msg, e.response?.statusCode);
    }
  }

  Future<String?> _tryRefresh() async {
    final rt = await readRefreshToken();
    if (rt == null) return null;
    try {
      final res = await _dio.post<Map<String, dynamic>>(
        '/api/auth/refresh',
        data: {'refreshToken': rt},
      );
      final newAccess = res.data!['accessToken'] as String;
      final newRefresh = res.data!['refreshToken'] as String;
      await storage.write(key: 'accessToken', value: newAccess);
      await storage.write(key: 'refreshToken', value: newRefresh);
      return newAccess;
    } catch (_) {
      await clearSession();
      return null;
    }
  }

  String _extractMessage(DioException e) {
    try {
      final data = e.response?.data;
      if (data is Map) return data['message'] as String? ?? e.message ?? 'Request failed';
    } catch (_) {}
    final detail = '[${e.type.name}] ${e.message ?? ''} ${e.error ?? ''}';
    return detail.trim();
  }

  // ── Auth ───────────────────────────────────────────────────────────────────

  Future<LoginResult> login(String email, String password) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>(
        '/api/auth/login',
        data: {'email': email, 'password': password},
      );
      return LoginResult.fromJson(res.data!);
    } on DioException catch (e) {
      throw ApiException(_extractMessage(e), e.response?.statusCode);
    }
  }

  Future<LoginResult> register(String displayName, String email, String password) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>(
        '/api/auth/register',
        data: {'displayName': displayName, 'email': email, 'password': password},
      );
      return LoginResult.fromJson(res.data!);
    } on DioException catch (e) {
      throw ApiException(_extractMessage(e), e.response?.statusCode);
    }
  }

  // ── Workspaces ─────────────────────────────────────────────────────────────

  Future<List<WorkspaceDto>> getWorkspaces() => _req(
    'GET', '/api/workspaces',
    parse: (d) => (d as List).map((e) => WorkspaceDto.fromJson(e as Map<String, dynamic>)).toList(),
  );

  Future<WorkspaceDto> createWorkspace(String name) => _req(
    'POST', '/api/workspaces',
    body: {'name': name},
    parse: (d) => WorkspaceDto.fromJson(d as Map<String, dynamic>),
  );

  // ── Dashboard ──────────────────────────────────────────────────────────────

  Future<DashboardSummary> getSummary(String wsId, {int? year, int? month}) => _req(
    'GET', '/api/workspaces/$wsId/dashboard/summary',
    query: {if (year != null) 'year': year, if (month != null) 'month': month},
    parse: (d) => DashboardSummary.fromJson(d as Map<String, dynamic>),
  );

  Future<List<CategorySpend>> getSpendingByCategory(String wsId, {int? year, int? month}) => _req(
    'GET', '/api/workspaces/$wsId/dashboard/spending-by-category',
    query: {if (year != null) 'year': year, if (month != null) 'month': month},
    parse: (d) => (d as List).map((e) => CategorySpend.fromJson(e as Map<String, dynamic>)).toList(),
  );

  // ── Categories ─────────────────────────────────────────────────────────────

  Future<List<CategoryDto>> getCategories(String wsId) => _req(
    'GET', '/api/workspaces/$wsId/categories',
    parse: (d) => (d as List).map((e) => CategoryDto.fromJson(e as Map<String, dynamic>)).toList(),
  );

  // ── Accounts ───────────────────────────────────────────────────────────────

  Future<List<AccountDto>> getAccounts(String wsId) => _req(
    'GET', '/api/workspaces/$wsId/accounts',
    parse: (d) => (d as List).map((e) => AccountDto.fromJson(e as Map<String, dynamic>)).toList(),
  );

  // ── Transactions ───────────────────────────────────────────────────────────

  Future<TransactionPage> getTransactions(
    String wsId, {
    int page = 1,
    int pageSize = 30,
    String? type,
    String? accountId,
  }) => _req(
    'GET', '/api/workspaces/$wsId/transactions',
    query: {
      'page': page, 'pageSize': pageSize,
      if (type != null) 'type': type,
      if (accountId != null) 'accountId': accountId,
    },
    parse: (d) => TransactionPage.fromJson(d as Map<String, dynamic>),
  );

  Future<void> createTransaction(String wsId, CreateTransactionDto dto) => _req(
    'POST', '/api/workspaces/$wsId/transactions',
    body: dto.toJson(),
    parse: (_) {},
  );

  Future<void> deleteTransaction(String wsId, String id) => _req(
    'DELETE', '/api/workspaces/$wsId/transactions/$id',
    parse: (_) {},
  );

  // ── Budgets ────────────────────────────────────────────────────────────────

  Future<List<BudgetDto>> getBudgets(String wsId) => _req(
    'GET', '/api/workspaces/$wsId/budgets',
    parse: (d) => (d as List).map((e) => BudgetDto.fromJson(e as Map<String, dynamic>)).toList(),
  );

  // ── Planned Payments ───────────────────────────────────────────────────────

  Future<List<PlannedPaymentDto>> getPlannedPayments(String wsId) => _req(
    'GET', '/api/workspaces/$wsId/planned-payments',
    parse: (d) => (d as List).map((e) => PlannedPaymentDto.fromJson(e as Map<String, dynamic>)).toList(),
  );

  Future<void> markPaymentPaid(String wsId, String id) => _req(
    'POST', '/api/workspaces/$wsId/planned-payments/$id/pay',
    parse: (_) {},
  );

  // ── Assets ──────────────────────────────────────────────────────────────────

  Future<List<AssetDto>> getAssets(String wsId) => _req(
    'GET', '/api/workspaces/$wsId/assets',
    parse: (d) => (d as List).map((e) => AssetDto.fromJson(e as Map<String, dynamic>)).toList(),
  );

  Future<void> recordAssetValue(String wsId, String assetId, double value) => _req(
    'POST', '/api/workspaces/$wsId/assets/$assetId/value',
    body: {'value': value},
    parse: (_) {},
  );

  // ── Liabilities ─────────────────────────────────────────────────────────────

  Future<List<LiabilityDto>> getLiabilities(String wsId) => _req(
    'GET', '/api/workspaces/$wsId/liabilities',
    parse: (d) => (d as List).map((e) => LiabilityDto.fromJson(e as Map<String, dynamic>)).toList(),
  );

  Future<void> recordLiabilityBalance(String wsId, String liabilityId, double balance) => _req(
    'POST', '/api/workspaces/$wsId/liabilities/$liabilityId/balance',
    body: {'balance': balance},
    parse: (_) {},
  );

  // ── Currencies ───────────────────────────────────────────────────────────────

  Future<List<WorkspaceCurrencyDto>> getCurrencies(String wsId) => _req(
    'GET', '/api/workspaces/$wsId/currencies',
    parse: (d) => (d as List).map((e) => WorkspaceCurrencyDto.fromJson(e as Map<String, dynamic>)).toList(),
  );

  // ── Net Worth ────────────────────────────────────────────────────────────────

  Future<List<NetWorthEntry>> getNetWorthHistory(String wsId) => _req(
    'GET', '/api/workspaces/$wsId/dashboard/net-worth-history',
    parse: (d) => (d as List).map((e) => NetWorthEntry.fromJson(e as Map<String, dynamic>)).toList(),
  );

  // ── Transaction Templates ─────────────────────────────────────────────────────

  Future<List<TemplateDto>> getTemplates(String wsId) => _req(
    'GET', '/api/workspaces/$wsId/transaction-templates',
    parse: (d) => (d as List).map((e) => TemplateDto.fromJson(e as Map<String, dynamic>)).toList(),
  );

  Future<void> createTemplate(String wsId, Map<String, dynamic> data) => _req(
    'POST', '/api/workspaces/$wsId/transaction-templates',
    body: data,
    parse: (_) {},
  );

  Future<void> deleteTemplate(String wsId, String id) => _req(
    'DELETE', '/api/workspaces/$wsId/transaction-templates/$id',
    parse: (_) {},
  );

  // ── Activity Feed ─────────────────────────────────────────────────────────────

  Future<List<ActivityLogDto>> getActivity(String wsId) => _req(
    'GET', '/api/workspaces/$wsId/dashboard/activity',
    parse: (d) => (d as List).map((e) => ActivityLogDto.fromJson(e as Map<String, dynamic>)).toList(),
  );
}

// ── DTOs ──────────────────────────────────────────────────────────────────────

class MoneyDto {
  final double amount;
  final String currencyCode;
  const MoneyDto({required this.amount, required this.currencyCode});
  factory MoneyDto.fromJson(Map<String, dynamic> j) => MoneyDto(
    amount: (j['amount'] as num).toDouble(),
    currencyCode: j['currencyCode'] as String? ?? 'USD',
  );
  static MoneyDto? fromJsonNullable(dynamic raw) =>
      raw == null ? null : MoneyDto.fromJson(raw as Map<String, dynamic>);
}

class WorkspaceCurrencyDto {
  final String code;
  final String symbol;
  final int decimalPlaces;
  final bool isDefault;
  const WorkspaceCurrencyDto({required this.code, required this.symbol, required this.decimalPlaces, required this.isDefault});
  factory WorkspaceCurrencyDto.fromJson(Map<String, dynamic> j) => WorkspaceCurrencyDto(
    code: j['code'] as String,
    symbol: j['symbol'] as String,
    decimalPlaces: (j['decimalPlaces'] as num).toInt(),
    isDefault: j['isDefault'] as bool? ?? false,
  );
}

class AssetDto {
  final String id;
  final String name;
  final String? description;
  final int assetClass; // 0=Physical, 1=Financial
  final int assetType;  // 0=RealEstate,1=Vehicle,2=Electronics,3=Valuables,4=Savings,5=Investment,6=Crypto,7=Business,8=LoanGiven,9=Other
  final MoneyDto currentValue;
  final String? purchaseDate;
  final MoneyDto? purchasePrice;
  final String? institution;
  final bool isShared;
  AssetDto({required this.id, required this.name, this.description, required this.assetClass, required this.assetType, required this.currentValue, this.purchaseDate, this.purchasePrice, this.institution, required this.isShared});
  factory AssetDto.fromJson(Map<String, dynamic> j) => AssetDto(
    id: j['id'] as String,
    name: j['name'] as String,
    description: j['description'] as String?,
    assetClass: (j['assetClass'] as num).toInt(),
    assetType: (j['assetType'] as num).toInt(),
    currentValue: MoneyDto.fromJson(j['currentValue'] as Map<String, dynamic>),
    purchaseDate: j['purchaseDate'] as String?,
    purchasePrice: MoneyDto.fromJsonNullable(j['purchasePrice']),
    institution: j['institution'] as String?,
    isShared: j['isShared'] as bool? ?? false,
  );
}

class LiabilityDto {
  final String id;
  final String name;
  final int type; // 0=Mortgage,1=Vehicle,2=Personal,3=CreditCard,4=Student,5=Business,6=OwedToPerson,7=Other
  final String? lenderName;
  final MoneyDto originalAmount;
  final MoneyDto currentBalance;
  final double? interestRate;
  final MoneyDto? monthlyPayment;
  final String? startDate;
  final String? dueDate;
  final bool isShared;
  LiabilityDto({required this.id, required this.name, required this.type, this.lenderName, required this.originalAmount, required this.currentBalance, this.interestRate, this.monthlyPayment, this.startDate, this.dueDate, required this.isShared});
  factory LiabilityDto.fromJson(Map<String, dynamic> j) => LiabilityDto(
    id: j['id'] as String,
    name: j['name'] as String,
    type: (j['type'] as num).toInt(),
    lenderName: j['lenderName'] as String?,
    originalAmount: MoneyDto.fromJson(j['originalAmount'] as Map<String, dynamic>),
    currentBalance: MoneyDto.fromJson(j['currentBalance'] as Map<String, dynamic>),
    interestRate: j['interestRate'] != null ? (j['interestRate'] as num).toDouble() : null,
    monthlyPayment: MoneyDto.fromJsonNullable(j['monthlyPayment']),
    startDate: j['startDate'] as String?,
    dueDate: j['dueDate'] as String?,
    isShared: j['isShared'] as bool? ?? false,
  );
}

class NetWorthEntry {
  final String month;
  final double assets;
  final double liabilities;
  final double netWorth;
  const NetWorthEntry({required this.month, required this.assets, required this.liabilities, required this.netWorth});
  factory NetWorthEntry.fromJson(Map<String, dynamic> j) => NetWorthEntry(
    month: j['month'] as String,
    assets: (j['assets'] as num).toDouble(),
    liabilities: (j['liabilities'] as num).toDouble(),
    netWorth: (j['netWorth'] as num).toDouble(),
  );
}

class LoginResult {
  final String accessToken;
  final String refreshToken;
  final UserDto user;
  LoginResult({required this.accessToken, required this.refreshToken, required this.user});
  factory LoginResult.fromJson(Map<String, dynamic> j) => LoginResult(
    accessToken: j['accessToken'] as String,
    refreshToken: j['refreshToken'] as String,
    user: UserDto.fromJson(j['user'] as Map<String, dynamic>),
  );
}

class UserDto {
  final String id;
  final String email;
  final String displayName;
  UserDto({required this.id, required this.email, required this.displayName});
  factory UserDto.fromJson(Map<String, dynamic> j) => UserDto(
    id: j['id'] as String,
    email: j['email'] as String,
    displayName: j['displayName'] as String? ?? (j['email'] as String),
  );
}

class WorkspaceDto {
  final String id;
  final String name;
  WorkspaceDto({required this.id, required this.name});
  factory WorkspaceDto.fromJson(Map<String, dynamic> j) => WorkspaceDto(
    id: j['id'] as String,
    name: j['name'] as String,
  );
}

class DashboardSummary {
  final MoneyDto income;
  final MoneyDto expense;
  final MoneyDto saved;
  final List<AccountDto> accounts;
  final List<UpcomingPaymentDto> upcomingPayments;
  DashboardSummary({
    required this.income, required this.expense, required this.saved,
    required this.accounts, required this.upcomingPayments,
  });
  factory DashboardSummary.fromJson(Map<String, dynamic> j) => DashboardSummary(
    income: MoneyDto.fromJson(j['income'] as Map<String, dynamic>),
    expense: MoneyDto.fromJson(j['expense'] as Map<String, dynamic>),
    saved: MoneyDto.fromJson(j['saved'] as Map<String, dynamic>),
    accounts: (j['accounts'] as List).map((e) => AccountDto.fromJson(e as Map<String, dynamic>)).toList(),
    upcomingPayments: (j['upcomingPayments'] as List).map((e) => UpcomingPaymentDto.fromJson(e as Map<String, dynamic>)).toList(),
  );
}

class AccountDto {
  final String id;
  final String name;
  final int type;
  final String currency;
  final String color;
  final String icon;
  final MoneyDto balance;
  AccountDto({required this.id, required this.name, required this.type, required this.currency, required this.color, required this.icon, required this.balance});
  factory AccountDto.fromJson(Map<String, dynamic> j) => AccountDto(
    id: j['id'] as String,
    name: j['name'] as String,
    type: (j['type'] as num).toInt(),
    currency: j['currency'] as String? ?? 'USD',
    color: j['color'] as String? ?? '#6366F1',
    icon: j['icon'] as String? ?? 'account_balance',
    balance: MoneyDto.fromJson(j['balance'] as Map<String, dynamic>),
  );
}

class CategorySpend {
  final String categoryId;
  final double total;
  CategorySpend({required this.categoryId, required this.total});
  factory CategorySpend.fromJson(Map<String, dynamic> j) => CategorySpend(
    categoryId: j['categoryId'] as String,
    total: (j['total'] as num).toDouble(),
  );
}

class CategoryDto {
  final String id;
  final String name;
  final int type; // 0=Income, 1=Expense
  final String icon;
  final String color;
  CategoryDto({required this.id, required this.name, required this.type, required this.icon, required this.color});
  factory CategoryDto.fromJson(Map<String, dynamic> j) => CategoryDto(
    id: j['id'] as String,
    name: j['name'] as String,
    type: (j['type'] as num).toInt(),
    icon: j['icon'] as String? ?? 'category',
    color: j['color'] as String? ?? '#818CF8',
  );
}

class TransactionDto {
  final String id;
  final MoneyDto amount;
  final int type; // 0=Income, 1=Expense, 2=Transfer
  final String date; // ISO date string
  final String? note;
  final String? payee;
  final String? categoryId;
  final String accountId;
  TransactionDto({required this.id, required this.amount, required this.type, required this.date, this.note, this.payee, this.categoryId, required this.accountId});
  factory TransactionDto.fromJson(Map<String, dynamic> j) => TransactionDto(
    id: j['id'] as String,
    amount: MoneyDto.fromJson(j['amount'] as Map<String, dynamic>),
    type: (j['type'] as num).toInt(),
    date: j['date'] as String,
    note: j['note'] as String?,
    payee: j['payee'] as String?,
    categoryId: j['categoryId'] as String?,
    accountId: j['accountId'] as String,
  );
}

class TransactionPage {
  final List<TransactionDto> items;
  final int totalCount;
  final int page;
  final int pageSize;
  TransactionPage({required this.items, required this.totalCount, required this.page, required this.pageSize});
  factory TransactionPage.fromJson(Map<String, dynamic> j) => TransactionPage(
    items: (j['items'] as List).map((e) => TransactionDto.fromJson(e as Map<String, dynamic>)).toList(),
    totalCount: (j['total'] as num).toInt(),
    page: (j['page'] as num).toInt(),
    pageSize: (j['pageSize'] as num).toInt(),
  );
}

class CreateTransactionDto {
  final double amount;
  final int type;
  final String date;
  final String accountId;
  final String? categoryId;
  final String? note;
  final String? payee;
  CreateTransactionDto({required this.amount, required this.type, required this.date, required this.accountId, this.categoryId, this.note, this.payee});
  Map<String, dynamic> toJson() => {
    'amount': amount, 'type': type, 'date': date, 'accountId': accountId,
    if (categoryId != null) 'categoryId': categoryId,
    if (note != null) 'note': note,
    if (payee != null) 'payee': payee,
  };
}

class BudgetDto {
  final String id;
  final String categoryId;
  final MoneyDto amountLimit;
  final bool rollover;
  BudgetDto({required this.id, required this.categoryId, required this.amountLimit, required this.rollover});
  factory BudgetDto.fromJson(Map<String, dynamic> j) => BudgetDto(
    id: j['id'] as String,
    categoryId: j['categoryId'] as String,
    amountLimit: MoneyDto.fromJson(j['amountLimit'] as Map<String, dynamic>),
    rollover: j['rollover'] as bool? ?? false,
  );
}

class PlannedPaymentDto {
  final String id;
  final String name;
  final MoneyDto amount;
  final String dueDate;
  final String? icon;
  final bool isPaid;
  PlannedPaymentDto({required this.id, required this.name, required this.amount, required this.dueDate, this.icon, required this.isPaid});
  factory PlannedPaymentDto.fromJson(Map<String, dynamic> j) => PlannedPaymentDto(
    id: j['id'] as String,
    name: j['name'] as String,
    amount: MoneyDto.fromJson(j['amount'] as Map<String, dynamic>),
    dueDate: j['dueDate'] as String,
    icon: j['icon'] as String?,
    isPaid: j['isPaid'] as bool? ?? false,
  );
}

class UpcomingPaymentDto {
  final String id;
  final String name;
  final MoneyDto amount;
  final String dueDate;
  final String? icon;
  UpcomingPaymentDto({required this.id, required this.name, required this.amount, required this.dueDate, this.icon});
  factory UpcomingPaymentDto.fromJson(Map<String, dynamic> j) => UpcomingPaymentDto(
    id: j['id'] as String,
    name: j['name'] as String,
    amount: MoneyDto.fromJson(j['amount'] as Map<String, dynamic>),
    dueDate: j['dueDate'] as String,
    icon: j['icon'] as String?,
  );
}

class TemplateDto {
  final String id;
  final String name;
  final int type; // 0=Income, 1=Expense, 2=Transfer
  final double? amount;
  final String? payee;
  final String? note;
  final String? accountId;
  final String? categoryId;
  const TemplateDto({required this.id, required this.name, required this.type, this.amount, this.payee, this.note, this.accountId, this.categoryId});
  factory TemplateDto.fromJson(Map<String, dynamic> j) => TemplateDto(
    id: j['id'] as String,
    name: j['name'] as String,
    type: (j['type'] as num).toInt(),
    amount: j['amount'] != null ? (j['amount'] as num).toDouble() : null,
    payee: j['payee'] as String?,
    note: j['note'] as String?,
    accountId: j['accountId'] as String?,
    categoryId: j['categoryId'] as String?,
  );
}

class ActivityLogDto {
  final String id;
  final String action;
  final String description;
  final String userName;
  final String createdAt;
  const ActivityLogDto({required this.id, required this.action, required this.description, required this.userName, required this.createdAt});
  factory ActivityLogDto.fromJson(Map<String, dynamic> j) => ActivityLogDto(
    id: j['id'] as String,
    action: j['action'] as String,
    description: j['description'] as String,
    userName: j['userName'] as String,
    createdAt: j['createdAt'] as String,
  );
}

// ── Exceptions ────────────────────────────────────────────────────────────────

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  const ApiException(this.message, [this.statusCode]);
  @override
  String toString() => message;
}

class AuthException extends ApiException {
  const AuthException(super.message);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

String formatMoney(MoneyDto money) =>
    formatCurrency(money.amount, money.currencyCode);

String formatCurrency(double amount, [String currency = 'USD', int decimals = 2]) {
  final sign = amount < 0 ? '-' : '';
  final abs = amount.abs();
  final str = abs.toStringAsFixed(decimals);
  final parts = str.split('.');
  final intPart = parts[0].replaceAllMapped(
    RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
    (m) => '${m[1]},',
  );
  final symbol = _currencySymbol(currency);
  return decimals > 0 ? '$sign$symbol$intPart.${parts[1]}' : '$sign$symbol$intPart';
}

String _currencySymbol(String code) {
  switch (code) {
    case 'USD': return '\$';
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'JPY': return '¥';
    case 'SYP': return 'ل.س';
    default: return '$code ';
  }
}
