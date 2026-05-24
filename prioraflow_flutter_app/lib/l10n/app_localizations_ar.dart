// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Arabic (`ar`).
class SAr extends S {
  SAr([String locale = 'ar']) : super(locale);

  @override
  String get appName => 'بريورا فلو';

  @override
  String get loginTitle => 'تسجيل الدخول';

  @override
  String get loginEmail => 'البريد الإلكتروني';

  @override
  String get loginEmailHint => 'you@workshop.com';

  @override
  String get loginPassword => 'كلمة المرور';

  @override
  String get loginPasswordHint => 'أدخل كلمة المرور';

  @override
  String get loginButton => 'تسجيل الدخول';

  @override
  String get loginErrorInvalid => 'البريد الإلكتروني أو كلمة المرور غير صحيحة';

  @override
  String get loginErrorRateLimit => 'محاولات كثيرة. حاول مرة أخرى لاحقاً.';

  @override
  String get loginErrorConnection => 'لا يمكن الاتصال بالخادم. تحقق من اتصالك.';

  @override
  String get selectWorkshop => 'اختر الورشة';

  @override
  String get selectWorkshopSubtitle => 'اختر ورشة للمتابعة';

  @override
  String get myJobs => 'مهامي';

  @override
  String get searchJobs => 'بحث عن مهام...';

  @override
  String get noJobs => 'لا توجد مهام مخصصة';

  @override
  String get filterAll => 'الكل';

  @override
  String get filterInProgress => 'قيد التنفيذ';

  @override
  String get filterChecking => 'فحص';

  @override
  String get filterWaitingParts => 'بانتظار القطع';

  @override
  String get filterQC => 'ضبط الجودة';

  @override
  String get jobDetail => 'تفاصيل المهمة';

  @override
  String get progress => 'التقدم';

  @override
  String get details => 'التفاصيل';

  @override
  String get promiseTime => 'موعد التسليم';

  @override
  String get odometer => 'عداد المسافة';

  @override
  String get technician => 'الفني';

  @override
  String get advisor => 'المستشار';

  @override
  String get overdue => 'متأخر';

  @override
  String get viewConcerns => 'عرض الملاحظات';

  @override
  String get viewPartsStatus => 'حالة القطع';

  @override
  String get refresh => 'تحديث';

  @override
  String get statusBooked => 'محجوز';

  @override
  String get statusChecking => 'فحص';

  @override
  String get statusEstimateSent => 'تم إرسال التقدير';

  @override
  String get statusApproved => 'تمت الموافقة';

  @override
  String get statusInProgress => 'قيد التنفيذ';

  @override
  String get statusWaitingParts => 'بانتظار القطع';

  @override
  String get statusQualityCheck => 'ضبط الجودة';

  @override
  String get statusReady => 'جاهز';

  @override
  String get statusClosed => 'مغلق';

  @override
  String get statusNoShow => 'لم يحضر';

  @override
  String get actionStartInspection => 'بدء الفحص';

  @override
  String get actionMarkApproved => 'اعتماد';

  @override
  String get actionStartWork => 'بدء العمل';

  @override
  String get actionHandToQC => 'إرسال لضبط الجودة';

  @override
  String get actionResumeWork => 'استئناف العمل';

  @override
  String get actionMarkReady => 'تحديد كجاهز';

  @override
  String get actionCloseJob => 'إغلاق المهمة';

  @override
  String get actionNoShow => 'لم يحضر';

  @override
  String get actionSendEstimate => 'إرسال التقدير';

  @override
  String get actionWaitingParts => 'بانتظار القطع';

  @override
  String get actionReopen => 'إعادة فتح';

  @override
  String get confirmCloseJob => 'إغلاق المهمة؟';

  @override
  String get confirmCloseJobMessage =>
      'سيتم إغلاق المهمة. لا يمكن التراجع عن هذا الإجراء.';

  @override
  String get cancel => 'إلغاء';

  @override
  String get close => 'إغلاق';

