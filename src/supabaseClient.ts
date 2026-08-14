import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://iauhmhkmreojmfahvxxh.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhdWhtaGttcmVvam1mYWh2eHhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNDgxODcsImV4cCI6MjEwMTkyNDE4N30.RKrSMG4vYHj4Hdm-27N6JStcr7seCROTvx7FNzY3jF4'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)