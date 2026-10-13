import { QueryResultRow } from 'pg';

export interface SchemaQueryable {
  query<R extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[]
  ): Promise<{ rows: R[] }>;
}

export interface SchemaInspection {
  applicationTables: string[];
  missingTables: string[];
  missingColumns: string[];
  missingConstraints: string[];
  compatible: boolean;
}

const expectedTables = [
  'users',
  'user_profiles',
  'equipment_categories',
  'equipment',
  'bookings',
  'rental_sessions',
  'equipment_tracking',
  'payments',
  'notifications',
  'reviews',
];

const expectedColumns: Record<string, string[]> = {
  users: ['id', 'email', 'password_hash', 'full_name', 'phone', 'is_admin', 'created_at', 'updated_at'],
  user_profiles: ['id', 'user_id', 'location_name', 'farm_size_acres', 'address', 'bio', 'avatar_url', 'created_at', 'updated_at'],
  equipment_categories: ['id', 'name', 'description'],
  equipment: ['id', 'owner_id', 'category_id', 'title', 'description', 'hourly_rate', 'daily_rate', 'location_name', 'approx_lat', 'approx_lng', 'status', 'rating_avg', 'rating_count', 'image_url', 'created_at', 'updated_at'],
  bookings: ['id', 'renter_id', 'equipment_id', 'start_date', 'end_date', 'total_hours', 'hourly_rate', 'base_price', 'platform_fee', 'total_price', 'status', 'notes', 'created_at', 'updated_at'],
  rental_sessions: ['id', 'booking_id', 'started_by', 'start_time', 'end_time', 'session_status', 'notes', 'created_at', 'updated_at'],
  equipment_tracking: ['id', 'session_id', 'booking_id', 'latitude', 'longitude', 'source', 'speed_kmh', 'heading_deg', 'recorded_at', 'created_at'],
  payments: ['id', 'booking_id', 'user_id', 'razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature', 'amount', 'currency', 'status', 'payment_method', 'error_code', 'error_description', 'idempotency_key', 'created_at', 'updated_at'],
  notifications: ['id', 'user_id', 'title', 'message', 'type', 'reference_id', 'reference_type', 'is_read', 'created_at'],
  reviews: ['id', 'booking_id', 'equipment_id', 'reviewer_id', 'reviewee_id', 'rating', 'comment', 'review_type', 'created_at', 'updated_at'],
};

