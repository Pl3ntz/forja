import { pgTable, text, timestamp, uuid, index } from 'drizzle-orm/pg-core'
import { users } from './users'

export const cvs = pgTable(
  'cvs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    locale: text('locale').notNull(),
    templateId: text('template_id').notNull().default('jake'),
    title: text('title').notNull().default(''),
    headerTitle: text('header_title').notNull().default(''),
    pdfFilename: text('pdf_filename'),
    name: text('name').notNull().default(''),
    location: text('location').notNull().default(''),
    phone: text('phone').notNull().default(''),
    email: text('email').notNull().default(''),
    linkedin: text('linkedin').notNull().default(''),
    github: text('github').notNull().default(''),
    summaryTitle: text('summary_title').notNull().default(''),
    summaryText: text('summary_text').notNull().default(''),
    educationTitle: text('education_title').notNull().default(''),
    experienceTitle: text('experience_title').notNull().default(''),
    projectsTitle: text('projects_title').notNull().default(''),
    skillsTitle: text('skills_title').notNull().default(''),
    languagesTitle: text('languages_title').notNull().default(''),
    sectionOrder: text('section_order'),
    customSections: text('custom_sections'),
    customLatex: text('custom_latex'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('cvs_user_id_idx').on(t.userId),
  ],
)
