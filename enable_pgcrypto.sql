-- Enable pgcrypto for password hashing functions (crypt, gen_salt)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
