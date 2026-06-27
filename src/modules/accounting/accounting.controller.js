import * as accountingService from "./accounting.service.js";

function handleError(res, error) {
  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: error.message || "Internal server error",
  });
}

export async function listAccounts(req, res) {
  try {
    const accounts = await accountingService.listAccounts(req.user.tenantId);

    res.status(200).json({
      success: true,
      data: accounts,
    });
  } catch (error) {
    handleError(res, error);
  }
}

export async function listJournalEntries(req, res) {
  try {
    const result = await accountingService.listJournalEntries(
      req.user.tenantId,
      req.query,
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    handleError(res, error);
  }
}

export async function getJournalEntryById(req, res) {
  try {
    const journalEntry = await accountingService.getJournalEntryById(
      req.user.tenantId,
      req.params.id,
    );

    res.status(200).json({
      success: true,
      data: journalEntry,
    });
  } catch (error) {
    handleError(res, error);
  }
}
