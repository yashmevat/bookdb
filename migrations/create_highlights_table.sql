-- Create highlights table for storing user text highlights in books
CREATE TABLE IF NOT EXISTS highlights (
  id INT AUTO_INCREMENT PRIMARY KEY,
  book_id INT NOT NULL,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  page_index INT NOT NULL,
  selected_text TEXT NOT NULL,
  color VARCHAR(50) NOT NULL DEFAULT '#FFFF00',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_book_user (book_id, user_id),
  INDEX idx_page_index (page_index)
);
