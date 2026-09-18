PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_background_jobs` (
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
	`result_summary` text
);
--> statement-breakpoint
INSERT INTO `__new_background_jobs`("id", "type", "status", "project_id", "user_id", "progress", "retry_count", "max_retries", "error", "idempotency_key", "created_at", "updated_at", "result_summary") SELECT "id", "type", "status", "project_id", "user_id", "progress", "retry_count", "max_retries", "error", "idempotency_key", "created_at", "updated_at", "result_summary" FROM `background_jobs`;--> statement-breakpoint
DROP TABLE `background_jobs`;--> statement-breakpoint
ALTER TABLE `__new_background_jobs` RENAME TO `background_jobs`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_chunks` (
	`id` text PRIMARY KEY NOT NULL,
	`doc_id` text NOT NULL,
	`doc_title` text NOT NULL,
	`project_id` text NOT NULL,
	`space_id` text NOT NULL,
	`chunk_index` integer NOT NULL,
	`section_title` text,
	`content` text NOT NULL,
	`token_count` integer NOT NULL,
	`security_flags` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_chunks`("id", "doc_id", "doc_title", "project_id", "space_id", "chunk_index", "section_title", "content", "token_count", "security_flags") SELECT "id", "doc_id", "doc_title", "project_id", "space_id", "chunk_index", "section_title", "content", "token_count", "security_flags" FROM `chunks`;--> statement-breakpoint
DROP TABLE `chunks`;--> statement-breakpoint
ALTER TABLE `__new_chunks` RENAME TO `chunks`;--> statement-breakpoint
CREATE TABLE `__new_concept_relationships` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`source_concept_id` text NOT NULL,
	`target_concept_id` text NOT NULL,
	`type` text DEFAULT 'text' NOT NULL,
	`confidence` real NOT NULL,
	`source_evidence_ids` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_concept_relationships`("id", "project_id", "source_concept_id", "target_concept_id", "type", "confidence", "source_evidence_ids") SELECT "id", "project_id", "source_concept_id", "target_concept_id", "type", "confidence", "source_evidence_ids" FROM `concept_relationships`;--> statement-breakpoint
DROP TABLE `concept_relationships`;--> statement-breakpoint
ALTER TABLE `__new_concept_relationships` RENAME TO `concept_relationships`;--> statement-breakpoint
CREATE TABLE `__new_concepts` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`source_chunk_ids` text NOT NULL,
	`prerequisite_concept_ids` text NOT NULL,
	`related_concept_ids` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_concepts`("id", "project_id", "name", "description", "source_chunk_ids", "prerequisite_concept_ids", "related_concept_ids", "created_at", "updated_at") SELECT "id", "project_id", "name", "description", "source_chunk_ids", "prerequisite_concept_ids", "related_concept_ids", "created_at", "updated_at" FROM `concepts`;--> statement-breakpoint
DROP TABLE `concepts`;--> statement-breakpoint
ALTER TABLE `__new_concepts` RENAME TO `concepts`;--> statement-breakpoint
CREATE TABLE `__new_documents` (
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
	`uploaded_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_documents`("id", "project_id", "space_id", "owner_user_id", "title", "source_type", "raw_content", "sanitized_content", "content_hash", "status", "chunk_count", "uploaded_at") SELECT "id", "project_id", "space_id", "owner_user_id", "title", "source_type", "raw_content", "sanitized_content", "content_hash", "status", "chunk_count", "uploaded_at" FROM `documents`;--> statement-breakpoint
DROP TABLE `documents`;--> statement-breakpoint
ALTER TABLE `__new_documents` RENAME TO `documents`;--> statement-breakpoint
CREATE TABLE `__new_exam_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`learner_id` text NOT NULL,
	`config` text NOT NULL,
	`questions` text NOT NULL,
	`responses` text NOT NULL,
	`started_at` integer NOT NULL,
	`completed_at` integer
);
--> statement-breakpoint
INSERT INTO `__new_exam_sessions`("id", "project_id", "learner_id", "config", "questions", "responses", "started_at", "completed_at") SELECT "id", "project_id", "learner_id", "config", "questions", "responses", "started_at", "completed_at" FROM `exam_sessions`;--> statement-breakpoint
DROP TABLE `exam_sessions`;--> statement-breakpoint
ALTER TABLE `__new_exam_sessions` RENAME TO `exam_sessions`;--> statement-breakpoint
CREATE TABLE `__new_learner_concept_states` (
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
	`updated_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_learner_concept_states`("id", "learner_id", "project_id", "concept_id", "concept_name", "mastery", "confidence", "attempt_count", "correct_count", "incorrect_count", "last_attempt_at", "last_correct_at", "recent_performance", "mistake_count", "repeated_mistake_count", "retention_strength", "review_due_at", "repetition_state", "stability_hours", "updated_at") SELECT "id", "learner_id", "project_id", "concept_id", "concept_name", "mastery", "confidence", "attempt_count", "correct_count", "incorrect_count", "last_attempt_at", "last_correct_at", "recent_performance", "mistake_count", "repeated_mistake_count", "retention_strength", "review_due_at", "repetition_state", "stability_hours", "updated_at" FROM `learner_concept_states`;--> statement-breakpoint
DROP TABLE `learner_concept_states`;--> statement-breakpoint
ALTER TABLE `__new_learner_concept_states` RENAME TO `learner_concept_states`;--> statement-breakpoint
CREATE INDEX `idx_learner_project` ON `learner_concept_states` (`learner_id`,`project_id`);--> statement-breakpoint
CREATE TABLE `__new_learning_events` (
	`event_id` text PRIMARY KEY NOT NULL,
	`learner_id` text NOT NULL,
	`project_id` text NOT NULL,
	`concept_id` text,
	`timestamp` text NOT NULL,
	`event_type` text NOT NULL,
	`payload` text NOT NULL,
	`request_id` text
);
--> statement-breakpoint
INSERT INTO `__new_learning_events`("event_id", "learner_id", "project_id", "concept_id", "timestamp", "event_type", "payload", "request_id") SELECT "event_id", "learner_id", "project_id", "concept_id", "timestamp", "event_type", "payload", "request_id" FROM `learning_events`;--> statement-breakpoint
DROP TABLE `learning_events`;--> statement-breakpoint
ALTER TABLE `__new_learning_events` RENAME TO `learning_events`;--> statement-breakpoint
CREATE TABLE `__new_mistake_records` (
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
	`resolution_evidence` text
);
--> statement-breakpoint
INSERT INTO `__new_mistake_records`("mistake_id", "learner_id", "project_id", "concept_id", "question_id", "mistake_type", "learner_answer", "correct_answer", "explanation", "source_evidence", "first_seen_at", "last_seen_at", "occurrence_count", "resolved", "resolution_evidence") SELECT "mistake_id", "learner_id", "project_id", "concept_id", "question_id", "mistake_type", "learner_answer", "correct_answer", "explanation", "source_evidence", "first_seen_at", "last_seen_at", "occurrence_count", "resolved", "resolution_evidence" FROM `mistake_records`;--> statement-breakpoint
DROP TABLE `mistake_records`;--> statement-breakpoint
ALTER TABLE `__new_mistake_records` RENAME TO `mistake_records`;--> statement-breakpoint
CREATE TABLE `__new_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`space_id` text NOT NULL,
	`owner_user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`learning_goals` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_projects`("id", "space_id", "owner_user_id", "name", "description", "learning_goals", "created_at") SELECT "id", "space_id", "owner_user_id", "name", "description", "learning_goals", "created_at" FROM `projects`;--> statement-breakpoint
DROP TABLE `projects`;--> statement-breakpoint
ALTER TABLE `__new_projects` RENAME TO `projects`;--> statement-breakpoint
CREATE TABLE `__new_quiz_questions` (
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
	`source_citation` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_quiz_questions`("id", "project_id", "topic", "bloom_level", "difficulty", "prompt", "options", "correct_option_index", "explanation", "grounding_chunk_id", "source_citation") SELECT "id", "project_id", "topic", "bloom_level", "difficulty", "prompt", "options", "correct_option_index", "explanation", "grounding_chunk_id", "source_citation" FROM `quiz_questions`;--> statement-breakpoint
DROP TABLE `quiz_questions`;--> statement-breakpoint
ALTER TABLE `__new_quiz_questions` RENAME TO `quiz_questions`;--> statement-breakpoint
CREATE TABLE `__new_spaces` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_spaces`("id", "owner_user_id", "name", "description", "created_at") SELECT "id", "owner_user_id", "name", "description", "created_at" FROM `spaces`;--> statement-breakpoint
DROP TABLE `spaces`;--> statement-breakpoint
ALTER TABLE `__new_spaces` RENAME TO `spaces`;