CREATE TABLE `media_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`space_id` text NOT NULL,
	`project_id` text NOT NULL,
	`filename` text NOT NULL,
	`mime_type` text NOT NULL,
	`file_size` integer NOT NULL,
	`storage_path` text NOT NULL,
	`checksum` text NOT NULL,
	`width` integer,
	`height` integer,
	`duration_seconds` real,
	`media_type` text NOT NULL,
	`processing_status` text DEFAULT 'UPLOADED' NOT NULL,
	`processing_error` text,
	`metadata` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `chunks` ADD `media_asset_id` text;--> statement-breakpoint
ALTER TABLE `chunks` ADD `media_type` text DEFAULT 'text';--> statement-breakpoint
ALTER TABLE `chunks` ADD `bounding_box` text;--> statement-breakpoint
ALTER TABLE `chunks` ADD `time_range` text;