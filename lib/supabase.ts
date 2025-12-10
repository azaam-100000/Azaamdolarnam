
import { createClient } from '@supabase/supabase-js';

// Hardcoded credentials provided by the user
const supabaseUrl = 'https://bswqcubsauracpnzisni.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzd3FjdWJzYXVyYWNwbnppc25pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNDY0NzMsImV4cCI6MjA4MDcyMjQ3M30.WJgL9MSct84-Vn6vdJsjPnr3oowE4tzf0Qq-8ciJ5Ow';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
