ALTER TABLE `custom_templates` MODIFY COLUMN `userId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `template_favorites` MODIFY COLUMN `userId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `template_usage` MODIFY COLUMN `userId` int NOT NULL;