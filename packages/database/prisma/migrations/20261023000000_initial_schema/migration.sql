-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "auth";
CREATE SCHEMA IF NOT EXISTS "drivers";
CREATE SCHEMA IF NOT EXISTS "notifications";
CREATE SCHEMA IF NOT EXISTS "payments";
CREATE SCHEMA IF NOT EXISTS "platform";
CREATE SCHEMA IF NOT EXISTS "pricing";
CREATE SCHEMA IF NOT EXISTS "ratings";
CREATE SCHEMA IF NOT EXISTS "trips";
CREATE SCHEMA IF NOT EXISTS "users";
CREATE SCHEMA IF NOT EXISTS "wallet";

-- CreateTable
CREATE TABLE "auth"."credentials" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "password_algo" VARCHAR(50) NOT NULL DEFAULT 'scrypt',
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."refresh_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "device_id" VARCHAR(100),
    "device_name" VARCHAR(100),
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "refresh_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."roles" (
    "id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."user_roles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers"."drivers" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "license_number" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'offline',
    "kyc_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "rating_avg" DECIMAL(3,2) NOT NULL DEFAULT 5.00,
    "trip_count" INTEGER NOT NULL DEFAULT 0,
    "is_available" BOOLEAN NOT NULL DEFAULT false,
    "current_lat" DECIMAL(10,7),
    "current_lng" DECIMAL(10,7),
    "last_location_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers"."vehicles" (
    "id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "make" VARCHAR(50) NOT NULL,
    "model" VARCHAR(50) NOT NULL,
    "year" INTEGER NOT NULL,
    "plate_number" VARCHAR(20) NOT NULL,
    "color" VARCHAR(30) NOT NULL,
    "category" VARCHAR(30) NOT NULL DEFAULT 'standard',
    "capacity" INTEGER NOT NULL DEFAULT 4,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers"."driver_documents" (
    "id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "document_type" VARCHAR(50) NOT NULL,
    "document_url" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "driver_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications"."notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "channel" VARCHAR(20) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "sent_at" TIMESTAMPTZ(6),
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications"."notification_templates" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "channel" VARCHAR(20) NOT NULL,
    "subject" VARCHAR(200),
    "body" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments"."payment_methods" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "last4" VARCHAR(4),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments"."payment_intents" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "passenger_id" UUID NOT NULL,
    "amount_paise" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "status" VARCHAR(30) NOT NULL DEFAULT 'requires_payment_method',
    "idempotency_key" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payment_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments"."payments" (
    "id" UUID NOT NULL,
    "payment_intent_id" UUID,
    "trip_id" UUID NOT NULL,
    "passenger_id" UUID NOT NULL,
    "payment_method_id" UUID,
    "amount_paise" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'initiated',
    "provider_txn_id" VARCHAR(100),
    "idempotency_key" VARCHAR(100),
    "captured_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments"."payment_refunds" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "amount_paise" INTEGER NOT NULL,
    "reason" VARCHAR(255),
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "idempotency_key" VARCHAR(100),
    "provider_txn_id" VARCHAR(100),
    "processed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payment_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."platform_settings" (
    "id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" JSONB NOT NULL,
    "description" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "resource_type" VARCHAR(50) NOT NULL,
    "resource_id" VARCHAR(100),
    "ip_address" VARCHAR(45),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing"."pricing_rules" (
    "id" UUID NOT NULL,
    "category" VARCHAR(30) NOT NULL,
    "base_fare_paise" INTEGER NOT NULL,
    "per_km_rate_paise" INTEGER NOT NULL,
    "per_minute_rate_paise" INTEGER NOT NULL,
    "minimum_fare_paise" INTEGER NOT NULL,
    "cancellation_fee_paise" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pricing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing"."fare_estimates" (
    "id" UUID NOT NULL,
    "category" VARCHAR(30) NOT NULL,
    "distance_meters" INTEGER NOT NULL,
    "duration_seconds" INTEGER NOT NULL,
    "base_fare_paise" INTEGER NOT NULL,
    "distance_fare_paise" INTEGER NOT NULL,
    "time_fare_paise" INTEGER NOT NULL,
    "surge_multiplier" DECIMAL(4,2) NOT NULL DEFAULT 1.00,
    "total_fare_paise" INTEGER NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fare_estimates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing"."surge_zones" (
    "id" UUID NOT NULL,
    "zone_name" VARCHAR(100) NOT NULL,
    "multiplier" DECIMAL(4,2) NOT NULL DEFAULT 1.00,
    "boundary_geo" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "surge_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ratings"."ratings" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "rater_id" UUID NOT NULL,
    "ratee_id" UUID NOT NULL,
    "score" SMALLINT NOT NULL,
    "feedback" TEXT,
    "tags" TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips"."trips" (
    "id" UUID NOT NULL,
    "passenger_id" UUID NOT NULL,
    "driver_id" UUID,
    "vehicle_id" UUID,
    "status" VARCHAR(30) NOT NULL DEFAULT 'requested',
    "pickup_address" TEXT NOT NULL,
    "pickup_lat" DECIMAL(10,7) NOT NULL,
    "pickup_lng" DECIMAL(10,7) NOT NULL,
    "dropoff_address" TEXT NOT NULL,
    "dropoff_lat" DECIMAL(10,7) NOT NULL,
    "dropoff_lng" DECIMAL(10,7) NOT NULL,
    "distance_meters" INTEGER NOT NULL,
    "duration_seconds" INTEGER NOT NULL,
    "estimated_fare_paise" INTEGER NOT NULL,
    "actual_fare_paise" INTEGER,
    "surge_multiplier" DECIMAL(4,2) NOT NULL DEFAULT 1.00,
    "idempotency_key" VARCHAR(100),
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "cancellation_reason" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips"."trip_events" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "from_state" VARCHAR(30),
    "to_state" VARCHAR(30),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips"."ride_offers" (
    "id" UUID NOT NULL,
    "trip_id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ride_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"."users" (
    "id" UUID NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "email" VARCHAR(255),
    "name" VARCHAR(100) NOT NULL,
    "is_phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"."user_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "avatar_url" TEXT,
    "gender" VARCHAR(20),
    "rating_avg" DECIMAL(3,2) NOT NULL DEFAULT 5.00,
    "trip_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users"."user_emergency_contacts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "relationship" VARCHAR(50),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_emergency_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet"."wallets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "balance_paise" INTEGER NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet"."wallet_transactions" (
    "id" UUID NOT NULL,
    "wallet_id" UUID NOT NULL,
    "amount_paise" INTEGER NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'completed',
    "reference_id" VARCHAR(100),
    "idempotency_key" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet"."ledger_entries" (
    "id" UUID NOT NULL,
    "wallet_id" UUID NOT NULL,
    "entry_type" VARCHAR(10) NOT NULL,
    "amount_paise" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "credentials_user_id_key" ON "auth"."credentials"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_sessions_token_hash_key" ON "auth"."refresh_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_sessions_user_id_idx" ON "auth"."refresh_sessions"("user_id");

-- CreateIndex
CREATE INDEX "refresh_sessions_token_hash_idx" ON "auth"."refresh_sessions"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "auth"."roles"("name");

-- CreateIndex
CREATE INDEX "user_roles_user_id_idx" ON "auth"."user_roles"("user_id");

-- CreateIndex
CREATE INDEX "user_roles_role_id_idx" ON "auth"."user_roles"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_id_key" ON "auth"."user_roles"("user_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_user_id_key" ON "drivers"."drivers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_license_number_key" ON "drivers"."drivers"("license_number");

-- CreateIndex
CREATE INDEX "drivers_status_idx" ON "drivers"."drivers"("status");

-- CreateIndex
CREATE INDEX "drivers_is_available_idx" ON "drivers"."drivers"("is_available");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_plate_number_key" ON "drivers"."vehicles"("plate_number");

-- CreateIndex
CREATE INDEX "vehicles_driver_id_idx" ON "drivers"."vehicles"("driver_id");

-- CreateIndex
CREATE INDEX "driver_documents_driver_id_idx" ON "drivers"."driver_documents"("driver_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"."notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"."notifications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_code_key" ON "notifications"."notification_templates"("code");

-- CreateIndex
CREATE INDEX "payment_methods_user_id_idx" ON "payments"."payment_methods"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_intents_idempotency_key_key" ON "payments"."payment_intents"("idempotency_key");

-- CreateIndex
CREATE INDEX "payment_intents_trip_id_idx" ON "payments"."payment_intents"("trip_id");

-- CreateIndex
CREATE INDEX "payment_intents_passenger_id_idx" ON "payments"."payment_intents"("passenger_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_txn_id_key" ON "payments"."payments"("provider_txn_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotency_key_key" ON "payments"."payments"("idempotency_key");

-- CreateIndex
CREATE INDEX "payments_trip_id_idx" ON "payments"."payments"("trip_id");

-- CreateIndex
CREATE INDEX "payments_passenger_id_idx" ON "payments"."payments"("passenger_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_refunds_idempotency_key_key" ON "payments"."payment_refunds"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "payment_refunds_provider_txn_id_key" ON "payments"."payment_refunds"("provider_txn_id");

-- CreateIndex
CREATE INDEX "payment_refunds_payment_id_idx" ON "payments"."payment_refunds"("payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "platform_settings_key_key" ON "platform"."platform_settings"("key");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_idx" ON "platform"."audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "audit_logs_resource_type_idx" ON "platform"."audit_logs"("resource_type");

-- CreateIndex
CREATE UNIQUE INDEX "pricing_rules_category_key" ON "pricing"."pricing_rules"("category");

-- CreateIndex
CREATE UNIQUE INDEX "ratings_trip_id_key" ON "ratings"."ratings"("trip_id");

-- CreateIndex
CREATE INDEX "ratings_ratee_id_idx" ON "ratings"."ratings"("ratee_id");

-- CreateIndex
CREATE INDEX "ratings_trip_id_idx" ON "ratings"."ratings"("trip_id");

-- CreateIndex
CREATE UNIQUE INDEX "trips_idempotency_key_key" ON "trips"."trips"("idempotency_key");

-- CreateIndex
CREATE INDEX "trips_passenger_id_idx" ON "trips"."trips"("passenger_id");

-- CreateIndex
CREATE INDEX "trips_driver_id_idx" ON "trips"."trips"("driver_id");

-- CreateIndex
CREATE INDEX "trips_status_idx" ON "trips"."trips"("status");

-- CreateIndex
CREATE INDEX "trip_events_trip_id_idx" ON "trips"."trip_events"("trip_id");

-- CreateIndex
CREATE INDEX "ride_offers_trip_id_idx" ON "trips"."ride_offers"("trip_id");

-- CreateIndex
CREATE INDEX "ride_offers_driver_id_idx" ON "trips"."ride_offers"("driver_id");

-- CreateIndex
CREATE INDEX "ride_offers_status_idx" ON "trips"."ride_offers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"."users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "users"."user_profiles"("user_id");

-- CreateIndex
CREATE INDEX "user_emergency_contacts_user_id_idx" ON "users"."user_emergency_contacts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_user_id_key" ON "wallet"."wallets"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_transactions_idempotency_key_key" ON "wallet"."wallet_transactions"("idempotency_key");

-- CreateIndex
CREATE INDEX "wallet_transactions_wallet_id_idx" ON "wallet"."wallet_transactions"("wallet_id");

-- CreateIndex
CREATE INDEX "ledger_entries_wallet_id_idx" ON "wallet"."ledger_entries"("wallet_id");

-- AddForeignKey
ALTER TABLE "auth"."user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "auth"."roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers"."vehicles" ADD CONSTRAINT "vehicles_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"."drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers"."driver_documents" ADD CONSTRAINT "driver_documents_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"."drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments"."payments" ADD CONSTRAINT "payments_payment_intent_id_fkey" FOREIGN KEY ("payment_intent_id") REFERENCES "payments"."payment_intents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments"."payments" ADD CONSTRAINT "payments_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payments"."payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments"."payment_refunds" ADD CONSTRAINT "payment_refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"."payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips"."trip_events" ADD CONSTRAINT "trip_events_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"."trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips"."ride_offers" ADD CONSTRAINT "ride_offers_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"."trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users"."user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users"."user_emergency_contacts" ADD CONSTRAINT "user_emergency_contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet"."wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallet"."wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet"."ledger_entries" ADD CONSTRAINT "ledger_entries_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallet"."wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
