import { pgTable, text, integer, uuid, index } from 'drizzle-orm/pg-core'
import { cvs } from './cvs'

export const cvCertificationItems = pgTable(
  'cv_certification_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cvId: uuid('cv_id')
      .notNull()
      .references(() => cvs.id, { onDelete: 'cascade' }),
    orderIndex: integer('order_index').notNull().default(0),
    name: text('name').notNull().default(''),
    issuer: text('issuer').notNull().default(''),
    year: text('year').notNull().default(''),
  },
  (t) => [index('cv_certification_items_cv_id_idx').on(t.cvId)],
)
