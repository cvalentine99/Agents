CREATE TABLE `custom_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`topic` text NOT NULL,
	`category` varchar(100) NOT NULL DEFAULT 'custom',
	`depth` enum('quick','standard','deep') NOT NULL DEFAULT 'standard',
	`tags` json,
	`isPublic` boolean NOT NULL DEFAULT false,
	`usageCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `custom_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `template_favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`templateId` varchar(100) NOT NULL,
	`customTemplateId` int,
	`templateType` enum('builtin','custom') NOT NULL DEFAULT 'builtin',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `template_favorites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `template_usage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`templateId` varchar(100) NOT NULL,
	`customTemplateId` int,
	`templateType` enum('builtin','custom') NOT NULL DEFAULT 'builtin',
	`researchSessionId` int,
	`usedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `template_usage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `custom_templates_user_id_idx` ON `custom_templates` (`userId`);--> statement-breakpoint
CREATE INDEX `custom_templates_category_idx` ON `custom_templates` (`category`);--> statement-breakpoint
CREATE INDEX `template_favorites_user_id_idx` ON `template_favorites` (`userId`);--> statement-breakpoint
CREATE INDEX `template_favorites_unique_idx` ON `template_favorites` (`userId`,`templateId`,`templateType`);--> statement-breakpoint
CREATE INDEX `template_usage_template_id_idx` ON `template_usage` (`templateId`);--> statement-breakpoint
CREATE INDEX `template_usage_user_id_idx` ON `template_usage` (`userId`);--> statement-breakpoint
CREATE INDEX `template_usage_used_at_idx` ON `template_usage` (`usedAt`);