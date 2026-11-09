CREATE TABLE `consent_daily` (
	`day` text NOT NULL,
	`metric` text NOT NULL,
	`mode` text NOT NULL,
	`country` text DEFAULT '' NOT NULL,
	`device` text DEFAULT '' NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`day`, `metric`, `mode`, `country`, `device`)
);
--> statement-breakpoint
CREATE TABLE `consent_records` (
	`id` text PRIMARY KEY NOT NULL,
	`consent_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`action` text NOT NULL,
	`preferences` integer DEFAULT 0 NOT NULL,
	`analytics` integer DEFAULT 0 NOT NULL,
	`marketing` integer DEFAULT 0 NOT NULL,
	`mode` text NOT NULL,
	`country` text,
	`region_code` text,
	`rev` integer DEFAULT 1 NOT NULL,
	`lang` text DEFAULT '' NOT NULL,
	`device` text DEFAULT 'desktop' NOT NULL,
	`gpc` integer DEFAULT 0 NOT NULL,
	`page` text DEFAULT '' NOT NULL,
	`user_agent` text DEFAULT '' NOT NULL,
	`customer_id` text
);
--> statement-breakpoint
CREATE INDEX `consent_records_consent_idx` ON `consent_records` (`consent_id`);--> statement-breakpoint
CREATE INDEX `consent_records_created_idx` ON `consent_records` (`created_at`);--> statement-breakpoint
CREATE TABLE `consent_versions` (
	`rev` integer PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`texts_json` text NOT NULL,
	`cookies_json` text NOT NULL
);