export const expectedConstraints = [
  ['users_pkey', 'PRIMARY KEY (id)'],
  ['users_email_key', 'UNIQUE (email)'],
  ['user_profiles_pkey', 'PRIMARY KEY (id)'],
  ['user_profiles_user_id_key', 'UNIQUE (user_id)'],
  ['user_profiles_user_id_fkey', 'FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'],
  ['equipment_categories_pkey', 'PRIMARY KEY (id)'],
  ['equipment_categories_name_key', 'UNIQUE (name)'],
  ['equipment_pkey', 'PRIMARY KEY (id)'],
  ['equipment_owner_id_fkey', 'FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE'],
  ['equipment_category_id_fkey', 'FOREIGN KEY (category_id) REFERENCES equipment_categories(id)'],
  ['equipment_status_check', "CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'paused'::character varying, 'reserved'::character varying, 'in_use'::character varying, 'maintenance'::character varying, 'inactive'::character varying])::text[])))"],
  ['bookings_pkey', 'PRIMARY KEY (id)'],
  ['bookings_renter_id_fkey', 'FOREIGN KEY (renter_id) REFERENCES users(id) ON DELETE RESTRICT'],
  ['bookings_equipment_id_fkey', 'FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE RESTRICT'],
  ['bookings_status_check', "CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'payment_pending'::character varying, 'confirmed'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'rejected'::character varying, 'cancelled'::character varying, 'payment_failed'::character varying, 'disputed'::character varying])::text[])))"],
  ['rental_sessions_pkey', 'PRIMARY KEY (id)'],
  ['rental_sessions_booking_id_fkey', 'FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE RESTRICT'],
  ['rental_sessions_started_by_fkey', 'FOREIGN KEY (started_by) REFERENCES users(id) ON DELETE RESTRICT'],
  ['rental_sessions_session_status_check', "CHECK (((session_status)::text = ANY ((ARRAY['active'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))"],
  ['equipment_tracking_pkey', 'PRIMARY KEY (id)'],
  ['equipment_tracking_session_id_fkey', 'FOREIGN KEY (session_id) REFERENCES rental_sessions(id) ON DELETE CASCADE'],
  ['equipment_tracking_booking_id_fkey', 'FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE'],
  ['equipment_tracking_source_check', "CHECK (((source)::text = ANY ((ARRAY['simulated_gps'::character varying, 'device_gps'::character varying, 'manual'::character varying])::text[])))"],
  ['payments_pkey', 'PRIMARY KEY (id)'],
  ['payments_booking_id_fkey', 'FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE RESTRICT'],
  ['payments_user_id_fkey', 'FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT'],
  ['payments_razorpay_order_id_key', 'UNIQUE (razorpay_order_id)'],
  ['payments_razorpay_payment_id_key', 'UNIQUE (razorpay_payment_id)'],
  ['payments_idempotency_key_key', 'UNIQUE (idempotency_key)'],
  ['payments_status_check', "CHECK (((status)::text = ANY ((ARRAY['created'::character varying, 'authorized'::character varying, 'captured'::character varying, 'failed'::character varying, 'refunded'::character varying])::text[])))"],
  ['notifications_pkey', 'PRIMARY KEY (id)'],
  ['notifications_user_id_fkey', 'FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'],
  ['notifications_type_check', "CHECK (((type)::text = ANY ((ARRAY['booking_request'::character varying, 'booking_accepted'::character varying, 'booking_rejected'::character varying, 'payment_success'::character varying, 'payment_failed'::character varying, 'rental_started'::character varying, 'rental_completed'::character varying, 'tracking_alert'::character varying])::text[])))"],
  ['reviews_pkey', 'PRIMARY KEY (id)'],
  ['reviews_booking_id_fkey', 'FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE'],
  ['reviews_equipment_id_fkey', 'FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE'],
  ['reviews_reviewer_id_fkey', 'FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE RESTRICT'],
  ['reviews_reviewee_id_fkey', 'FOREIGN KEY (reviewee_id) REFERENCES users(id) ON DELETE RESTRICT'],
  ['reviews_rating_check', 'CHECK (((rating >= 1) AND (rating <= 5)))'],
  ['reviews_review_type_check', "CHECK (((review_type)::text = ANY ((ARRAY['renter_to_owner'::character varying, 'owner_to_renter'::character varying])::text[])))"],
  ['uq_booking_reviewer', 'UNIQUE (booking_id, reviewer_id)'],
];

function normalizeDefinition(definition: string): string {
  return definition.replace(/[\s()]/g, '').toLowerCase();
}

export async function inspectExistingSchema(
  client: SchemaQueryable
): Promise<SchemaInspection> {
  const tableResult = await client.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
    [expectedTables]
  );
  const applicationTables = tableResult.rows.map((row) => row.table_name);
  const missingTables = expectedTables.filter((table) => !applicationTables.includes(table));

  const columnResult = await client.query<{ table_name: string; column_name: string }>(
    `SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
    [expectedTables]
  );
  const columns = new Set(columnResult.rows.map((row) => `${row.table_name}.${row.column_name}`));
  const missingColumns = Object.entries(expectedColumns).flatMap(([table, tableColumns]) =>
    tableColumns.filter((column) => !columns.has(`${table}.${column}`)).map((column) => `${table}.${column}`)
  );

  const constraintResult = await client.query<{ constraint_name: string; definition: string }>(
    `SELECT con.conname AS constraint_name, pg_get_constraintdef(con.oid) AS definition
       FROM pg_constraint con
       JOIN pg_namespace ns ON ns.oid = con.connamespace
       JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE ns.nspname = 'public'
        AND rel.relname = ANY($1::text[])`,
    [expectedTables]
  );
  const constraints = new Map(
    constraintResult.rows.map((row) => [row.constraint_name, normalizeDefinition(row.definition)])
  );
  const missingConstraints = expectedConstraints
    .filter(([name, definition]) => constraints.get(name) !== normalizeDefinition(definition))
    .map(([name]) => name);

  return {
    applicationTables,
    missingTables,
    missingColumns,
    missingConstraints,
    compatible: missingTables.length === 0 && missingColumns.length === 0 && missingConstraints.length === 0,
  };
}

export async function hasExistingApplicationSchema(client: SchemaQueryable): Promise<boolean> {
  const result = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
         FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = ANY($1::text[])
     ) AS exists`,
    [expectedTables]
  );
  return result.rows[0]?.exists === true;
}
