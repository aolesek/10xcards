-- Cleanup script for integration tests
-- This script cleans up test data after test execution

-- Clean up tables in correct order (respecting foreign keys)
-- CASCADE automatically handles foreign key constraints in PostgreSQL
TRUNCATE TABLE ai_generations CASCADE;
TRUNCATE TABLE flashcards CASCADE;
TRUNCATE TABLE decks CASCADE;
TRUNCATE TABLE users CASCADE;
