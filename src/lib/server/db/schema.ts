import { relations } from 'drizzle-orm';
import {
	boolean,
	index,
	integer,
	jsonb,
	numeric,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid
} from 'drizzle-orm/pg-core';

export const arenaAsset = pgEnum('arena_asset', ['BTC', 'ETH']);
export const arenaAccessType = pgEnum('arena_access_type', ['PRIVATE', 'PUBLIC']);
export const arenaStatus = pgEnum('arena_status', ['JOINING', 'LIVE', 'COMPLETED', 'CANCELLED']);
export const roundStatus = pgEnum('round_status', [
	'SCHEDULED',
	'TRADING',
	'LOCKED',
	'SETTLED',
	'MISSED'
]);
export const side = pgEnum('side', ['UP', 'DOWN']);
export const pickStatus = pgEnum('pick_status', ['PENDING', 'CONFIRMED', 'REJECTED', 'MISSED']);

export const profiles = pgTable(
	'profiles',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		walletAddress: text('wallet_address').notNull(),
		displayName: text('display_name').notNull(),
		avatarPath: text('avatar_path'),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [uniqueIndex('profiles_wallet_address_idx').on(table.walletAddress)]
);

export const walletChallenges = pgTable('wallet_challenges', {
	walletAddress: text('wallet_address').primaryKey(),
	nonce: text('nonce').notNull(),
	message: text('message').notNull(),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const authSessions = pgTable(
	'auth_sessions',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		profileId: uuid('profile_id')
			.notNull()
			.references(() => profiles.id, { onDelete: 'cascade' }),
		tokenHash: text('token_hash').notNull(),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [uniqueIndex('auth_sessions_token_hash_idx').on(table.tokenHash)]
);

export const arenas = pgTable(
	'arenas',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		name: text('name').notNull(),
		hostProfileId: uuid('host_profile_id')
			.notNull()
			.references(() => profiles.id),
		asset: arenaAsset('asset').notNull(),
		accessType: arenaAccessType('access_type').notNull(),
		inviteCode: text('invite_code').notNull(),
		status: arenaStatus('status').notNull().default('JOINING'),
		roundCount: integer('round_count').notNull(),
		contractQuantity: integer('contract_quantity').notNull().default(10),
		maximumParticipants: integer('maximum_participants').notNull(),
		roundIntervalMinutes: integer('round_interval_minutes').notNull(),
		entryFee: numeric('entry_fee', { precision: 20, scale: 8 }).notNull(),
		startAt: timestamp('start_at', { withTimezone: true }).notNull(),
		description: text('description'),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		completedAt: timestamp('completed_at', { withTimezone: true })
	},
	(table) => [
		uniqueIndex('arenas_invite_code_idx').on(table.inviteCode),
		index('arenas_status_asset_idx').on(table.status, table.asset),
		index('arenas_start_at_idx').on(table.startAt)
	]
);

export const arenaParticipants = pgTable(
	'arena_participants',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		arenaId: uuid('arena_id')
			.notNull()
			.references(() => arenas.id, { onDelete: 'cascade' }),
		profileId: uuid('profile_id')
			.notNull()
			.references(() => profiles.id),
		walletAddress: text('wallet_address').notNull(),
		joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
		totalScore: numeric('total_score', { precision: 20, scale: 8 }).notNull().default('0'),
		correctRounds: integer('correct_rounds').notNull().default(0),
		missedRounds: integer('missed_rounds').notNull().default(0),
		totalTestnetPnl: numeric('total_testnet_pnl', { precision: 20, scale: 8 })
			.notNull()
			.default('0'),
		finalRank: integer('final_rank')
	},
	(table) => [
		uniqueIndex('arena_participants_arena_profile_idx').on(table.arenaId, table.profileId),
		index('arena_participants_arena_score_idx').on(table.arenaId, table.totalScore)
	]
);

