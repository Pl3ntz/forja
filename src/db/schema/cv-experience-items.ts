import { pgTable, text, uuid, integer, index } from 'drizzle-orm/pg-core'
import { cvs } from './cvs'

export const cvExperienceItems = pgTable(
  'cv_experience_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cvId: uuid('cv_id')
      .notNull()
      .references(() => cvs.id, { onDelete: 'cascade' }),
    orderIndex: integer('order_index').notNull().default(0),
    company: text('company').notNull().default(''),
    role: text('role').notNull().default(''),
    date: text('date').notNull().default(''),
    location: text('location').notNull().default(''),
    highlights: text('highlights').array().notNull().default([]),
    intro: text('intro').notNull().default(''),
    skills: text('skills').notNull().default(''),
  },
  (t) => [index('cv_experience_items_cv_id_idx').on(t.cvId)],
)
