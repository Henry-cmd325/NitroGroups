Base de datos

///////////////////////////////////////////////////////////////
// USUARIOS
///////////////////////////////////////////////////////////////
Table users {
  id int [pk, increment]
  auth0_id varchar(100) [unique, not null, note: 'ID Auth0']
  email varchar(150) [unique, not null]
  first_name varchar(100) [not null]
  last_name varchar(100) [not null]
  phone varchar(20)
  user_type enum('client', 'musician', 'band_member','admin','external') [default: 'client']
  profile_picture_url varchar(500)
  location_text varchar(200)
  created_at timestamptz [default: `now()`]
  last_login_at timestamptz
  email_verified boolean [default: false]
  phone_verified boolean [default: false]
  active boolean [default: true]

  origin enum('signup','group_contact')
  indexes {
    (auth0_id)
    (email)
    (user_type)
    (phone)
  }
}

Table musicians {
  id int [pk, increment]
  user_id int [ref: > users.id, unique, not null, note: 'Perfil 1:1 para músicos']
  years_experience int [default: 0]
  short_bio varchar(800)
  is_open_to_join boolean [default: true]
}

Table musician_songs {
  id int [pk, increment]
  musician_id int [ref: > musicians.id, unique, not null]
  track_id varchar(64) [not null]
}

Table instruments {
  id int [pk, increment]
  name varchar(100) [unique, not null]
}

Table musician_instruments {
  id int [pk, increment]
  id_musician int [ref: > musicians.id, not null]
  id_instrument int [ref: > instruments.id, not null]
}
///////////////////////////////////////////////////////////////
// GRUPOS, MIEMBROS Y ADMINISTRACIÓN
///////////////////////////////////////////////////////////////
Table music_groups {
  id int [pk, increment]
  owner_user_id int [ref: > users.id, not null]
  slug varchar(120) [unique, not null]
  group_name varchar(150) [not null]
  description text
  biography text
  num_members int [default: 1]
  years_experience int [default: 0]

  // Contacto y ubicación
  phone varchar(20)
  email varchar(150)
  location_text varchar(200)
  location_point geography [note: 'Geography(Point,4326)']
  service_radius_km int [default: 50]

  // Precios base
  currency char(3) [default: 'MXN']
  base_price decimal(12,2)
  hourly_rate decimal(12,2)
  minimum_duration_hours int [default: 2]
  setup_time_minutes int [default: 30]

  // Métricas
  average_rating decimal(3,2) [default: 0]
  total_reviews int [default: 0]
  view_count int [default: 0]
  booking_count int [default: 0]

  // Estado
  is_verified boolean [default: false]
  is_featured boolean [default: false]
  is_accepting_bookings boolean [default: true]

  // Búsqueda
  search_document tsvector

  created_at timestamptz [default: `now()`]
  updated_at timestamptz [default: `now()`]
  active boolean [default: true]

  indexes {
    (owner_user_id)
    (is_featured, average_rating)
    (is_accepting_bookings, average_rating)
    (location_point)
    (search_document)
  }
}

Table group_songs {
  id int [pk, increment]
  group_id int [ref: > music_groups.id, unique, not null]
  track_id varchar(64) [not null]
}

Table group_members {
  id int [pk, increment]
  group_id int [ref: > music_groups.id]
  user_id int [ref: > users.id]
  role enum('leader','member','guest') [default: 'member']
  is_active boolean [default: true]
  joined_at timestamptz [default: `now()`]
  left_at timestamptz
  joined_via enum('request','invitation','manual') [default: 'manual']
  approved_by int [ref: > users.id]

  indexes {
    (group_id, user_id) [unique]
    (group_id, is_active)
  }
}

Table group_admins {
  id int [pk, increment]
  group_id int [ref: > music_groups.id]
  user_id int [ref: > users.id]
  role enum('owner','manager') [default: 'manager', note: 'Debe existir en group_members']
  added_at timestamptz [default: `now()`]

  indexes {
    (group_id, user_id) [unique]
    (group_id)
  }
}

Table member_instruments {
  id int [pk, increment]
  group_id int [ref: > music_groups.id]
  user_id int [ref: > users.id]
  instrument_id int [ref: > instruments.id]
  proficiency enum('beginner','intermediate','advanced','expert') [default: 'intermediate']
  is_primary boolean [default: false]

  indexes {
    (group_id, user_id, instrument_id) [unique]
  }
}