  @override
  String get concerns => 'الملاحظات';

  @override
  String get noConcerns => 'لا توجد ملاحظات مسجلة';

  @override
  String inspectedCount(int inspected, int total) {
    return '$inspected من $total تم فحصهم';
  }

  @override
  String get notInspected => 'غير مُفحص';

  @override
  String get inspectionFinding => 'نتيجة الفحص';

  @override
  String get concern => 'الملاحظة';

  @override
  String get findingType => 'نوع النتيجة';

  @override
  String get description => 'الوصف';

  @override
  String get descriptionHint => 'صف النتيجة...';

  @override
  String get estimatedTime => 'الوقت المقدر (دقائق)';

  @override
  String get optional => 'اختياري';

  @override
  String get requestParts => 'طلب قطع';

  @override
  String get requestPartsSubtitle => 'فعّل إذا كانت النتيجة تتطلب قطعاً';

  @override
  String get partName => 'اسم القطعة';

  @override
  String get quantity => 'الكمية';

  @override
  String get notes => 'ملاحظات';

  @override
  String get notesHint => 'ملاحظات اختيارية عن القطعة';

  @override
  String get saveFinding => 'حفظ النتيجة';

  @override
  String get findingSaved => 'تم حفظ النتيجة';

  @override
  String get findingSaveFailed => 'فشل حفظ النتيجة';

  @override
  String get descriptionRequired => 'الوصف مطلوب للنتائج غير المقبولة';

  @override
  String uploadingPhoto(int current, int total) {
    return 'رفع الصورة $current من $total';
  }

  @override
  String get findingTypeOk => 'مقبول';

  @override
  String get findingTypeNeedsAttention => 'يحتاج انتباه';

  @override
  String get findingTypeCritical => 'حرج';

  @override
  String get findingTypeDeferred => 'مؤجل';

  @override
  String get partsStatus => 'حالة القطع';

  @override
  String get noPartsRequested => 'لا توجد قطع مطلوبة';

  @override
  String get failedToLoadParts => 'فشل تحميل القطع';

  @override
  String get retry => 'إعادة المحاولة';

  @override
  String get partsRequested => 'مطلوب';

  @override
  String get partsSourcing => 'جاري التوريد';

  @override
  String get partsArrived => 'وصلت';

  @override
  String get partsCancelled => 'ملغاة';

  @override
  String get profile => 'الملف الشخصي';

  @override
  String get appVersion => 'إصدار التطبيق';

  @override
  String get signOut => 'تسجيل الخروج';

  @override
  String get offlineBanner => 'لا يوجد اتصال — سيتم حفظ التغييرات محلياً';

  @override
  String get priorityLow => 'منخفض';

  @override
  String get priorityNormal => 'عادي';

  @override
  String get priorityHigh => 'مرتفع';

  @override
  String get priorityCritical => 'حرج';

  @override
  String get phaseReceived => 'مستلم';

  @override
  String get phaseCheckedIn => 'تم تسجيل الدخول';

  @override
  String get phaseInspection => 'الفحص';

  @override
  String get phaseApproval => 'الموافقة';

  @override
  String get phaseInProgress => 'قيد التنفيذ';

  @override
  String get phaseCompleted => 'مكتمل';

  @override
  String get checkinReport => 'تقرير الاستلام';

  @override
  String get advisorNotes => 'ملاحظات الاستلام';

  @override
  String get inspectionFindings => 'نتائج الفحص';

  @override
  String get advisorBadge => 'المستشار';

  @override
  String get inspectionBadge => 'الفحص';

  @override
  String get noCheckinNotes => 'لا توجد ملاحظات استلام';

  @override
  String get noInspectionFindings => 'لا توجد نتائج فحص بعد';

  @override
  String advisorNotesCount(int count) {
    return '$count ملاحظة مستشار';
  }

  @override
  String inspectionFindingsCount(int count) {
    return '$count نتيجة فحص';
  }

  @override
  String get customerConcern => 'شكوى العميل';
}
