-- CreateEnum
CREATE TYPE "UserState" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'BANNED');

-- CreateEnum
CREATE TYPE "AuctionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ACTIVE', 'CLOSED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "display_name" VARCHAR(100),
    "avatar_url" TEXT,
    "state" "UserState" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "suspended_reason" TEXT,
    "banned_reason" TEXT,
    "is_seller" BOOLEAN NOT NULL DEFAULT false,
    "seller_enabled_at" TIMESTAMPTZ,
    "email_verified_at" TIMESTAMPTZ,
    "email_verification_token" VARCHAR(255),
    "email_verification_expires_at" TIMESTAMPTZ,
    "password_reset_token" VARCHAR(255),
    "password_reset_expires_at" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "user_id" UUID NOT NULL,
    "phone" VARCHAR(20),
    "address" TEXT,
    "city" VARCHAR(100),
    "country" VARCHAR(100),
    "postal_code" VARCHAR(20),

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID NOT NULL,
    "refresh_token" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "ip_address" VARCHAR(50),
    "user_agent" TEXT,
    "last_used_at" TIMESTAMPTZ,
    "revoked_at" TIMESTAMPTZ,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auctions" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "images" JSONB NOT NULL DEFAULT '[]',
    "starting_price" DECIMAL(10,2) NOT NULL,
    "current_price" DECIMAL(10,2) NOT NULL,
    "starts_at" TIMESTAMPTZ NOT NULL,
    "ends_at" TIMESTAMPTZ NOT NULL,
    "status" "AuctionStatus" NOT NULL DEFAULT 'DRAFT',
    "seller_id" UUID NOT NULL,

    CONSTRAINT "auctions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_type" VARCHAR(100) NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trace_id" VARCHAR(100) NOT NULL,
    "env" VARCHAR(20) NOT NULL,
    "service" VARCHAR(50) NOT NULL,
    "actor_type" VARCHAR(20) NOT NULL,
    "actor_user_id" UUID,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "result" VARCHAR(20) NOT NULL,
    "reason_code" VARCHAR(100),
    "payload" JSONB NOT NULL DEFAULT '{}',
    "payload_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "error_events" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trace_id" VARCHAR(100) NOT NULL,
    "env" VARCHAR(20) NOT NULL,
    "service" VARCHAR(50) NOT NULL,
    "error_code" VARCHAR(100) NOT NULL,
    "message" TEXT NOT NULL,
    "severity" VARCHAR(20) NOT NULL,
    "http_status" INTEGER,
    "is_business_error" BOOLEAN NOT NULL DEFAULT false,
    "http_method" VARCHAR(10),
    "http_path" TEXT,
    "http_query" TEXT,
    "client_ip" VARCHAR(50),
    "user_agent" TEXT,
    "actor_user_id" UUID,
    "entity_type" VARCHAR(50),
    "entity_id" UUID,
    "details" JSONB NOT NULL DEFAULT '{}',
    "stack" TEXT,

    CONSTRAINT "error_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_logs" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trace_id" VARCHAR(100) NOT NULL,
    "env" VARCHAR(20) NOT NULL,
    "service" VARCHAR(50) NOT NULL,
    "http_method" VARCHAR(10) NOT NULL,
    "http_path" TEXT NOT NULL,
    "http_status" INTEGER NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "request_size_bytes" INTEGER,
    "response_size_bytes" INTEGER,
    "actor_user_id" UUID,
    "actor_state" VARCHAR(50),
    "client_ip" VARCHAR(50),
    "user_agent" TEXT,
    "client_app" VARCHAR(20),
    "entity_type" VARCHAR(50),
    "entity_id" UUID,

    CONSTRAINT "request_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "idx_users_email" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_username" ON "users"("username");

-- CreateIndex
CREATE INDEX "idx_users_state" ON "users"("state");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles"("user_id");

-- CreateIndex
CREATE INDEX "idx_profiles_user" ON "profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refresh_token_key" ON "sessions"("refresh_token");

-- CreateIndex
CREATE INDEX "idx_sessions_user" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "idx_sessions_token" ON "sessions"("refresh_token");

-- CreateIndex
CREATE INDEX "idx_sessions_expires" ON "sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "auctions_slug_key" ON "auctions"("slug");

-- CreateIndex
CREATE INDEX "idx_auctions_seller" ON "auctions"("seller_id");

-- CreateIndex
CREATE INDEX "idx_auctions_status" ON "auctions"("status");

-- CreateIndex
CREATE INDEX "idx_auctions_ends_at" ON "auctions"("ends_at");

-- CreateIndex
CREATE INDEX "idx_audit_events_entity" ON "audit_events"("entity_type", "entity_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_events_actor" ON "audit_events"("actor_user_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_events_trace" ON "audit_events"("trace_id");

-- CreateIndex
CREATE INDEX "idx_audit_events_type_time" ON "audit_events"("event_type", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "idx_error_events_trace" ON "error_events"("trace_id");

-- CreateIndex
CREATE INDEX "idx_error_events_code_time" ON "error_events"("error_code", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "idx_error_events_actor" ON "error_events"("actor_user_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "idx_error_events_entity" ON "error_events"("entity_type", "entity_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "idx_error_events_http" ON "error_events"("http_status", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "idx_request_logs_trace" ON "request_logs"("trace_id");

-- CreateIndex
CREATE INDEX "idx_request_logs_path_time" ON "request_logs"("http_path", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "idx_request_logs_status_time" ON "request_logs"("http_status", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "idx_request_logs_actor_time" ON "request_logs"("actor_user_id", "timestamp" DESC);

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
