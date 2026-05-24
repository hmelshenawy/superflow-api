import 'package:flutter/material.dart';
import 'package:prioraflow_tech/core/theme/app_colors.dart';

enum PriorityLevel { low, normal, high, critical }

extension PriorityLevelX on PriorityLevel {
  String get label {
    switch (this) {
      case PriorityLevel.low:
        return 'Low';
      case PriorityLevel.normal:
        return 'Normal';
      case PriorityLevel.high:
        return 'High';
      case PriorityLevel.critical:
        return 'Critical';
    }
  }

  Color get color {
    switch (this) {
      case PriorityLevel.low:
        return AppColors.priorityLow;
      case PriorityLevel.normal:
        return AppColors.priorityNormal;
      case PriorityLevel.high:
        return AppColors.priorityHigh;
      case PriorityLevel.critical:
        return AppColors.priorityCritical;
    }
  }
}

PriorityLevel priorityLevelFromString(String? value) {
  switch (value?.toLowerCase()) {
    case 'low':
      return PriorityLevel.low;
    case 'normal':
      return PriorityLevel.normal;
    case 'high':
      return PriorityLevel.high;
    case 'critical':
      return PriorityLevel.critical;
    default:
      return PriorityLevel.normal;
  }
}