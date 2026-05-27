ALTER TABLE `media_files` ADD COLUMN IF NOT EXISTS `concern_id` CHAR(36) NULL;
CREATE INDEX IF NOT EXISTS `idx_media_concern` ON `media_files` (`concern_id`);
ALTER TABLE `media_files` ADD CONSTRAINT `fk_mf_concern` FOREIGN KEY (`concern_id`) REFERENCES `job_concerns` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT;
