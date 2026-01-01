CREATE INDEX `criteria_session_id_idx` ON `completion_criteria` (`sessionId`);--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`userId`);--> statement-breakpoint
CREATE INDEX `sessions_status_idx` ON `sessions` (`status`);--> statement-breakpoint
CREATE INDEX `sessions_user_status_idx` ON `sessions` (`userId`,`status`);