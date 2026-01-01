CREATE TABLE `api_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`provider` enum('codex','claude','gemini','manus') NOT NULL,
	`encryptedKey` text NOT NULL,
	`keyHint` varchar(16),
	`isValid` boolean NOT NULL DEFAULT true,
	`lastValidated` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `api_keys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cli_executions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`iteration` int NOT NULL,
	`command` text NOT NULL,
	`workingDirectory` varchar(512),
	`pid` int,
	`exitCode` int,
	`stdout` text,
	`stderr` text,
	`status` enum('running','completed','failed','killed') NOT NULL DEFAULT 'running',
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `cli_executions_id` PRIMARY KEY(`id`)
);
