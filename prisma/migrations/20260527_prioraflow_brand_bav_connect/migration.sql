UPDATE `workshops`
SET
  `package_name` = CASE
    WHEN `product_mode` = 'CONNECT' THEN 'PrioraFlow Connect'
    ELSE 'PrioraFlow Workshop'
  END
WHERE `package_name` IN ('SuperFlow Workshop', 'SuperFlow Connect')
   OR `package_name` IS NULL;

UPDATE `workshops`
SET
  `product_mode` = 'CONNECT',
  `dms_integration_enabled` = TRUE,
  `package_name` = 'PrioraFlow Connect',
  `enabled_modules` = JSON_ARRAY(
    'dmsIntegration',
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
WHERE LOWER(COALESCE(`name`, '')) LIKE '%bav%'
   OR LOWER(COALESCE(`slug`, '')) LIKE '%bav%'
   OR LOWER(COALESCE(`email`, '')) LIKE '%bav%';