Table group_contacts {
  id int [pk, increment]
  group_id int [ref: > music_groups.id, not null]
  user_id int [ref: > users.id, not null]
  label varchar(50) 
  created_at timestamptz
  updated_at timestamptz
}

///////////////////////////////////////////////////////////////
// GÉNEROS Y CLASIFICACIÓN
///////////////////////////////////////////////////////////////
Table music_genres {
  id int [pk, increment]
  name varchar(100) [unique, not null]
  slug varchar(120) [unique, not null]
  description text
  icon_url varchar(500)
  color_hex varchar(7)
  is_active boolean [default: true]
  search_document tsvector
}

Table group_genres {
  id int [pk, increment]
  group_id int [ref: > music_groups.id]
  genre_id int [ref: > music_genres.id]
  is_primary boolean [default: false]

  indexes {
    (group_id, genre_id) [unique]
    (group_id)
    (genre_id)
  }
}

///////////////////////////////////////////////////////////////
// TIPOS DE EVENTO Y PRECIOS PERSONALIZADOS
///////////////////////////////////////////////////////////////
Table event_types {
  id int [pk, increment]
  name varchar(100) [not null]
  slug varchar(120) [unique, not null]
  description text
  typical_duration_hours int [default: 4]
  is_active boolean [default: true]
}

Table group_event_types {
  id int [pk, increment]
  group_id int [ref: > music_groups.id]
  event_type_id int [ref: > event_types.id]
  custom_price decimal(12,2)
  currency char(3) [default: 'MXN']
  description text

  indexes {
    (group_id, event_type_id) [unique]
  }
}

///////////////////////////////////////////////////////////////
// MEDIA DEL GRUPO
///////////////////////////////////////////////////////////////
Table group_media {
  id int [pk, increment]
  group_id int [ref: > music_groups.id]
  type enum('photo','video','audio') [not null]
  url varchar(500) [not null]
  thumbnail_url varchar(500)
  title varchar(200)
  description text
  file_size_bytes bigint
  duration_seconds int
  is_primary boolean [default: false]
  display_order int [default: 0]
  uploaded_at timestamptz [default: `now()`]
  deleted_at timestamptz

  indexes {
    (group_id, type)
    (group_id, display_order)
    (group_id)
  }
}

///////////////////////////////////////////////////////////////
// DISPONIBILIDAD Y AGENDA
///////////////////////////////////////////////////////////////
Table group_availability {
  id int [pk, increment]
  group_id int [ref: > music_groups.id]
  start_at timestamptz [not null]
  end_at timestamptz [not null]
  available boolean [default: true]
  custom_price decimal(12,2)
  note varchar(200)
  rrule text
  timezone varchar(50) [default: 'UTC']
  created_at timestamptz [default: `now()`]
  updated_at timestamptz [default: `now()`]

  indexes {
    (group_id, start_at)
    (group_id, available)
    (group_id, start_at, end_at)
  }
}

Table busy_schedules {
  id int [pk, increment]
  group_id int [ref: > music_groups.id]
  title varchar(200)
  description varchar(500)
  source enum('contract','rehearsal','maintenance','personal','travel') [default: 'contract']
  contract_id int [ref: > contracts.id]
  start_at timestamptz [not null]
  end_at timestamptz [not null]
  created_at timestamptz [default: `now()`]

  indexes {
    (group_id, start_at)
    (contract_id)
    (group_id, start_at, end_at)
  }
}

///////////////////////////////////////////////////////////////
// CONVERSACIONES Y MENSAJES
///////////////////////////////////////////////////////////////
Table conversations {
  id int [pk, increment]
  client_id int [ref: > users.id]
  group_id int [ref: > music_groups.id]
  subject varchar(255)
  status enum('active','archived','blocked') [default: 'active']
  priority enum('low','normal','high') [default: 'normal']
  last_message_at timestamptz
  last_message_by int [ref: > users.id]
  unread_count_client int [default: 0]
  unread_count_group int [default: 0]
  created_at timestamptz [default: `now()`]
  updated_at timestamptz [default: `now()`]

  indexes {
    (client_id, group_id)
    (last_message_at)
    (status)
  }
}

Table messages {
  id int [pk, increment]
  conversation_id int [ref: > conversations.id]
  sender_id int [ref: > users.id]
  content text [not null]
  message_type enum('text','media','system') [default: 'text']
  metadata json
  quoted_message_id int [ref: > messages.id]
  attachment_url varchar(500)
  sent_at timestamptz [default: `now()`]
  is_edited boolean [default: false]
  edited_at timestamptz

  indexes {
    (conversation_id, sent_at)
    (sender_id)
  }
}

