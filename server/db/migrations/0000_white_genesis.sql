CREATE TABLE `background_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text DEFAULT 'text' NOT NULL,
	`status` text NOT NULL,
	`project_id` text NOT NULL,
	`user_id` text NOT NULL,
	`progress` real NOT NULL,
	`retry_count` integer NOT NULL,
	`max_retries` integer NOT NULL,
	`error` text,
	`idempotency_key` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`result_summary` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `chunks` (
	`id` text PRIMARY KEY NOT NULL,
	`doc_id` text NOT NULL,
	`doc_title` text NOT NULL,
	`project_id` text NOT NULL,
	`space_id` text NOT NULL,
	`chunk_index` integer NOT NULL,
	`section_title` text,
	`content` text NOT NULL,
	`token_count` integer NOT NULL,
	`security_flags` text NOT NULL,
	FOREIGN KEY (`doc_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `concept_relationships` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`source_concept_id` text NOT NULL,
	`target_concept_id` text NOT NULL,
	`type` text DEFAULT 'text' NOT NULL,
	`confidence` real NOT NULL,
	`source_evidence_ids` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_concept_id`) REFERENCES `concepts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`target_concept_id`) REFERENCES `concepts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `concepts` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`source_chunk_ids` text NOT NULL,
	`prerequisite_concept_ids` text NOT NULL,
	`related_concept_ids` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `daily_study_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`learner_id` text NOT NULL,
	`date_str` text NOT NULL,
	`items` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`space_id` text NOT NULL,
	`owner_user_id` text NOT NULL,
	`title` text NOT NULL,
	`source_type` text NOT NULL,
	`raw_content` text NOT NULL,
	`sanitized_content` text NOT NULL,
	`content_hash` text NOT NULL,
	`status` text NOT NULL,
	`chunk_count` integer NOT NULL,
	`uploaded_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `exam_results` (
	`exam_id` text PRIMARY KEY NOT NULL,
	`score` real NOT NULL,
	`total_questions` integer NOT NULL,
	`concept_performance` text NOT NULL,
	`bloom_performance` text NOT NULL,
	`new_mistakes` text NOT NULL,
	`mastery_changes` text NOT NULL,
	`recommendations` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `exam_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`learner_id` text NOT NULL,
	`config` text NOT NULL,
	`questions` text NOT NULL,
	`responses` text NOT NULL,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`learner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `idempotency_keys` (
	`key` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `learner_concept_states` (
	`id` text PRIMARY KEY NOT NULL,
	`learner_id` text NOT NULL,
	`project_id` text NOT NULL,
	`concept_id` text NOT NULL,
	`concept_name` text NOT NULL,
	`mastery` real NOT NULL,
	`confidence` real NOT NULL,
	`attempt_count` integer NOT NULL,
	`correct_count` integer NOT NULL,
	`incorrect_count` integer NOT NULL,
	`last_attempt_at` text,
	`last_correct_at` text,
	`recent_performance` text NOT NULL,
	`mistake_count` integer NOT NULL,
	`repeated_mistake_count` integer NOT NULL,
	`retention_strength` real NOT NULL,
	`review_due_at` text NOT NULL,
	`repetition_state` text NOT NULL,
	`stability_hours` real NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`learner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`concept_id`) REFERENCES `concepts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_learner_project` ON `learner_concept_states` (`learner_id`,`project_id`);--> statement-breakpoint
CREATE TABLE `learner_models` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`project_id` text NOT NULL,
	`space_id` text NOT NULL,
	`concept_mastery` text NOT NULL,
	`overall_mastery` real NOT NULL,
	`learning_velocity` real NOT NULL,
	`recommendations` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `learning_events` (
	`event_id` text PRIMARY KEY NOT NULL,
	`learner_id` text NOT NULL,
	`project_id` text NOT NULL,
	`concept_id` text,
	`timestamp` text NOT NULL,
	`event_type` text NOT NULL,
	`payload` text NOT NULL,
	`request_id` text,
	FOREIGN KEY (`learner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `mistake_records` (
	`mistake_id` text PRIMARY KEY NOT NULL,
	`learner_id` text NOT NULL,
	`project_id` text NOT NULL,
	`concept_id` text NOT NULL,
	`question_id` text NOT NULL,
	`mistake_type` text NOT NULL,
	`learner_answer` text NOT NULL,
	`correct_answer` text NOT NULL,
	`explanation` text NOT NULL,
	`source_evidence` text NOT NULL,
	`first_seen_at` text NOT NULL,
	`last_seen_at` text NOT NULL,
	`occurrence_count` integer NOT NULL,
	`resolved` integer NOT NULL,
	`resolution_evidence` text,
	FOREIGN KEY (`learner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`concept_id`) REFERENCES `concepts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`space_id` text NOT NULL,
	`owner_user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`learning_goals` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`space_id`) REFERENCES `spaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `quiz_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`topic` text NOT NULL,
	`bloom_level` text NOT NULL,
	`difficulty` text NOT NULL,
	`prompt` text NOT NULL,
	`options` text NOT NULL,
	`correct_option_index` integer NOT NULL,
	`explanation` text NOT NULL,
	`grounding_chunk_id` text,
	`source_citation` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `socratic_interactions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`concept_id` text NOT NULL,
	`user_query` text NOT NULL,
	`identified_goal` text NOT NULL,
	`current_hint_level` text NOT NULL,
	`ai_question` text NOT NULL,
	`user_response` text,
	`evaluation` text,
	`evaluation_feedback` text,
	`next_hint` text,
	`explanation` text,
	`citations` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `spaces` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tutor_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`project_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`citations` text NOT NULL,
	`grounding_status` text NOT NULL,
	`telemetry` text,
	`timestamp` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);