-- CreateEnum
CREATE TYPE "organization_unit_level" AS ENUM ('DIVISION', 'DEPARTMENT', 'GROUP');

-- CreateEnum
CREATE TYPE "employment_status" AS ENUM ('active', 'retired');

-- CreateEnum
CREATE TYPE "gender" AS ENUM ('male', 'female', 'other');

-- CreateEnum
CREATE TYPE "final_school_type" AS ENUM ('high_school', 'vocational_school', 'junior_college', 'university', 'graduate_school');

-- CreateEnum
CREATE TYPE "graduation_status" AS ENUM ('graduated', 'withdrawn');

-- CreateEnum
CREATE TYPE "auth_provider" AS ENUM ('azure_ad', 'google', 'github');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('employee', 'hr_sales', 'manager');

-- CreateEnum
CREATE TYPE "skill_level" AS ENUM ('expert', 'experienced', 'basic');

-- CreateTable
CREATE TABLE "organization_unit" (
    "id" SERIAL NOT NULL,
    "parent_id" INTEGER,
    "unit_name" VARCHAR(100) NOT NULL,
    "unit_level" "organization_unit_level" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(6) NOT NULL,
    "created_program" VARCHAR(50) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(6) NOT NULL,
    "updated_program" VARCHAR(50) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" VARCHAR(6),
    "deleted_program" VARCHAR(50),

    CONSTRAINT "organization_unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee" (
    "employee_id" VARCHAR(6) NOT NULL,
    "is_registered" BOOLEAN NOT NULL DEFAULT false,
    "employment_status" "employment_status" NOT NULL DEFAULT 'active',
    "organization_unit_id" INTEGER,
    "name" VARCHAR(50),
    "name_kana" VARCHAR(50),
    "birth_date" DATE,
    "gender" "gender",
    "experience_years" INTEGER,
    "career_summary" TEXT,
    "self_pr" TEXT,
    "nearest_station_line" VARCHAR(100),
    "nearest_station_name" VARCHAR(100),
    "final_school_name" VARCHAR(100),
    "final_department_name" VARCHAR(100),
    "final_school_type" "final_school_type",
    "graduation_year_month" DATE,
    "graduation_status" "graduation_status",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(6) NOT NULL,
    "created_program" VARCHAR(50) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(6) NOT NULL,
    "updated_program" VARCHAR(50) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" VARCHAR(6),
    "deleted_program" VARCHAR(50),

    CONSTRAINT "employee_pkey" PRIMARY KEY ("employee_id")
);

-- CreateTable
CREATE TABLE "user_account" (
    "id" SERIAL NOT NULL,
    "employee_id" VARCHAR(6) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "external_id" VARCHAR(255),
    "auth_provider" "auth_provider",
    "role" "user_role" NOT NULL,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(6) NOT NULL,
    "created_program" VARCHAR(50) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(6) NOT NULL,
    "updated_program" VARCHAR(50) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" VARCHAR(6),
    "deleted_program" VARCHAR(50),

    CONSTRAINT "user_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_category" (
    "id" SERIAL NOT NULL,
    "skill_category_name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(6) NOT NULL,
    "created_program" VARCHAR(50) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(6) NOT NULL,
    "updated_program" VARCHAR(50) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" VARCHAR(6),
    "deleted_program" VARCHAR(50),

    CONSTRAINT "skill_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill" (
    "id" SERIAL NOT NULL,
    "skill_category_id" INTEGER NOT NULL,
    "skill_name" VARCHAR(100) NOT NULL,
    "has_version" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(6) NOT NULL,
    "created_program" VARCHAR(50) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(6) NOT NULL,
    "updated_program" VARCHAR(50) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" VARCHAR(6),
    "deleted_program" VARCHAR(50),

    CONSTRAINT "skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_version" (
    "id" SERIAL NOT NULL,
    "skill_id" INTEGER NOT NULL,
    "version_name" VARCHAR(50) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_name" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(6) NOT NULL,
    "created_program" VARCHAR(50) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(6) NOT NULL,
    "updated_program" VARCHAR(50) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" VARCHAR(6),
    "deleted_program" VARCHAR(50),

    CONSTRAINT "skill_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_skill" (
    "id" SERIAL NOT NULL,
    "employee_id" VARCHAR(6) NOT NULL,
    "skill_id" INTEGER NOT NULL,
    "skill_version_id" INTEGER,
    "skill_level" "skill_level" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(6) NOT NULL,
    "created_program" VARCHAR(50) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(6) NOT NULL,
    "updated_program" VARCHAR(50) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" VARCHAR(6),
    "deleted_program" VARCHAR(50),

    CONSTRAINT "employee_skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certification_category" (
    "id" SERIAL NOT NULL,
    "certification_category_name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(6) NOT NULL,
    "created_program" VARCHAR(50) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(6) NOT NULL,
    "updated_program" VARCHAR(50) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" VARCHAR(6),
    "deleted_program" VARCHAR(50),

    CONSTRAINT "certification_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certification" (
    "id" SERIAL NOT NULL,
    "certification_category_id" INTEGER NOT NULL,
    "certification_name" VARCHAR(100) NOT NULL,
    "certification_organization" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(6) NOT NULL,
    "created_program" VARCHAR(50) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(6) NOT NULL,
    "updated_program" VARCHAR(50) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" VARCHAR(6),
    "deleted_program" VARCHAR(50),

    CONSTRAINT "certification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_certification" (
    "id" SERIAL NOT NULL,
    "employee_id" VARCHAR(6) NOT NULL,
    "certification_id" INTEGER NOT NULL,
    "acquired_date" DATE NOT NULL,
    "expiration_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(6) NOT NULL,
    "created_program" VARCHAR(50) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(6) NOT NULL,
    "updated_program" VARCHAR(50) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" VARCHAR(6),
    "deleted_program" VARCHAR(50),

    CONSTRAINT "employee_certification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site" (
    "id" SERIAL NOT NULL,
    "site_name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(6) NOT NULL,
    "created_program" VARCHAR(50) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(6) NOT NULL,
    "updated_program" VARCHAR(50) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" VARCHAR(6),
    "deleted_program" VARCHAR(50),

    CONSTRAINT "site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project" (
    "id" SERIAL NOT NULL,
    "employee_id" VARCHAR(6) NOT NULL,
    "site_id" INTEGER NOT NULL,
    "project_title" VARCHAR(100) NOT NULL,
    "industry" VARCHAR(100),
    "project_summary" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "total_team_size" VARCHAR(100),
    "team_size" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(6) NOT NULL,
    "created_program" VARCHAR(50) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(6) NOT NULL,
    "updated_program" VARCHAR(50) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" VARCHAR(6),
    "deleted_program" VARCHAR(50),

    CONSTRAINT "project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_role" (
    "id" SERIAL NOT NULL,
    "project_role_name" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(6) NOT NULL,
    "created_program" VARCHAR(50) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(6) NOT NULL,
    "updated_program" VARCHAR(50) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" VARCHAR(6),
    "deleted_program" VARCHAR(50),

    CONSTRAINT "project_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_role_link" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "project_role_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(6) NOT NULL,
    "created_program" VARCHAR(50) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(6) NOT NULL,
    "updated_program" VARCHAR(50) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" VARCHAR(6),
    "deleted_program" VARCHAR(50),

    CONSTRAINT "project_role_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_detail" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "overview" VARCHAR(300),
    "research_analysis" BOOLEAN,
    "requirements_definition" BOOLEAN,
    "basic_design" BOOLEAN,
    "detailed_design" BOOLEAN,
    "development" BOOLEAN,
    "testing" BOOLEAN,
    "operation" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(6) NOT NULL,
    "created_program" VARCHAR(50) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(6) NOT NULL,
    "updated_program" VARCHAR(50) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" VARCHAR(6),
    "deleted_program" VARCHAR(50),

    CONSTRAINT "project_detail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_skill" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "skill_id" INTEGER NOT NULL,
    "skill_version_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" VARCHAR(6) NOT NULL,
    "created_program" VARCHAR(50) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" VARCHAR(6) NOT NULL,
    "updated_program" VARCHAR(50) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" VARCHAR(6),
    "deleted_program" VARCHAR(50),

    CONSTRAINT "project_skill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_account_employee_id_key" ON "user_account"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_account_email_key" ON "user_account"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_account_external_id_key" ON "user_account"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "skill_skill_name_key" ON "skill"("skill_name");

-- CreateIndex
CREATE UNIQUE INDEX "employee_skill_employee_id_skill_id_skill_version_id_key" ON "employee_skill"("employee_id", "skill_id", "skill_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "certification_certification_name_key" ON "certification"("certification_name");

-- CreateIndex
CREATE UNIQUE INDEX "site_site_name_key" ON "site"("site_name");

-- CreateIndex
CREATE UNIQUE INDEX "project_role_project_role_name_key" ON "project_role"("project_role_name");

-- CreateIndex
CREATE UNIQUE INDEX "project_role_link_project_id_project_role_id_key" ON "project_role_link"("project_id", "project_role_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_detail_project_id_key" ON "project_detail"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_skill_project_id_skill_id_skill_version_id_key" ON "project_skill"("project_id", "skill_id", "skill_version_id");

-- AddForeignKey
ALTER TABLE "organization_unit" ADD CONSTRAINT "organization_unit_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "organization_unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_organization_unit_id_fkey" FOREIGN KEY ("organization_unit_id") REFERENCES "organization_unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_account" ADD CONSTRAINT "user_account_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("employee_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill" ADD CONSTRAINT "skill_skill_category_id_fkey" FOREIGN KEY ("skill_category_id") REFERENCES "skill_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_version" ADD CONSTRAINT "skill_version_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_skill" ADD CONSTRAINT "employee_skill_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("employee_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_skill" ADD CONSTRAINT "employee_skill_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_skill" ADD CONSTRAINT "employee_skill_skill_version_id_fkey" FOREIGN KEY ("skill_version_id") REFERENCES "skill_version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certification" ADD CONSTRAINT "certification_certification_category_id_fkey" FOREIGN KEY ("certification_category_id") REFERENCES "certification_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_certification" ADD CONSTRAINT "employee_certification_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("employee_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_certification" ADD CONSTRAINT "employee_certification_certification_id_fkey" FOREIGN KEY ("certification_id") REFERENCES "certification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee"("employee_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_role_link" ADD CONSTRAINT "project_role_link_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_role_link" ADD CONSTRAINT "project_role_link_project_role_id_fkey" FOREIGN KEY ("project_role_id") REFERENCES "project_role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_detail" ADD CONSTRAINT "project_detail_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_skill" ADD CONSTRAINT "project_skill_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_skill" ADD CONSTRAINT "project_skill_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_skill" ADD CONSTRAINT "project_skill_skill_version_id_fkey" FOREIGN KEY ("skill_version_id") REFERENCES "skill_version"("id") ON DELETE SET NULL ON UPDATE CASCADE;
