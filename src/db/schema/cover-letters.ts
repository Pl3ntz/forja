import { pgTable, text, timestamp, uuid, index } from 'drizzle-orm/pg-core'
import { users } from './users'
import { cvs } from './cvs'

// NOTE: NO UNIQUE(user_id, locale) — multiple cover letters per locale are allowed.
export const coverLetters = pgTable(
  'cover_letters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    cvId: uuid('cv_id').references(() => cvs.id, { onDelete: 'set null' }),
    locale: text('locale').notNull(),
    templateId: text('template_id').notNull().default('default'),
    title: text('title').notNull().default(''),
    pdfFilename: text('pdf_filename').notNull().default(''),
    senderName: text('sender_name').notNull().default(''),
    senderTitle: text('sender_title').notNull().default(''),
    senderLocation: text('sender_location').notNull().default(''),
    senderEmail: text('sender_email').notNull().default(''),
    senderPhone: text('sender_phone').notNull().default(''),
    senderLinkedin: text('sender_linkedin').notNull().default(''),
    recipientSalutation: text('recipient_salutation').notNull().default('Dear Hiring Manager'),
    recipientName: text('recipient_name').notNull().default(''),
    recipientCompany: text('recipient_company').notNull().default(''),
    recipientAddress: text('recipient_address').notNull().default(''),
    letterDate: text('letter_date').notNull().default(''),
    closingPhrase: text('closing_phrase').notNull().default('Sincerely,'),
    signature: text('signature').notNull().default(''),
    customLatex: text('custom_latex').notNull().default(''),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('cover_letters_user_id_idx').on(t.userId),
    index('cover_letters_cv_id_idx').on(t.cvId),
  ],
)
