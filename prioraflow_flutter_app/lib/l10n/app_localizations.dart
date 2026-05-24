import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_ar.dart';
import 'app_localizations_en.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of S
/// returned by `S.of(context)`.
///
/// Applications need to include `S.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: S.localizationsDelegates,
///   supportedLocales: S.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the S.supportedLocales
/// property.
abstract class S {
  S(String locale)
      : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static S of(BuildContext context) {
    return Localizations.of<S>(context, S)!;
  }

  static const LocalizationsDelegate<S> delegate = _SDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
    delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
  ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('ar'),
    Locale('en')
  ];

  /// No description provided for @appName.
  ///
  /// In en, this message translates to:
  /// **'PrioraFlow'**
  String get appName;

  /// No description provided for @loginTitle.
  ///
  /// In en, this message translates to:
  /// **'Sign In'**
  String get loginTitle;

  /// No description provided for @loginEmail.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get loginEmail;

  /// No description provided for @loginEmailHint.
  ///
  /// In en, this message translates to:
  /// **'you@workshop.com'**
  String get loginEmailHint;

  /// No description provided for @loginPassword.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get loginPassword;

  /// No description provided for @loginPasswordHint.
  ///
  /// In en, this message translates to:
  /// **'Enter your password'**
  String get loginPasswordHint;

  /// No description provided for @loginButton.
  ///
  /// In en, this message translates to:
  /// **'Sign In'**
  String get loginButton;

  /// No description provided for @loginErrorInvalid.
  ///
  /// In en, this message translates to:
  /// **'Invalid email or password'**
  String get loginErrorInvalid;

  /// No description provided for @loginErrorRateLimit.
  ///
  /// In en, this message translates to:
  /// **'Too many attempts. Please try again later.'**
  String get loginErrorRateLimit;

  /// No description provided for @loginErrorConnection.
  ///
  /// In en, this message translates to:
  /// **'Unable to connect to server. Check your connection.'**
  String get loginErrorConnection;

  /// No description provided for @selectWorkshop.
  ///
  /// In en, this message translates to:
  /// **'Select Workshop'**
  String get selectWorkshop;

  /// No description provided for @selectWorkshopSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Choose a workshop to continue'**
  String get selectWorkshopSubtitle;

  /// No description provided for @myJobs.
  ///
  /// In en, this message translates to:
  /// **'My Jobs'**
  String get myJobs;

  /// No description provided for @searchJobs.
  ///
  /// In en, this message translates to:
  /// **'Search jobs...'**
  String get searchJobs;

  /// No description provided for @noJobs.
  ///
  /// In en, this message translates to:
  /// **'No jobs assigned'**
  String get noJobs;

  /// No description provided for @filterAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get filterAll;

  /// No description provided for @filterInProgress.
  ///
  /// In en, this message translates to:
  /// **'In Progress'**
  String get filterInProgress;

  /// No description provided for @filterChecking.
  ///
  /// In en, this message translates to:
  /// **'Checking'**
  String get filterChecking;

  /// No description provided for @filterWaitingParts.
  ///
  /// In en, this message translates to:
  /// **'Waiting Parts'**
  String get filterWaitingParts;

  /// No description provided for @filterQC.
  ///
  /// In en, this message translates to:
  /// **'QC'**
  String get filterQC;

  /// No description provided for @jobDetail.
  ///
  /// In en, this message translates to:
  /// **'Job Detail'**
  String get jobDetail;

  /// No description provided for @progress.
  ///
  /// In en, this message translates to:
  /// **'Progress'**
  String get progress;

  /// No description provided for @details.
  ///
  /// In en, this message translates to:
  /// **'Details'**
  String get details;

  /// No description provided for @promiseTime.
  ///
  /// In en, this message translates to:
  /// **'Promise Time'**
  String get promiseTime;

  /// No description provided for @odometer.
  ///
  /// In en, this message translates to:
  /// **'Odometer'**
  String get odometer;

  /// No description provided for @technician.
  ///
  /// In en, this message translates to:
  /// **'Technician'**
  String get technician;

  /// No description provided for @advisor.
  ///
  /// In en, this message translates to:
  /// **'Advisor'**
  String get advisor;

  /// No description provided for @overdue.
  ///
  /// In en, this message translates to:
  /// **'Overdue'**
  String get overdue;

  /// No description provided for @viewConcerns.
  ///
  /// In en, this message translates to:
  /// **'View Concerns'**
  String get viewConcerns;

  /// No description provided for @viewPartsStatus.
  ///
  /// In en, this message translates to:
  /// **'View Parts Status'**
  String get viewPartsStatus;

  /// No description provided for @refresh.
  ///
  /// In en, this message translates to:
  /// **'Refresh'**
  String get refresh;

  /// No description provided for @statusBooked.
  ///
  /// In en, this message translates to:
  /// **'Booked'**
  String get statusBooked;

  /// No description provided for @statusChecking.
  ///
  /// In en, this message translates to:
  /// **'Checking'**
  String get statusChecking;

  /// No description provided for @statusEstimateSent.
  ///
  /// In en, this message translates to:
  /// **'Estimate Sent'**
  String get statusEstimateSent;

  /// No description provided for @statusApproved.
  ///
  /// In en, this message translates to:
  /// **'Approved'**
  String get statusApproved;

  /// No description provided for @statusInProgress.
  ///
  /// In en, this message translates to:
  /// **'In Progress'**
  String get statusInProgress;

  /// No description provided for @statusWaitingParts.
  ///
  /// In en, this message translates to:
  /// **'Waiting Parts'**
  String get statusWaitingParts;

  /// No description provided for @statusQualityCheck.
  ///
  /// In en, this message translates to:
  /// **'Quality Check'**
  String get statusQualityCheck;

  /// No description provided for @statusReady.
  ///
  /// In en, this message translates to:
  /// **'Ready'**
  String get statusReady;

  /// No description provided for @statusClosed.
  ///
  /// In en, this message translates to:
  /// **'Closed'**
  String get statusClosed;

  /// No description provided for @statusNoShow.
  ///
  /// In en, this message translates to:
  /// **'No Show'**
  String get statusNoShow;

  /// No description provided for @actionStartInspection.
  ///
  /// In en, this message translates to:
  /// **'Start Inspection'**
  String get actionStartInspection;

  /// No description provided for @actionMarkApproved.
  ///
  /// In en, this message translates to:
  /// **'Mark Approved'**
  String get actionMarkApproved;

  /// No description provided for @actionStartWork.
  ///
  /// In en, this message translates to:
  /// **'Start Work'**
  String get actionStartWork;

  /// No description provided for @actionHandToQC.
  ///
  /// In en, this message translates to:
  /// **'Hand to QC'**
  String get actionHandToQC;

  /// No description provided for @actionResumeWork.
  ///
  /// In en, this message translates to:
  /// **'Resume Work'**
  String get actionResumeWork;

  /// No description provided for @actionMarkReady.
  ///
  /// In en, this message translates to:
  /// **'Mark Ready'**
  String get actionMarkReady;

  /// No description provided for @actionCloseJob.
  ///
  /// In en, this message translates to:
  /// **'Close Job'**
  String get actionCloseJob;

  /// No description provided for @actionNoShow.
  ///
  /// In en, this message translates to:
  /// **'No Show'**
  String get actionNoShow;

  /// No description provided for @actionSendEstimate.
  ///
  /// In en, this message translates to:
  /// **'Send Estimate'**
  String get actionSendEstimate;

  /// No description provided for @actionWaitingParts.
  ///
  /// In en, this message translates to:
  /// **'Waiting Parts'**
  String get actionWaitingParts;

  /// No description provided for @actionReopen.
  ///
  /// In en, this message translates to:
  /// **'Reopen'**
  String get actionReopen;

  /// No description provided for @confirmCloseJob.
  ///
  /// In en, this message translates to:
  /// **'Close Job?'**
  String get confirmCloseJob;

  /// No description provided for @confirmCloseJobMessage.
  ///
  /// In en, this message translates to:
  /// **'This will close the job. This action cannot be undone.'**
  String get confirmCloseJobMessage;

  /// No description provided for @cancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancel;

  /// No description provided for @close.
  ///
  /// In en, this message translates to:
  /// **'Close'**
  String get close;

  /// No description provided for @concerns.
  ///
  /// In en, this message translates to:
  /// **'Concerns'**
  String get concerns;

  /// No description provided for @noConcerns.
  ///
  /// In en, this message translates to:
  /// **'No concerns logged'**
  String get noConcerns;

  /// No description provided for @inspectedCount.
  ///
  /// In en, this message translates to:
  /// **'{inspected} of {total} inspected'**
  String inspectedCount(int inspected, int total);

  /// No description provided for @notInspected.
  ///
  /// In en, this message translates to:
  /// **'Not inspected'**
  String get notInspected;

  /// No description provided for @inspectionFinding.
  ///
  /// In en, this message translates to:
  /// **'Inspection Finding'**
  String get inspectionFinding;

  /// No description provided for @concern.
  ///
  /// In en, this message translates to:
  /// **'Concern'**
  String get concern;

  /// No description provided for @findingType.
  ///
  /// In en, this message translates to:
  /// **'Finding Type'**
  String get findingType;

  /// No description provided for @description.
  ///
  /// In en, this message translates to:
  /// **'Description'**
  String get description;

  /// No description provided for @descriptionHint.
  ///
  /// In en, this message translates to:
  /// **'Describe the finding...'**
  String get descriptionHint;

  /// No description provided for @estimatedTime.
  ///
  /// In en, this message translates to:
  /// **'Estimated Time (minutes)'**
  String get estimatedTime;

  /// No description provided for @optional.
  ///
  /// In en, this message translates to:
  /// **'Optional'**
  String get optional;

  /// No description provided for @requestParts.
  ///
  /// In en, this message translates to:
  /// **'Request Parts'**
  String get requestParts;

  /// No description provided for @requestPartsSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Toggle if this finding requires parts'**
  String get requestPartsSubtitle;

  /// No description provided for @partName.
  ///
  /// In en, this message translates to:
  /// **'Part Name'**
  String get partName;

  /// No description provided for @quantity.
  ///
  /// In en, this message translates to:
  /// **'Quantity'**
  String get quantity;

  /// No description provided for @notes.
  ///
  /// In en, this message translates to:
  /// **'Notes'**
  String get notes;

  /// No description provided for @notesHint.
  ///
  /// In en, this message translates to:
  /// **'Optional notes about the part'**
  String get notesHint;

  /// No description provided for @saveFinding.
  ///
  /// In en, this message translates to:
  /// **'Save Finding'**
  String get saveFinding;

  /// No description provided for @findingSaved.
  ///
  /// In en, this message translates to:
  /// **'Finding saved'**
  String get findingSaved;

  /// No description provided for @findingSaveFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to save finding'**
  String get findingSaveFailed;

  /// No description provided for @descriptionRequired.
  ///
  /// In en, this message translates to:
  /// **'Description is required for non-OK findings'**
  String get descriptionRequired;

  /// No description provided for @uploadingPhoto.
  ///
  /// In en, this message translates to:
  /// **'Uploading photo {current}/{total}'**
  String uploadingPhoto(int current, int total);

  /// No description provided for @findingTypeOk.
  ///
  /// In en, this message translates to:
  /// **'OK'**
  String get findingTypeOk;

  /// No description provided for @findingTypeNeedsAttention.
  ///
  /// In en, this message translates to:
  /// **'Needs Attention'**
  String get findingTypeNeedsAttention;

  /// No description provided for @findingTypeCritical.
  ///
  /// In en, this message translates to:
  /// **'Critical'**
  String get findingTypeCritical;

  /// No description provided for @findingTypeDeferred.
  ///
  /// In en, this message translates to:
  /// **'Deferred'**
  String get findingTypeDeferred;

  /// No description provided for @partsStatus.
  ///
  /// In en, this message translates to:
  /// **'Parts Status'**
  String get partsStatus;

  /// No description provided for @noPartsRequested.
  ///
  /// In en, this message translates to:
  /// **'No parts requested'**
  String get noPartsRequested;

  /// No description provided for @failedToLoadParts.
  ///
  /// In en, this message translates to:
  /// **'Failed to load parts'**
  String get failedToLoadParts;

  /// No description provided for @retry.
  ///
  /// In en, this message translates to:
  /// **'Retry'**
  String get retry;

  /// No description provided for @partsRequested.
  ///
  /// In en, this message translates to:
  /// **'Requested'**
  String get partsRequested;

  /// No description provided for @partsSourcing.
  ///
  /// In en, this message translates to:
  /// **'Sourcing'**
  String get partsSourcing;

  /// No description provided for @partsArrived.
  ///
  /// In en, this message translates to:
  /// **'Arrived'**
  String get partsArrived;

  /// No description provided for @partsCancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get partsCancelled;

  /// No description provided for @profile.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get profile;

  /// No description provided for @appVersion.
  ///
  /// In en, this message translates to:
  /// **'App Version'**
  String get appVersion;

  /// No description provided for @signOut.
  ///
  /// In en, this message translates to:
  /// **'Sign Out'**
  String get signOut;

  /// No description provided for @offlineBanner.
  ///
  /// In en, this message translates to:
  /// **'No connection — changes will be saved locally'**
  String get offlineBanner;

  /// No description provided for @priorityLow.
  ///
  /// In en, this message translates to:
  /// **'Low'**
  String get priorityLow;

  /// No description provided for @priorityNormal.
  ///
  /// In en, this message translates to:
  /// **'Normal'**
  String get priorityNormal;

  /// No description provided for @priorityHigh.
  ///
  /// In en, this message translates to:
  /// **'High'**
  String get priorityHigh;

  /// No description provided for @priorityCritical.
  ///
  /// In en, this message translates to:
  /// **'Critical'**
  String get priorityCritical;

  /// No description provided for @phaseReceived.
  ///
  /// In en, this message translates to:
  /// **'Received'**
  String get phaseReceived;

  /// No description provided for @phaseCheckedIn.
  ///
  /// In en, this message translates to:
  /// **'Checked In'**
  String get phaseCheckedIn;

  /// No description provided for @phaseInspection.
  ///
  /// In en, this message translates to:
  /// **'Inspection'**
  String get phaseInspection;

  /// No description provided for @phaseApproval.
  ///
  /// In en, this message translates to:
  /// **'Approval'**
  String get phaseApproval;

  /// No description provided for @phaseInProgress.
  ///
  /// In en, this message translates to:
  /// **'In Progress'**
  String get phaseInProgress;

  /// No description provided for @phaseCompleted.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get phaseCompleted;

  /// No description provided for @checkinReport.
  ///
  /// In en, this message translates to:
  /// **'Check-in Report'**
  String get checkinReport;

  /// No description provided for @advisorNotes.
  ///
  /// In en, this message translates to:
  /// **'Check-in Notes'**
  String get advisorNotes;

  /// No description provided for @inspectionFindings.
  ///
  /// In en, this message translates to:
  /// **'Inspection Findings'**
  String get inspectionFindings;

  /// No description provided for @advisorBadge.
  ///
  /// In en, this message translates to:
  /// **'Advisor'**
  String get advisorBadge;

  /// No description provided for @inspectionBadge.
  ///
  /// In en, this message translates to:
  /// **'Inspection'**
  String get inspectionBadge;

  /// No description provided for @noCheckinNotes.
  ///
  /// In en, this message translates to:
  /// **'No check-in notes'**
  String get noCheckinNotes;

  /// No description provided for @noInspectionFindings.
  ///
  /// In en, this message translates to:
  /// **'No inspection findings yet'**
  String get noInspectionFindings;

  /// No description provided for @advisorNotesCount.
  ///
  /// In en, this message translates to:
  /// **'{count} advisor note{count, plural, one{} other{s}}'**
  String advisorNotesCount(int count);

  /// No description provided for @inspectionFindingsCount.
  ///
  /// In en, this message translates to:
  /// **'{count} finding{count, plural, one{} other{s}}'**
  String inspectionFindingsCount(int count);

  /// No description provided for @customerConcern.
  ///
  /// In en, this message translates to:
  /// **'Customer Concern'**
  String get customerConcern;
}

class _SDelegate extends LocalizationsDelegate<S> {
  const _SDelegate();

  @override
  Future<S> load(Locale locale) {
    return SynchronousFuture<S>(lookupS(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['ar', 'en'].contains(locale.languageCode);

  @override
  bool shouldReload(_SDelegate old) => false;
}

S lookupS(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'ar':
      return SAr();
    case 'en':
      return SEn();
  }

  throw FlutterError(
      'S.delegate failed to load unsupported locale "$locale". This is likely '
      'an issue with the localizations generation tool. Please file an issue '
      'on GitHub with a reproducible sample app and the gen-l10n configuration '
      'that was used.');
}
