import 'package:intl/intl.dart';

class AppDateUtils {
  AppDateUtils._();

  static String formatDate(DateTime? date) {
    if (date == null) return '—';
    return DateFormat('dd/MM/yyyy').format(date);
  }

  static String formatDateTime(DateTime? date) {
    if (date == null) return '—';
    return DateFormat('dd/MM/yyyy HH:mm').format(date);
  }

  static String formatTime(DateTime? date) {
    if (date == null) return '—';
    return DateFormat('HH:mm').format(date);
  }

  static String relativeTime(DateTime? date) {
    if (date == null) return '—';
    final now = DateTime.now();
    final diff = now.difference(date);

    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return formatDate(date);
  }

  static String? countdown(DateTime? target) {
    if (target == null) return null;
    final remaining = target.difference(DateTime.now());
    if (remaining.isNegative) return 'Overdue';
    if (remaining.inDays > 0) return '${remaining.inDays}d ${remaining.inHours % 24}h left';
    if (remaining.inHours > 0) return '${remaining.inHours}h ${remaining.inMinutes % 60}m left';
    return '${remaining.inMinutes}m left';
  }
}