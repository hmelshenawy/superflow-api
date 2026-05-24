/// Safely parse a value that might be int, double, or String into an int.
/// Returns null if the value is null or can't be parsed.
int? parseInt(dynamic v) {
  if (v is int) return v;
  if (v is num) return v.toInt();
  if (v is String) return int.tryParse(v);
  return null;
}

/// Safely parse a value that might be bool, int, or String into a bool.
/// Returns null if the value is null.
bool? parseBool(dynamic v) {
  if (v is bool) return v;
  if (v is int) return v != 0;
  if (v is String) return v.toLowerCase() == 'true' || v == '1';
  return null;
}