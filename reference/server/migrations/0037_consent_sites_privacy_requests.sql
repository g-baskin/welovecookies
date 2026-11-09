CREATE TABLE `consent_site_daily` (
	`day` text NOT NULL,
	`site` text NOT NULL,
	`metric` text NOT NULL,
	`mode` text NOT NULL,
	`country` text DEFAULT '' NOT NULL,
	`device` text DEFAULT '' NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`day`, `site`, `metric`, `mode`, `country`, `device`)
);
--> statement-breakpoint
CREATE TABLE `consent_sites` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`origin` text NOT NULL,
	`privacy_url` text DEFAULT '' NOT NULL,
	`cookies_json` text,
	`enabled` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `privacy_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`kind` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`email` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`consent_id` text,
	`customer_id` text,
	`country` text,
	`region_code` text,
	`due_at` integer NOT NULL,
	`closed_at` integer,
	`note` text DEFAULT '' NOT NULL,
	`site` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `privacy_requests_created_idx` ON `privacy_requests` (`created_at`);--> statement-breakpoint
CREATE INDEX `privacy_requests_status_idx` ON `privacy_requests` (`status`);--> statement-breakpoint
ALTER TABLE `consent_records` ADD `site` text DEFAULT '' NOT NULL;