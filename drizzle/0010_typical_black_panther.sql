CREATE TABLE `user_template_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`color` varchar(7) DEFAULT '#8b5cf6',
	`icon` varchar(50) DEFAULT 'folder',
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_template_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `custom_templates` ADD `categoryId` int;--> statement-breakpoint
CREATE INDEX `user_template_categories_user_id_idx` ON `user_template_categories` (`userId`);--> statement-breakpoint
CREATE INDEX `user_template_categories_unique_name_idx` ON `user_template_categories` (`userId`,`name`);