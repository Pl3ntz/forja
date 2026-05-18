import { pgTable, text, integer, uuid, index } from 'drizzle-orm/pg-core'
import { coverLetters } from './cover-letters'

export const coverLetterBodyItems = pgTable(
  'cover_letter_body_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    coverLetterId: uuid('cover_letter_id')
      .notNull()
      .references(() => coverLetters.id, { onDelete: 'cascade' }),
    orderIndex: integer('order_index').notNull().default(0),
    label: text('label').notNull().default(''),
    content: text('content').notNull().default(''),
  },
  (t) => [index('cover_letter_body_items_cover_letter_id_idx').on(t.coverLetterId)],
)
