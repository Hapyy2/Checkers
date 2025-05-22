-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('todo', 'in_progress', 'done', 'cancelled');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('owner', 'admin', 'member');

-- CreateEnum
CREATE TYPE "SharePermission" AS ENUM ('read', 'edit', 'admin');

-- CreateEnum
CREATE TYPE "RecurrencePattern" AS ENUM ('daily', 'weekly', 'monthly', 'yearly');

-- CreateTable
CREATE TABLE "projects" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(36) NOT NULL,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_members" (
    "project_id" INTEGER NOT NULL,
    "user_id" VARCHAR(36) NOT NULL,
    "role" "MemberRole" NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("project_id","user_id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "color" VARCHAR(7) NOT NULL DEFAULT '#CCCCCC',
    "project_id" INTEGER NOT NULL,
    "created_by" VARCHAR(36) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(30) NOT NULL,
    "color" VARCHAR(7) NOT NULL DEFAULT '#CCCCCC',
    "project_id" INTEGER NOT NULL,
    "created_by" VARCHAR(36) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "priority" "TaskPriority" NOT NULL,
    "status" "TaskStatus" NOT NULL,
    "due_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(36) NOT NULL,
    "assigned_to" VARCHAR(36),
    "project_id" INTEGER NOT NULL,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "parent_task_id" INTEGER,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_categories" (
    "task_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,

    CONSTRAINT "task_categories_pkey" PRIMARY KEY ("task_id","category_id")
);

-- CreateTable
CREATE TABLE "task_tags" (
    "task_id" INTEGER NOT NULL,
    "tag_id" INTEGER NOT NULL,

    CONSTRAINT "task_tags_pkey" PRIMARY KEY ("task_id","tag_id")
);

-- CreateTable
CREATE TABLE "recurring_tasks" (
    "id" SERIAL NOT NULL,
    "task_id" INTEGER NOT NULL,
    "recurrence_pattern" "RecurrencePattern" NOT NULL,
    "recurrence_interval" INTEGER NOT NULL DEFAULT 1,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "days_of_week" SMALLINT,
    "day_of_month" SMALLINT,
    "month_of_year" SMALLINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recurring_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_shares" (
    "id" SERIAL NOT NULL,
    "task_id" INTEGER NOT NULL,
    "shared_by" VARCHAR(36) NOT NULL,
    "shared_with" VARCHAR(36) NOT NULL,
    "permission" "SharePermission" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_projects_created_by" ON "projects"("created_by");

-- CreateIndex
CREATE INDEX "idx_project_members_user" ON "project_members"("user_id");

-- CreateIndex
CREATE INDEX "idx_categories_project" ON "categories"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_project_id_key" ON "categories"("name", "project_id");

-- CreateIndex
CREATE INDEX "idx_tags_project" ON "tags"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_project_id_key" ON "tags"("name", "project_id");

-- CreateIndex
CREATE INDEX "idx_tasks_project" ON "tasks"("project_id");

-- CreateIndex
CREATE INDEX "idx_tasks_created_by" ON "tasks"("created_by");

-- CreateIndex
CREATE INDEX "idx_tasks_assigned_to" ON "tasks"("assigned_to");

-- CreateIndex
CREATE INDEX "idx_tasks_status" ON "tasks"("status");

-- CreateIndex
CREATE INDEX "idx_tasks_priority" ON "tasks"("priority");

-- CreateIndex
CREATE INDEX "idx_tasks_due_date" ON "tasks"("due_date");

-- CreateIndex
CREATE INDEX "idx_tasks_parent" ON "tasks"("parent_task_id");

-- CreateIndex
CREATE INDEX "idx_task_categories_category" ON "task_categories"("category_id");

-- CreateIndex
CREATE INDEX "idx_task_tags_tag" ON "task_tags"("tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "recurring_tasks_task_id_key" ON "recurring_tasks"("task_id");

-- CreateIndex
CREATE INDEX "idx_recurring_tasks_task" ON "recurring_tasks"("task_id");

-- CreateIndex
CREATE INDEX "idx_task_shares_task" ON "task_shares"("task_id");

-- CreateIndex
CREATE INDEX "idx_task_shares_shared_with" ON "task_shares"("shared_with");

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_task_id_fkey" FOREIGN KEY ("parent_task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_categories" ADD CONSTRAINT "task_categories_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_categories" ADD CONSTRAINT "task_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_tags" ADD CONSTRAINT "task_tags_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_tags" ADD CONSTRAINT "task_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_tasks" ADD CONSTRAINT "recurring_tasks_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_shares" ADD CONSTRAINT "task_shares_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
