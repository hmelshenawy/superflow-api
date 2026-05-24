import 'package:flutter/material.dart';
import 'package:prioraflow_tech/core/theme/app_colors.dart';

enum JobStatus {
  booked,
  checking,
  estimateSent,
  approved,
  inProgress,
  waitingParts,
  qualityCheck,
  ready,
  closed,
  noShow;

  static JobStatus fromString(String? value) {
    return JobStatus.values.firstWhere(
      (e) => e.name.toLowerCase().replaceAll('_', '') ==
          (value?.toLowerCase().replaceAll('_', '') ?? ''),
      orElse: () => JobStatus.booked,
    );
  }

  /// Snake-case API value matching the backend state machine.
  String get apiValue => switch (this) {
        JobStatus.booked => 'booked',
        JobStatus.checking => 'checking',
        JobStatus.estimateSent => 'estimate_sent',
        JobStatus.approved => 'approved',
        JobStatus.inProgress => 'in_progress',
        JobStatus.waitingParts => 'waiting_parts',
        JobStatus.qualityCheck => 'quality_check',
        JobStatus.ready => 'ready',
        JobStatus.closed => 'closed',
        JobStatus.noShow => 'no_show',
      };

  String get label {
    switch (this) {
      case JobStatus.booked:
        return 'Booked';
      case JobStatus.checking:
        return 'Checking';
      case JobStatus.estimateSent:
        return 'Estimate Sent';
      case JobStatus.approved:
        return 'Approved';
      case JobStatus.inProgress:
        return 'In Progress';
      case JobStatus.waitingParts:
        return 'Waiting Parts';
      case JobStatus.qualityCheck:
        return 'Quality Check';
      case JobStatus.ready:
        return 'Ready';
      case JobStatus.closed:
        return 'Closed';
      case JobStatus.noShow:
        return 'No Show';
    }
  }

  /// Phase index for the 6-phase progress bar:
  /// Received → Checked In → Under Inspection → Awaiting Approval → In Progress → Completed
  int get phaseIndex {
    switch (this) {
      case JobStatus.booked:
        return 0;
      case JobStatus.checking:
        return 1;
      case JobStatus.estimateSent:
        return 2;
      case JobStatus.approved:
        return 3;
      case JobStatus.inProgress:
      case JobStatus.waitingParts:
        return 4;
      case JobStatus.qualityCheck:
      case JobStatus.ready:
      case JobStatus.closed:
      case JobStatus.noShow:
        return 5;
    }
  }

  /// Semantic status color matching web's STATUS_META dark-mode palette.
  Color get color => switch (this) {
        JobStatus.booked => AppColors.statusBooked,
        JobStatus.checking => AppColors.statusChecking,
        JobStatus.estimateSent => AppColors.statusEstimateSent,
        JobStatus.approved => AppColors.statusApproved,
        JobStatus.inProgress => AppColors.statusInProgress,
        JobStatus.waitingParts => AppColors.statusWaitingParts,
        JobStatus.qualityCheck => AppColors.statusQualityCheck,
        JobStatus.ready => AppColors.statusReady,
        JobStatus.closed => AppColors.statusClosed,
        JobStatus.noShow => AppColors.statusNoShow,
      };

  /// Background tint for status badges (12% opacity of status color).
  Color get bgColor => AppColors.statusBg(color);
}