var SHEET_NAME = 'Themes & Songs';
var COL_TITLE = 2;   // B
var COL_ARTIST = 3;  // C
var COL_SPOTIFY_ID = 4; // D
var COL_CLIP_START = 5; // E (reserved — not auto-filled, left for manual entry)
var HEADER_ROW = 1;

// ─── Credentials prompt ──────────────────────────────────────────────────────

function promptSpotifyCredentials() {
  var ui = SpreadsheetApp.getUi();

  var clientIdResult = ui.prompt(
    'Spotify Client ID',
    'Enter your Spotify app Client ID:',
    ui.ButtonSet.OK_CANCEL
  );
  if (clientIdResult.getSelectedButton() !== ui.Button.OK) return;

  var clientSecretResult = ui.prompt(
    'Spotify Client Secret',
    'Enter your Spotify app Client Secret:',
    ui.ButtonSet.OK_CANCEL
  );
  if (clientSecretResult.getSelectedButton() !== ui.Button.OK) return;

  var props = PropertiesService.getUserProperties();
  props.setProperty('SPOTIFY_CLIENT_ID', clientIdResult.getResponseText().trim());
  props.setProperty('SPOTIFY_CLIENT_SECRET', clientSecretResult.getResponseText().trim());

  ui.alert('Credentials saved. You can now run "Fetch Spotify IDs".');
}

// ─── Token fetch (Client Credentials — no user login needed for search) ──────

function getSpotifyToken_() {
  var props = PropertiesService.getUserProperties();
  var clientId = props.getProperty('SPOTIFY_CLIENT_ID');
  var clientSecret = props.getProperty('SPOTIFY_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not set. Use Name That Tune → Set Spotify Credentials first.');
  }

  var credentials = Utilities.base64Encode(clientId + ':' + clientSecret);
  var response = UrlFetchApp.fetch('https://accounts.spotify.com/api/token', {
    method: 'post',
    headers: { Authorization: 'Basic ' + credentials },
    payload: 'grant_type=client_credentials',
    muteHttpExceptions: true,
  });

  var data = JSON.parse(response.getContentText());
  if (!data.access_token) {
    throw new Error('Failed to get Spotify token: ' + response.getContentText());
  }
  return data.access_token;
}

// ─── Search for a single track, return track ID or null ──────────────────────

function searchSpotifyTrack_(token, title, artist) {
  var query = encodeURIComponent('track:' + title + ' artist:' + artist);
  var url = 'https://api.spotify.com/v1/search?q=' + query + '&type=track&limit=1';

  var response = UrlFetchApp.fetch(url, {
    headers: { Authorization: 'Bearer ' + token },
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() !== 200) return null;

  var data = JSON.parse(response.getContentText());
  var items = data && data.tracks && data.tracks.items;
  if (!items || items.length === 0) return null;

  return items[0].id;
}

// ─── Main: iterate rows, fill column D ───────────────────────────────────────

function fetchSpotifyIds() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    SpreadsheetApp.getUi().alert('Sheet "' + SHEET_NAME + '" not found.');
    return;
  }

  var lastRow = sheet.getLastRow();
  if (lastRow <= HEADER_ROW) {
    SpreadsheetApp.getUi().alert('No data rows found.');
    return;
  }

  var token;
  try {
    token = getSpotifyToken_();
  } catch (e) {
    SpreadsheetApp.getUi().alert(e.message);
    return;
  }

  var filled = 0;
  var skipped = 0;
  var notFound = 0;
  var errors = [];

  for (var row = HEADER_ROW + 1; row <= lastRow; row++) {
    var title = sheet.getRange(row, COL_TITLE).getValue();
    var artist = sheet.getRange(row, COL_ARTIST).getValue();
    var existing = sheet.getRange(row, COL_SPOTIFY_ID).getValue();

    // Skip empty rows
    if (!title && !artist) continue;

    // Skip rows that already have a Spotify ID
    if (existing) {
      skipped++;
      continue;
    }

    if (!title || !artist) {
      errors.push('Row ' + row + ': missing title or artist');
      continue;
    }

    try {
      var trackId = searchSpotifyTrack_(token, String(title), String(artist));
      if (trackId) {
        sheet.getRange(row, COL_SPOTIFY_ID).setValue(trackId);
        filled++;
      } else {
        sheet.getRange(row, COL_SPOTIFY_ID).setValue('NOT_FOUND');
        notFound++;
      }
      Utilities.sleep(100); // stay well under Spotify rate limits
    } catch (e) {
      errors.push('Row ' + row + ' (' + title + '): ' + e.message);
    }
  }

  var summary = [
    'Done!',
    '  Filled: ' + filled,
    '  Already had ID (skipped): ' + skipped,
    '  Not found: ' + notFound,
  ];
  if (errors.length > 0) {
    summary.push('  Errors: ' + errors.length);
    summary = summary.concat(errors.slice(0, 5));
  }

  SpreadsheetApp.getUi().alert(summary.join('\n'));
}
