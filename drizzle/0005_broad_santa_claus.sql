CREATE TABLE `research_findings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`researchSessionId` int NOT NULL,
	`title` varchar(512) NOT NULL,
	`content` text NOT NULL,
	`sourceType` enum('web','paper','documentation','code','analysis') NOT NULL DEFAULT 'web',
	`sourceUrl` text,
	`sourceTitle` varchar(512),
	`relevanceScore` int NOT NULL DEFAULT 50,
	`confidence` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`stepNumber` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `research_findings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `research_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`topic` text NOT NULL,
	`depth` enum('quick','standard','deep') NOT NULL DEFAULT 'standard',
	`status` enum('pending','researching','synthesizing','complete','failed') NOT NULL DEFAULT 'pending',
	`currentStep` int NOT NULL DEFAULT 0,
	`totalSteps` int NOT NULL DEFAULT 5,
	`summary` text,
	`sourcesCount` int NOT NULL DEFAULT 0,
	`tokensUsed` int NOT NULL DEFAULT 0,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `research_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `research_steps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`researchSessionId` int NOT NULL,
	`stepNumber` int NOT NULL,
	`stepType` enum('planning','searching','analyzing','synthesizing','verifying') NOT NULL,
	`query` text,
	`reasoning` text,
	`result` text,
	`status` enum('pending','running','complete','failed') NOT NULL DEFAULT 'pending',
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `research_steps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `findings_session_id_idx` ON `research_findings` (`researchSessionId`);--> statement-breakpoint
CREATE INDEX `research_user_id_idx` ON `research_sessions` (`userId`);--> statement-breakpoint
CREATE INDEX `research_status_idx` ON `research_sessions` (`status`);--> statement-breakpoint
CREATE INDEX `steps_session_id_idx` ON `research_steps` (`researchSessionId`);