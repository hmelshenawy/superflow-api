UPDATE `workshops`
SET `enabled_modules` = CASE
  WHEN `enabled_modules` IS NULL OR `enabled_modules` = '' THEN JSON_ARRAY(
    'dmsIntegration',
    'bookingImport',
    'workshopLoading',
    'capacityManagement',
    'wip',
    'priorityEngine',
    'bottleneckDetection',
    'idleTimeAlerts',
    'nextBestAction',
    'advisorPerformance',
    'technicianPerformance',
    'branchPerformance',
    'operationalAnalytics',
    'financialAnalytics'
  )
  ELSE JSON_ARRAY_APPEND(`enabled_modules`, '$', 'bookingImport')
END
WHERE `product_mode` = 'CONNECT'
  AND (`enabled_modules` IS NULL OR `enabled_modules` NOT LIKE '%bookingImport%');
