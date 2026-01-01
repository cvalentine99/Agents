CREATE TABLE `research_follow_ups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`researchSessionId` int NOT NULL,
	`question` text NOT NULL,
	`answer` text,
	`status` enum('pending','processing','complete','failed') NOT NULL DEFAULT 'pending',
	`tokensUsed` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`answeredAt` timestamp,
	CONSTRAINT `research_follow_ups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `research_sessions` ADD `shareToken` varchar(64);--> statement-breakpoint
ALTER TABLE `research_sessions` ADD `isPublic` boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `followups_session_id_idx` ON `research_follow_ups` (`researchSessionId`);