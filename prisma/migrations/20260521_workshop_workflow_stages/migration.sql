ALTER TABLE `jobs`
  ADD COLUMN `workflow_stage_key` VARCHAR(80) NULL AFTER `workshop_stage`;

CREATE INDEX `idx_jobs_workflow_stage_key` ON `jobs`(`workflow_stage_key`);
