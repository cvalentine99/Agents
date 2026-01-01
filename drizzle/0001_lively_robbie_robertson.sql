CREATE TABLE `assembly_line_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`stageConfig` text NOT NULL,
	`status` enum('pending','running','complete','failed') NOT NULL DEFAULT 'pending',
	`currentStage` varchar(64),
	`output` text,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assembly_line_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `checkpoints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`iteration` int NOT NULL,
	`name` varchar(255),
	`description` text,
	`snapshotData` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `checkpoints_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `completion_criteria` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`text` text NOT NULL,
	`checked` boolean NOT NULL DEFAULT false,
	`checkedAt` timestamp,
	`orderIndex` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `completion_criteria_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `diff_hunks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`iteration` int NOT NULL,
	`filePath` varchar(512) NOT NULL,
	`hunkHeader` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`approved` boolean,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `diff_hunks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `file_changes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`iteration` int NOT NULL,
	`path` varchar(512) NOT NULL,
	`changeType` enum('added','modified','deleted') NOT NULL,
	`linesAdded` int NOT NULL DEFAULT 0,
	`linesRemoved` int NOT NULL DEFAULT 0,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `file_changes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `loop_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`iteration` int NOT NULL,
	`diffLines` int NOT NULL DEFAULT 0,
	`testsRun` int NOT NULL DEFAULT 0,
	`testsPassed` int NOT NULL DEFAULT 0,
	`errorsDetected` int NOT NULL DEFAULT 0,
	`duration` int NOT NULL DEFAULT 0,
	`model` enum('codex','claude','gemini','manus') NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `loop_metrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `saved_prompts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`goal` text NOT NULL,
	`context` text,
	`doneWhen` text,
	`doNot` text,
	`expandedPrompt` text,
	`completionPromise` text,
	`targetModel` enum('codex','claude','gemini','manus'),
	`packId` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `saved_prompts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`name` varchar(255),
	`ralphMode` boolean NOT NULL DEFAULT true,
	`maxIterations` int NOT NULL DEFAULT 50,
	`noProgressThreshold` int NOT NULL DEFAULT 3,
	`autoAskHuman` boolean NOT NULL DEFAULT true,
	`safetyMode` enum('standard','strict','permissive') NOT NULL DEFAULT 'standard',
	`selectedModel` enum('codex','claude','gemini','manus') NOT NULL DEFAULT 'claude',
	`selectedProfile` enum('patch_goblin','architect_owl','test_gremlin','refactor_surgeon') NOT NULL DEFAULT 'patch_goblin',
	`status` enum('idle','running','paused','complete','failed') NOT NULL DEFAULT 'idle',
	`currentIteration` int NOT NULL DEFAULT 0,
	`completionProgress` int NOT NULL DEFAULT 0,
	`circuitBreakerState` enum('CLOSED','HALF_OPEN','OPEN') NOT NULL DEFAULT 'CLOSED',
	`noProgressCount` int NOT NULL DEFAULT 0,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessions_sessionId_unique` UNIQUE(`sessionId`)
);
