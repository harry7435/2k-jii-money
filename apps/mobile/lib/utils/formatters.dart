import 'package:intl/intl.dart';

final _currencyFormat = NumberFormat('#,###', 'ko_KR');

String formatCurrency(int amount) {
  return '${_currencyFormat.format(amount)}원';
}

String formatDate(DateTime date) {
  return DateFormat('M월 d일 (E)', 'ko_KR').format(date);
}

String formatYearMonth(String yearMonth) {
  final parts = yearMonth.split('-');
  return '${parts[0]}년 ${int.parse(parts[1])}월';
}

int colorFromHex(String hex) {
  hex = hex.replaceFirst('#', '');
  if (hex.length == 6) hex = 'FF$hex';
  return int.parse(hex, radix: 16);
}
