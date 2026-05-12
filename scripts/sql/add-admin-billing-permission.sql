-- Add admin:billing permission to platform_admin and admin roles
-- (These roles have ALL_PERMISSIONS in code, but the DB role records need updating too)

-- Add the permission to platform_admin role if it doesn't have it
INSERT INTO role_permissions (id, role_id, permission)
SELECT UUID(), r.id, 'admin:billing'
FROM roles r
WHERE r.name = 'platform_admin'
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission = 'admin:billing'
);

-- Add the permission to admin role if it doesn't have it
INSERT INTO role_permissions (id, role_id, permission)
SELECT UUID(), r.id, 'admin:billing'
FROM roles r
WHERE r.name = 'admin'
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission = 'admin:billing'
);