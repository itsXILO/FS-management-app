DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
		  AND table_name = 'subjects'
		  AND column_name = 'code'
	) THEN
		ALTER TABLE "subjects" ADD COLUMN "code" varchar(10) NOT NULL;
	END IF;
END $$;--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'subjects_code_unique'
	) THEN
		ALTER TABLE "subjects" ADD CONSTRAINT "subjects_code_unique" UNIQUE("code");
	END IF;
END $$;