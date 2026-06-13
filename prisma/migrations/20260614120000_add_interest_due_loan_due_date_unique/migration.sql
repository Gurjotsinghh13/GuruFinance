-- Prevent duplicate interest due rows for the same loan and due date.
CREATE UNIQUE INDEX "interest_dues_loanId_dueDate_key" ON "interest_dues"("loanId", "dueDate");
