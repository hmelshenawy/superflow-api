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
}