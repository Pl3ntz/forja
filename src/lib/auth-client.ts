import { createAuthClient } from 'better-auth/client'
import { socialClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  plugins: [socialClient()],
})
