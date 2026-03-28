import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://psamprmdbecuarhmtyna.supabase.co"
const supabaseKey = "sb_publishable_7Gs8fXBZjo9VXc-38ryQQA_SrdwTu5N"

export const supabase = createClient(supabaseUrl, supabaseKey)
