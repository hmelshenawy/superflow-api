import 'package:flutter/material.dart';
import 'package:prioraflow_tech/core/theme/app_colors.dart';

/// Show a success SnackBar with green background.
void showSuccessSnackBar(BuildContext context, String message) {
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(message),
      backgroundColor: AppColors.success,
    ),
  );
}

/// Show an error SnackBar with red background.
void showErrorSnackBar(BuildContext context, String message) {
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(message),
      backgroundColor: AppColors.danger,
    ),
  );
}

/// Show an info SnackBar with primary color background.
void showInfoSnackBar(BuildContext context, String message) {
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(
      content: Text(message),
      backgroundColor: AppColors.primary,
    ),
  );
}