export const arenaRounds = pgTable(
	'arena_rounds',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		arenaId: uuid('arena_id')
			.notNull()
			.references(() => arenas.id, { onDelete: 'cascade' }),
		roundNumber: integer('round_number').notNull(),
		dreamDexMarketId: text('dreamdex_market_id'),
		marketSymbol: text('market_symbol'),
		openingPrice: numeric('opening_price', { precision: 38, scale: 18 }),
		closingPrice: numeric('closing_price', { precision: 38, scale: 18 }),
		opensAt: timestamp('opens_at', { withTimezone: true }).notNull(),
		locksAt: timestamp('locks_at', { withTimezone: true }).notNull(),
		settlesAt: timestamp('settles_at', { withTimezone: true }),
		winningSide: side('winning_side'),
		status: roundStatus('status').notNull().default('SCHEDULED')
	},
	(table) => [
		uniqueIndex('arena_rounds_arena_number_idx').on(table.arenaId, table.roundNumber),
		index('arena_rounds_market_id_idx').on(table.dreamDexMarketId)
	]
);

export const arenaPicks = pgTable(
	'arena_picks',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		arenaId: uuid('arena_id')
			.notNull()
			.references(() => arenas.id, { onDelete: 'cascade' }),
		roundId: uuid('round_id')
			.notNull()
			.references(() => arenaRounds.id, { onDelete: 'cascade' }),
		participantId: uuid('participant_id')
			.notNull()
			.references(() => arenaParticipants.id, { onDelete: 'cascade' }),
		walletAddress: text('wallet_address').notNull(),
		selectedSide: side('selected_side').notNull(),
		orderTransactionHash: text('order_transaction_hash'),
		averageFillPrice: numeric('average_fill_price', { precision: 38, scale: 18 }),
		filledQuantity: numeric('filled_quantity', { precision: 38, scale: 18 }),
		actualCost: numeric('actual_cost', { precision: 38, scale: 18 }),
		settlementValue: numeric('settlement_value', { precision: 38, scale: 18 }),
		roundScore: numeric('round_score', { precision: 20, scale: 8 }),
		actualTestnetPnl: numeric('actual_testnet_pnl', { precision: 38, scale: 18 }),
		submittedAt: timestamp('submitted_at', { withTimezone: true }),
		verifiedAt: timestamp('verified_at', { withTimezone: true }),
		status: pickStatus('status').notNull().default('PENDING')
	},
	(table) => [
		uniqueIndex('arena_picks_round_participant_idx').on(table.roundId, table.participantId),
		uniqueIndex('arena_picks_transaction_hash_idx').on(table.orderTransactionHash),
		index('arena_picks_wallet_idx').on(table.walletAddress)
	]
);

export const achievements = pgTable(
	'achievements',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		participantId: uuid('participant_id')
			.notNull()
			.references(() => arenaParticipants.id, { onDelete: 'cascade' }),
		arenaId: uuid('arena_id')
			.notNull()
			.references(() => arenas.id, { onDelete: 'cascade' }),
		type: text('type').notNull(),
		title: text('title').notNull(),
		metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
		awardedAt: timestamp('awarded_at', { withTimezone: true }).defaultNow().notNull(),
		isVisible: boolean('is_visible').notNull().default(true)
	},
	(table) => [
		uniqueIndex('achievements_participant_arena_type_idx').on(
			table.participantId,
			table.arenaId,
			table.type
		)
	]
);

export const profilesRelations = relations(profiles, ({ many }) => ({
	sessions: many(authSessions),
	hostedArenas: many(arenas),
	participations: many(arenaParticipants)
}));

export const arenasRelations = relations(arenas, ({ one, many }) => ({
	host: one(profiles, { fields: [arenas.hostProfileId], references: [profiles.id] }),
	participants: many(arenaParticipants),
	rounds: many(arenaRounds),
	picks: many(arenaPicks)
}));

export const arenaParticipantsRelations = relations(arenaParticipants, ({ one, many }) => ({
	arena: one(arenas, { fields: [arenaParticipants.arenaId], references: [arenas.id] }),
	profile: one(profiles, { fields: [arenaParticipants.profileId], references: [profiles.id] }),
	picks: many(arenaPicks),
	achievements: many(achievements)
}));

export const arenaRoundsRelations = relations(arenaRounds, ({ one, many }) => ({
	arena: one(arenas, { fields: [arenaRounds.arenaId], references: [arenas.id] }),
	picks: many(arenaPicks)
}));

export const arenaPicksRelations = relations(arenaPicks, ({ one }) => ({
	arena: one(arenas, { fields: [arenaPicks.arenaId], references: [arenas.id] }),
	round: one(arenaRounds, { fields: [arenaPicks.roundId], references: [arenaRounds.id] }),
	participant: one(arenaParticipants, {
		fields: [arenaPicks.participantId],
		references: [arenaParticipants.id]
	})
}));
