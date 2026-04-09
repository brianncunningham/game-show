function onEdit(e) {
  const sheet = e.range.getSheet();
  const sheetName = sheet.getName();
  const row = e.range.getRow();
  const col = e.range.getColumn();

  // Only run on Game tabs
  if (!/^Game\s+\d+$/i.test(sheetName)) return;

  // Only rows 2 through 16
  if (row < 2 || row > 16) return;

  // Only respond to edits in column B (Theme)
  if (col !== 2) return;

  const theme = sheet.getRange(row, 2).getValue();

  // Song title dropdown columns
  const songCols = [4, 8, 12]; // D, H, L

  // Clear existing song title cells and validations
  songCols.forEach(c => sheet.getRange(row, c).clearContent().clearDataValidations());

  if (!theme) return;

  const ss = e.source;
  const sourceSheet = ss.getSheetByName("Themes & Songs");
  if (!sourceSheet) return;

  const lastRow = sourceSheet.getLastRow();
  if (lastRow < 2) return;

  const data = sourceSheet.getRange(2, 1, lastRow - 1, 4).getValues();

  // Get unique song titles for selected theme
  const songTitles = [...new Set(
    data
      .filter(r => r[0] === theme && r[1] !== "")
      .map(r => r[1])
  )].sort();

  if (songTitles.length === 0) return;

  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(songTitles, true)
    .setAllowInvalid(false)
    .build();

  songCols.forEach(c => {
    sheet.getRange(row, c).setDataValidation(rule);
  });
}