Table message_reads {
  id int [pk, increment]
  message_id int [ref: > messages.id]
  user_id int [ref: > users.id]
  read_at timestamptz

  indexes {
    (message_id, user_id) [unique]
    (user_id)
  }
}

///////////////////////////////////////////////////////////////
// RFP (SOLICITUD DEL EVENTO)
///////////////////////////////////////////////////////////////
Table event_requests {
  id int [pk, increment]
  conversation_id int [ref: > conversations.id, not null]
  client_id int [ref: > users.id, not null]
  group_id int [ref: > music_groups.id, not null]
  event_type_id int [ref: > event_types.id]
  desired_start_at timestamptz [not null]
  desired_end_at timestamptz [not null]
  timezone varchar(50) [default: 'UTC']
  location_text varchar(300) [not null]
  location_point geography
  estimated_guests int
  budget_min decimal(12,2)
  budget_max decimal(12,2)
  currency char(3) [default: 'MXN']
  notes text
  status enum('draft','submitted','in_review','canceled','expired','fulfilled') [default: 'submitted']
  created_at timestamptz [default: `now()`]
  updated_at timestamptz [default: `now()`]

  indexes {
    (conversation_id)
    (client_id, group_id, status)
    (location_point)
  }
}

///////////////////////////////////////////////////////////////
// COTIZACIÓN (header + negociación por versiones)
///////////////////////////////////////////////////////////////
Table quotes {
  id int [pk, increment]
  conversation_id int [ref: > conversations.id, not null]
  event_request_id int [ref: > event_requests.id, not null]
  group_id int [ref: > music_groups.id, not null]
  client_id int [ref: > users.id, not null]

  negotiation_state enum('open','finalized','canceled') [default: 'open']
  currency char(3) [default: 'MXN']

  accepted_version_id int [ref: > quote_versions.id]
  final_subtotal decimal(12,2)
  final_travel_cost decimal(12,2)
  final_tax_amount decimal(12,2)
  final_total_amount decimal(12,2)
  finalized_at timestamptz

  // Snapshot rápido (presentacional)
  subtotal decimal(12,2) [not null]
  travel_cost decimal(12,2) [default: 0]
  tax_amount decimal(12,2) [default: 0]
  total_amount decimal(12,2) [not null]
  valid_until timestamptz
  status enum('draft','sent','accepted','rejected','expired') [default: 'draft']

  created_at timestamptz [default: `now()`]
  updated_at timestamptz [default: `now()`]

  indexes {
    (conversation_id)
    (event_request_id)
    (negotiation_state)
    (accepted_version_id)
  }
}

Table quote_versions {
  id int [pk, increment]
  quote_id int [ref: > quotes.id, not null]
  version_no int [not null]
  proposed_by enum('group','client') [not null]
  note text

  currency char(3) [default: 'MXN']
  subtotal decimal(12,2) [not null]

  travel_distance_km decimal(8,2)
  travel_time_minutes int
  travel_cost decimal(12,2) [default: 0]

  tax_mode enum('included','excluded','exempt') [default: 'excluded']
  tax_rate decimal(5,2)
  tax_amount decimal(12,2) [default: 0]

  total_amount decimal(12,2) [not null]
  valid_until timestamptz
  status enum('proposed','countered','withdrawn','accepted','rejected','expired') [default: 'proposed']

  pricing_policy json
  created_at timestamptz [default: `now()`]
  updated_at timestamptz [default: `now()`]

  indexes {
    (quote_id, version_no) [unique]
    (quote_id, status)
    (status)
    (valid_until)
  }
}

Table quote_line_items {
  id int [pk, increment]
  quote_version_id int [ref: > quote_versions.id, not null]
  kind enum('performance','travel','equipment','discount','other') [default: 'performance']
  description varchar(200) [not null]
  quantity decimal(10,2) [default: 1]
  unit_price decimal(12,2) [default: 0]
  line_total decimal(12,2) [not null]
  display_order int [default: 0]

  indexes {
    (quote_version_id, display_order)
  }
}

