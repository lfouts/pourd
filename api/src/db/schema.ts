import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  numeric,
  doublePrecision,
  pgEnum,
  unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Better Auth tables ────────────────────────────────────────────────────────

export const users = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const sessions = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
});

export const accounts = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const verifications = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
});

// ─── App tables ────────────────────────────────────────────────────────────────

export const venueTypeEnum = pgEnum('venue_type', ['restaurant', 'bar', 'winery', 'shop', 'home', 'other']);
export const servingStyleEnum = pgEnum('serving_style', ['glass', 'bottle', 'tasting']);

export const profiles = pgTable('profiles', {
  id: text('id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  username: text('username').notNull().unique(),
  display_name: text('display_name'),
  avatar_url: text('avatar_url'),
  bio: text('bio'),
  total_checkins: integer('total_checkins').notNull().default(0),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const wines = pgTable('wines', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  winery: text('winery').notNull(),
  varietals: text('varietals').array().notNull().default([]),
  region: text('region').array(),
  country: text('country'),
  vintage: integer('vintage'),
  label_image_url: text('label_image_url'),
  official_notes: text('official_notes'),
  avg_rating: numeric('avg_rating', { precision: 3, scale: 2 }),
  total_checkins: integer('total_checkins').notNull().default(0),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const venues = pgTable('venues', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  type: venueTypeEnum('type').notNull().default('other'),
  address: text('address'),
  city: text('city'),
  country: text('country'),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const checkins = pgTable('checkins', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  user_id: text('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  wine_id: text('wine_id').notNull().references(() => wines.id, { onDelete: 'cascade' }),
  venue_id: text('venue_id').references(() => venues.id, { onDelete: 'set null' }),
  rating: integer('rating').notNull(),
  description: text('description'),
  guessed_notes: text('guessed_notes').array(),
  actual_notes: text('actual_notes').array(),
  serving_style: servingStyleEnum('serving_style'),
  photo_url: text('photo_url'),
  is_public: boolean('is_public').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const clinks = pgTable('clinks', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  checkin_id: text('checkin_id').notNull().references(() => checkins.id, { onDelete: 'cascade' }),
  user_id: text('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.checkin_id, t.user_id)]);

export const friendships = pgTable('friendships', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  user_id: text('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  friend_id: text('friend_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('pending'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Relations ─────────────────────────────────────────────────────────────────

export const profilesRelations = relations(profiles, ({ many }) => ({
  checkins: many(checkins),
  clinks: many(clinks),
  friendshipsSent: many(friendships, { relationName: 'friendshipsSent' }),
  friendshipsReceived: many(friendships, { relationName: 'friendshipsReceived' }),
}));

export const winesRelations = relations(wines, ({ many }) => ({
  checkins: many(checkins),
}));

export const venuesRelations = relations(venues, ({ many }) => ({
  checkins: many(checkins),
}));

export const checkinsRelations = relations(checkins, ({ one, many }) => ({
  profile: one(profiles, { fields: [checkins.user_id], references: [profiles.id] }),
  wine: one(wines, { fields: [checkins.wine_id], references: [wines.id] }),
  venue: one(venues, { fields: [checkins.venue_id], references: [venues.id] }),
  clinks: many(clinks),
}));

export const clinksRelations = relations(clinks, ({ one }) => ({
  checkin: one(checkins, { fields: [clinks.checkin_id], references: [checkins.id] }),
  profile: one(profiles, { fields: [clinks.user_id], references: [profiles.id] }),
}));

export const friendshipsRelations = relations(friendships, ({ one }) => ({
  user: one(profiles, { fields: [friendships.user_id], references: [profiles.id], relationName: 'friendshipsSent' }),
  friend: one(profiles, { fields: [friendships.friend_id], references: [profiles.id], relationName: 'friendshipsReceived' }),
}));
