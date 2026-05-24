// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class SEn extends S {
  SEn([String locale = 'en']) : super(locale);

  @override
  String get appName => 'PrioraFlow';

  @override
  String get loginTitle => 'Sign In';

  @override
  String get loginEmail => 'Email';

  @override
  String get loginEmailHint => 'you@workshop.com';

  @override
  String get loginPassword => 'Password';

  @override
  String get loginPasswordHint => 'Enter your password';

  @override
  String get loginButton => 'Sign In';

  @override
  String get loginErrorInvalid => 'Invalid email or password';

  @override
  String get loginErrorRateLimit =>
      'Too many attempts. Please try again later.';

  @override
  String get loginErrorConnection =>
      'Unable to connect to server. Check your connection.';

  @override
  String get selectWorkshop => 'Select Workshop';

  @override
  String get selectWorkshopSubtitle => 'Choose a workshop to continue';

  @override
  String get myJobs => 'My Jobs';

  @override
  String get searchJobs => 'Search jobs...';

  @override
  String get noJobs => 'No jobs assigned';

  @override
  String get filterAll => 'All';

  @override
  String get filterInProgress => 'In Progress';

  @override
  String get filterChecking => 'Checking';

  @override
  String get filterWaitingParts => 'Waiting Parts';

  @override
  String get filterQC => 'QC';

  @override
  String get jobDetail => 'Job Detail';

  @override
  String get progress => 'Progress';

  @override
  String get details => 'Details';

  @override
  String get promiseTime => 'Promise Time';

  @override
  String get odometer => 'Odometer';

  @override
  String get technician => 'Technician';

  @override
  String get advisor => 'Advisor';

  @override
  String get overdue => 'Overdue';

  @override
  String get viewConcerns => 'View Concerns';

  @override
  String get viewPartsStatus => 'View Parts Status';

  @override
  String get refresh => 'Refresh';

  @override
  String get statusBooked => 'Booked';

  @override
  String get statusChecking => 'Checking';

  @override
  String get statusEstimateSent => 'Estimate Sent';

  @override
  String get statusApproved => 'Approved';

  @override
  String get statusInProgress => 'In Progress';

  @override
  String get statusWaitingParts => 'Waiting Parts';

  @override
  String get statusQualityCheck => 'Quality Check';

  @override
  String get statusReady => 'Ready';

  @override
  String get statusClosed => 'Closed';

  @override
  String get statusNoShow => 'No Show';

  @override
  String get actionStartInspection => 'Start Inspection';

  @override
  String get actionMarkApproved => 'Mark Approved';

  @override
  String get actionStartWork => 'Start Work';

  @override
  String get actionHandToQC => 'Hand to QC';

  @override
  String get actionResumeWork => 'Resume Work';

  @override
  String get actionMarkReady => 'Mark Ready';

  @override
  String get actionCloseJob => 'Close Job';

  @override
  String get actionNoShow => 'No Show';

  @override
  String get actionSendEstimate => 'Send Estimate';

  @override
  String get actionWaitingParts => 'Waiting Parts';

  @override
  String get actionReopen => 'Reopen';

  @override
  String get confirmCloseJob => 'Close Job?';

  @override
  String get confirmCloseJobMessage =>
      'This will close the job. This action cannot be undone.';

  @override
  String get cancel => 'Cancel';

  @override
  String get close => 'Close';

  @override
  String get concerns => 'Concerns';

  @override
  String get noConcerns => 'No concerns logged';

  @override
  String inspectedCount(int inspected, int total) {
    return '$inspected of $total inspected';
  }

  @override
  String get notInspected => 'Not inspected';

  @override
  String get inspectionFinding => 'Inspection Finding';

  @override
  String get concern => 'Concern';

  @override
  String get findingType => 'Finding Type';

  @override
  String get description => 'Description';

  @override
  String get descriptionHint => 'Describe the finding...';

  @override
  String get estimatedTime => 'Estimated Time (minutes)';

  @override
  String get optional => 'Optional';

  @override
  String get requestParts => 'Request Parts';

  @override
  String get requestPartsSubtitle => 'Toggle if this finding requires parts';

  @override
  String get partName => 'Part Name';

  @override
  String get quantity => 'Quantity';

  @override
  String get notes => 'Notes';

  @override
  String get notesHint => 'Optional notes about the part';

  @override
  String get saveFinding => 'Save Finding';

  @override
  String get findingSaved => 'Finding saved';

  @override
  String get findingSaveFailed => 'Failed to save finding';

  @override
  String get descriptionRequired =>
      'Description is required for non-OK findings';

  @override
  String uploadingPhoto(int current, int total) {
    return 'Uploading photo $current/$total';
  }

  @override
  String get findingTypeOk => 'OK';

  @override
  String get findingTypeNeedsAttention => 'Needs Attention';

  @override
  String get findingTypeCritical => 'Critical';

  @override
  String get findingTypeDeferred => 'Deferred';

  @override
  String get partsStatus => 'Parts Status';

  @override
  String get noPartsRequested => 'No parts requested';

  @override
  String get failedToLoadParts => 'Failed to load parts';

  @override
  String get retry => 'Retry';

  @override
  String get partsRequested => 'Requested';

  @override
  String get partsSourcing => 'Sourcing';

  @override
  String get partsArrived => 'Arrived';

  @override
  String get partsCancelled => 'Cancelled';

  @override
  String get profile => 'Profile';

  @override
  String get appVersion => 'App Version';

  @override
  String get signOut => 'Sign Out';

  @override
  String get offlineBanner => 'No connection — changes will be saved locally';

  @override
  String get priorityLow => 'Low';

  @override
  String get priorityNormal => 'Normal';

  @override
  String get priorityHigh => 'High';

  @override
  String get priorityCritical => 'Critical';

  @override
  String get phaseReceived => 'Received';

  @override
  String get phaseCheckedIn => 'Checked In';

  @override
  String get phaseInspection => 'Inspection';

  @override
  String get phaseApproval => 'Approval';

  @override
  String get phaseInProgress => 'In Progress';

  @override
  String get phaseCompleted => 'Completed';
}
