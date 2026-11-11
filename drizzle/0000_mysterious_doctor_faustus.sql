CREATE TABLE `planner_data` (
	`user_id` text PRIMARY KEY NOT NULL,
	`data_json` text NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