///////////////////////////////////////////////////////////////
// CONTRATOS (ligados a versión aceptada)
///////////////////////////////////////////////////////////////
Table contracts {
  id int [pk, increment]
  conversation_id int [ref: > conversations.id]
  client_id int [ref: > users.id, not null]
  group_id int [ref: > music_groups.id]
  quote_version_id int [ref: > quote_versions.id, unique, note: 'NULL si contrato manual']
  event_request_id int [ref: > event_requests.id]
  // Detalles del evento
  event_type_id int [ref: > event_types.id]
  event_start_at timestamptz [not null]
  event_end_at timestamptz [not null]
  event_timezone varchar(50) [default: 'UTC']
  event_address_text varchar(300) [not null]
  event_point geography

  estimated_guests int
  special_requirements text

  // Snapshot financiero
  currency char(3) [default: 'MXN']
  agreed_price decimal(12,2) [not null]
  advance_amount decimal(12,2)
  payment_terms text

  status enum('draft','pending','confirmed','in_progress','completed','canceled') [default: 'draft']
  contract_date timestamptz [default: `now()`]
  confirmed_date timestamptz
  completion_date timestamptz
  cancellation_date timestamptz
  cancellation_reason text
  canceled_by enum('client','group','admin')

  terms_accepted_client boolean [default: false]
  terms_accepted_group boolean [default: false]
  contract_terms text

  client_snapshot_name varchar(50)
  client_snapshot_email varchar(50)
  client_snapshot_phone varchar(50)
  indexes {
    (client_id, event_start_at)
    (group_id, event_start_at)
    (status)
    (event_start_at)
    (quote_version_id)
  }
}

///////////////////////////////////////////////////////////////
// PAGOS Y PAYOUTS
///////////////////////////////////////////////////////////////
Table payments {
  id int [pk, increment]
  contract_id int [ref: > contracts.id]
  amount decimal(12,2) [not null]
  currency char(3) [default: 'MXN']
  method enum('stripe','paypal','bank_transfer','manual') [default: 'stripe']
  provider_tx_id varchar(255)
  idempotency_key varchar(100)
  status enum('initiated','authorized','captured','failed','refunded','disputed') [default: 'initiated']
  created_at timestamptz [default: `now()`]
  updated_at timestamptz [default: `now()`]
  platform_fee_amount decimal(12,2) [not null, note: 'Comisión de la plataforma']
  platform_fee_percentage decimal(5,2) [note: 'Ej: 15.00 para 15%']
  payment_processor_fee decimal(12,2) [note: 'Comisión de Stripe/PayPal']
  net_amount_to_group decimal(12,2) [not null, note: 'Lo que recibe el grupo']
  
  indexes {
    (contract_id, status)
    (idempotency_key)
  }
}

Table payout_accounts {
  id int [pk, increment]
  group_id int [ref: > music_groups.id]
  provider enum('stripe','paypal','bank_transfer') [not null]
  external_account_id varchar(255) [not null]
  status enum('pending','verified','disabled') [default: 'pending']
  created_at timestamptz [default: `now()`]
  updated_at timestamptz [default: `now()`]

  indexes {
    (group_id, provider) [unique]
  }
}

Table payouts {
  id int [pk, increment]
  group_id int [ref: > music_groups.id]
  contract_id int [ref: > contracts.id]
  amount decimal(12,2) [not null]
  currency char(3) [default: 'MXN']
  status enum('pending','processing','paid','failed') [default: 'pending']
  created_at timestamptz [default: `now()`]
  processed_at timestamptz

  indexes {
    (group_id, status)
  }
}

///////////////////////////////////////////////////////////////
// RESEÑAS
///////////////////////////////////////////////////////////////
Table reviews {
  id int [pk, increment]
  contract_id int [ref: > contracts.id]
  reviewer_user_id int [ref: > users.id]
  reviewed_group_id int [ref: > music_groups.id]
  rating int [not null]
  punctuality_rating int
  quality_rating int
  professionalism_rating int
  value_rating int
  comment text
  photos json
  is_verified boolean [default: false]
  is_published boolean [default: true]
  admin_notes text
  review_date timestamptz [default: `now()`]

  indexes {
    (reviewed_group_id, is_published)
    (contract_id, reviewer_user_id) [unique]
    (rating)
    (review_date)
  }
}

///////////////////////////////////////////////////////////////
// SUSCRIPCIONES
///////////////////////////////////////////////////////////////
Table subscription_plans {
  id int [pk, increment]
  plan_code varchar(50) [unique, not null]
  name varchar(50) [not null]
  display_name varchar(100) [not null]
  description text
  price_mxn decimal(10,2) [not null]
  price_usd decimal(10,2)
  billing_cycle enum('monthly','yearly') [default: 'monthly']
  max_photos int [default: 5]
  max_videos int [default: 1]
  max_audio_samples int [default: 0]
  can_be_featured boolean [default: false]
  priority_support boolean [default: false]
  custom_branding boolean [default: false]
  analytics_access boolean [default: false]
  features json
  is_active boolean [default: true]
  created_at timestamptz [default: `now()`]
}

Table subscriptions {
  id int [pk, increment]
  user_id int [ref: > users.id]
  plan_id int [ref: > subscription_plans.id]
  status enum('active','canceled','expired','pending','suspended') [default: 'pending']
  starts_at timestamptz [not null]
  expires_at timestamptz [not null]
  auto_renewal boolean [default: true]
  payment_method enum('stripe','paypal','bank_transfer','manual') [default: 'stripe']
  payment_reference varchar(255)
  amount_paid decimal(12,2)
  currency char(3) [default: 'MXN']
  created_at timestamptz [default: `now()`]
  updated_at timestamptz [default: `now()`]

  indexes {
    (user_id, status)
    (expires_at)
    (plan_id)
  }
}

///////////////////////////////////////////////////////////////
// NOTIFICACIONES
///////////////////////////////////////////////////////////////
Table notifications {
  id int [pk, increment]
  user_id int [ref: > users.id]
  type varchar(50) [not null]
  title varchar(255) [not null]
  message text [not null]
  data json
  action_url varchar(500)
  channel enum('inapp','email','push','sms') [default: 'inapp']
  is_read boolean [default: false]
  read_at timestamptz
  priority enum('low','normal','high') [default: 'normal']
  expires_at timestamptz
  created_at timestamptz [default: `now()`]

  indexes {
    (user_id, is_read)
    (user_id, created_at)
    (expires_at)
  }
}

///////////////////////////////////////////////////////////////
// FAVORITOS
///////////////////////////////////////////////////////////////
Table client_favorites {
  id int [pk, increment]
  client_id int [ref: > users.id]
  group_id int [ref: > music_groups.id]
  created_at timestamptz [default: `now()`]

  indexes {
    (client_id, group_id) [unique]
  }
}

///////////////////////////////////////////////////////////////
// MEMBERSHIP WORKFLOW
///////////////////////////////////////////////////////////////
Table membership_requests {
  id int [pk, increment]
  group_id int [ref: > music_groups.id]
  user_id int [ref: > users.id]
  requested_role enum('leader','member','guest') [default: 'member']
  message text
  portfolio_url varchar(500)
  status enum('pending','approved','rejected','withdrawn','expired') [default: 'pending']
  requested_at timestamptz [default: `now()`]
  decided_by int [ref: > users.id]
  decided_at timestamptz
  expires_at timestamptz

  indexes {
    (group_id, user_id, status)
    (group_id, status)
    (user_id, status)
  }
}

Table membership_request_instruments {
  id int [pk, increment]
  request_id int [ref: > membership_requests.id]
  instrument_id int [ref: > instruments.id]
  proficiency enum('beginner','intermediate','advanced','expert') [default: 'intermediate']
  notes varchar(200)

  indexes {
    (request_id, instrument_id) [unique]
  }
}

Table membership_invitations {
  id int [pk, increment]
  group_id int [ref: > music_groups.id]
  user_id int [ref: > users.id]
  invited_by int [ref: > users.id]
  role enum('leader','member','guest') [default: 'member']
  message text
  status enum('sent','accepted','declined','expired','revoked') [default: 'sent']
  sent_at timestamptz [default: `now()`]
  responded_at timestamptz
  expires_at timestamptz

  indexes {
    (group_id, user_id, status)
    (invited_by)
  }
}

Table membership_invitation_instruments {
  id int [pk, increment]
  invitation_id int [ref: > membership_invitations.id]
  instrument_id int [ref: > instruments.id]
  is_primary boolean [default: false]

  indexes {
    (invitation_id, instrument_id) [unique]
  }
}

Table group_member_events {
  id int [pk, increment]
  group_id int [ref: > music_groups.id]
  user_id int [ref: > users.id]
  event_type enum('requested','approved','rejected','withdrawn','invited','invite_accepted','invite_declined','joined','left','promoted','demoted','removed') [not null]
  actor_user_id int [ref: > users.id]
  related_request_id int [ref: > membership_requests.id]
  related_invitation_id int [ref: > membership_invitations.id]
  notes text
  created_at timestamptz [default: `now()`]

  indexes {
    (group_id, user_id, event_type)
    (created_at)
  }
}

