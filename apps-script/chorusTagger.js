// ═══════════════════════════════════════════════════════════════════════════
// Chorus Tagger — Spotify remote-control sidebar for tagging chorus_ms
// ═══════════════════════════════════════════════════════════════════════════
//
// SETUP
// -----
// 1. Add the OAuth2 library to this project:
//      Apps Script editor → Libraries (+) → paste script ID
//      1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF → pick latest
//      version → Add. (If pushing via clasp, this is already declared in
//      appsscript.json — but if clasp push complains about the version number,
//      open the editor once, re-select the library, and let it fix the
//      manifest, then `clasp pull` to sync it back.)
// 2. This reuses the SAME Spotify Developer app already configured for
//    "Fetch Spotify IDs" (see spotify.js / promptSpotifyCredentials). Client
//    ID/Secret are read from the same User Properties — no new prompt needed.
// 3. Run `logRedirectUri` once (Apps Script editor → select function → Run),
//    check the Logs (View → Logs) for the exact URL, and add it as a
//    Redirect URI on your Spotify app at https://developer.spotify.com/dashboard.
// 4. Reload the Sheet. Use the new "Name That Tune" menu items:
//      "Authorize Spotify (Chorus Tagger)" — one-time OAuth consent.
//      "Chorus Tagger" — opens the sidebar.
//
// CONFIG — adjust column header text below to match your actual sheet headers.
// ═══════════════════════════════════════════════════════════════════════════

var CHORUS_TAGGER_CONFIG = {
  SHEET_NAME: 'Themes & Songs',   // tab name containing the playlist
  HEADER_ROW: 1,                  // row containing column headers
  COL_TRACK_ID: 'Spotify ID',     // header text of the Spotify track ID column
  COL_TITLE: 'Song Title',        // header text of the title column
  COL_ARTIST: 'Artist',           // header text of the artist column
  COL_CHORUS_MS: 'Chorus Start Ms', // header text of the chorus timestamp column (created if missing)
  REACTION_OFFSET_MS: 750,        // subtracted from captured position when marking
};

// ─── OAuth2 service ───────────────────────────────────────────────────────

/**
 * Builds (or rebuilds) the Spotify OAuth2 service. Reuses the same
 * SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET already stored in User
 * Properties by promptSpotifyCredentials() in spotify.js.
 * @return {OAuth2.Service}
 */
function ctGetSpotifyService_() {
  var props = PropertiesService.getUserProperties();
  var clientId = props.getProperty('SPOTIFY_CLIENT_ID');
  var clientSecret = props.getProperty('SPOTIFY_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not set. Use Name That Tune → Set Spotify Credentials first.');
  }
  return OAuth2.createService('spotifyChorusTagger')
    .setAuthorizationBaseUrl('https://accounts.spotify.com/authorize')
    .setTokenUrl('https://accounts.spotify.com/api/token')
    .setClientId(clientId)
    .setClientSecret(clientSecret)
    .setCallbackFunction('authCallback')
    .setPropertyStore(props)
    .setCache(CacheService.getUserCache())
    .setLock(LockService.getUserLock())
    .setScope('user-modify-playback-state user-read-playback-state')
    .setParam('show_dialog', 'false');
}

/**
 * Logs the exact redirect URI to register on the Spotify developer dashboard.
 */
function logRedirectUri() {
  var service = ctGetSpotifyService_();
  Logger.log(service.getRedirectUri());
}

/**
 * OAuth2 callback handler. Must be a global function named exactly as
 * passed to setCallbackFunction above.
 * @param {Object} request
 * @return {HtmlOutput}
 */
function authCallback(request) {
  var service = ctGetSpotifyService_();
  var authorized = service.handleCallback(request);
  if (authorized) {
    return HtmlService.createHtmlOutput('Spotify authorized — you can close this tab and return to the sidebar.');
  }
  return HtmlService.createHtmlOutput('Authorization denied. You can close this tab and try again.');
}

/**
 * Opens a dialog with a link to Spotify's authorization page, or confirms
 * we're already authorized. Wired to a menu item.
 */
function ctShowAuthorizationDialog() {
  var service = ctGetSpotifyService_();
  var ui = SpreadsheetApp.getUi();
  if (service.hasAccess()) {
    ui.alert('Spotify is already authorized for Chorus Tagger.');
    return;
  }
  var authUrl = service.getAuthorizationUrl();
  var html = HtmlService.createHtmlOutput(
    '<p>Click the link below, sign in to Spotify, and approve access.</p>' +
    '<p><a href="' + authUrl + '" target="_blank">Authorize Chorus Tagger with Spotify</a></p>' +
    '<p>After approving, close that tab and reopen the Chorus Tagger sidebar.</p>'
  ).setWidth(400).setHeight(200);
  ui.showModalDialog(html, 'Authorize Spotify');
}

/**
 * @return {boolean} whether the OAuth2 service currently has a valid token.
 */
function ctIsAuthorized() {
  return ctGetSpotifyService_().hasAccess();
}

// ─── Sidebar ──────────────────────────────────────────────────────────────

/**
 * Opens the Chorus Tagger sidebar. Wired to a menu item.
 */
function ctOpenSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('chorusTaggerSidebar')
    .setTitle('Chorus Tagger');
  SpreadsheetApp.getUi().showSidebar(html);
}

// ─── Column resolution (by header text, not hardcoded letters) ────────────

/**
 * Resolves the Chorus Tagger's sheet + column indices by header text.
 * Creates the chorus_ms header in the first empty header cell if missing.
 * @return {{sheet: Sheet, colTitle: number, colArtist: number, colTrackId: number, colChorusMs: number, lastRow: number}}
 */
function ctResolveColumns_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CHORUS_TAGGER_CONFIG.SHEET_NAME);
  if (!sheet) {
    throw new Error('Sheet "' + CHORUS_TAGGER_CONFIG.SHEET_NAME + '" not found.');
  }
  var headerRow = CHORUS_TAGGER_CONFIG.HEADER_ROW;
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(headerRow, 1, 1, lastCol).getValues()[0];

  var findCol = function (headerText) {
    for (var c = 0; c < headers.length; c++) {
      if (String(headers[c]).trim() === headerText) return c + 1;
    }
    return -1;
  };

  var colTitle = findCol(CHORUS_TAGGER_CONFIG.COL_TITLE);
  var colArtist = findCol(CHORUS_TAGGER_CONFIG.COL_ARTIST);
  var colTrackId = findCol(CHORUS_TAGGER_CONFIG.COL_TRACK_ID);
  var colChorusMs = findCol(CHORUS_TAGGER_CONFIG.COL_CHORUS_MS);

  if (colTitle === -1) throw new Error('Column header "' + CHORUS_TAGGER_CONFIG.COL_TITLE + '" not found in row ' + headerRow + '.');
  if (colArtist === -1) throw new Error('Column header "' + CHORUS_TAGGER_CONFIG.COL_ARTIST + '" not found in row ' + headerRow + '.');
  if (colTrackId === -1) throw new Error('Column header "' + CHORUS_TAGGER_CONFIG.COL_TRACK_ID + '" not found in row ' + headerRow + '.');

  if (colChorusMs === -1) {
    // Create the header in the first empty column.
    var newCol = lastCol + 1;
    for (var c2 = 0; c2 < headers.length; c2++) {
      if (!headers[c2]) { newCol = c2 + 1; break; }
    }
    sheet.getRange(headerRow, newCol).setValue(CHORUS_TAGGER_CONFIG.COL_CHORUS_MS);
    colChorusMs = newCol;
    Logger.log('Created "' + CHORUS_TAGGER_CONFIG.COL_CHORUS_MS + '" header in column ' + newCol + '.');
  }

  return {
    sheet: sheet,
    colTitle: colTitle,
    colArtist: colArtist,
    colTrackId: colTrackId,
    colChorusMs: colChorusMs,
    lastRow: sheet.getLastRow(),
  };
}

// ─── Sheet scan ───────────────────────────────────────────────────────────

/**
 * Finds the first row with an empty chorus_ms cell (and a track ID).
 * @return {{row:number,trackId:string,title:string,artist:string,tagged:number,total:number}|null}
 */
function ctGetNextUntagged() {
  var cols = ctResolveColumns_();
  var headerRow = CHORUS_TAGGER_CONFIG.HEADER_ROW;
  var lastRow = cols.lastRow;
  if (lastRow <= headerRow) return null;

  var numRows = lastRow - headerRow;
  var titles = cols.sheet.getRange(headerRow + 1, cols.colTitle, numRows, 1).getValues();
  var artists = cols.sheet.getRange(headerRow + 1, cols.colArtist, numRows, 1).getValues();
  var trackIds = cols.sheet.getRange(headerRow + 1, cols.colTrackId, numRows, 1).getValues();
  var chorusVals = cols.sheet.getRange(headerRow + 1, cols.colChorusMs, numRows, 1).getValues();

  var total = 0;
  var tagged = 0;
  var nextRow = -1;
  for (var i = 0; i < numRows; i++) {
    var title = titles[i][0];
    var trackId = trackIds[i][0];
    if (!title && !trackId) continue; // skip blank rows
    total++;
    var chorusVal = chorusVals[i][0];
    if (chorusVal !== '' && chorusVal !== null && chorusVal !== undefined) {
      tagged++;
    } else if (nextRow === -1 && trackId) {
      nextRow = headerRow + 1 + i;
    }
  }

  if (nextRow === -1) return { row: null, trackId: null, title: null, artist: null, tagged: tagged, total: total };

  var rowIdx = nextRow - headerRow - 1;
  return {
    row: nextRow,
    trackId: String(trackIds[rowIdx][0]),
    title: String(titles[rowIdx][0]),
    artist: String(artists[rowIdx][0]),
    tagged: tagged,
    total: total,
  };
}

/**
 * Searches rows by title/artist substring (case-insensitive), for jumping
 * directly to a specific song instead of only the next untagged one.
 * @param {string} query
 * @return {Array<{row:number,title:string,artist:string,tagged:boolean}>}
 */
function ctSearchSongs(query) {
  var cols = ctResolveColumns_();
  var headerRow = CHORUS_TAGGER_CONFIG.HEADER_ROW;
  var lastRow = cols.lastRow;
  if (lastRow <= headerRow || !query) return [];

  var numRows = lastRow - headerRow;
  var titles = cols.sheet.getRange(headerRow + 1, cols.colTitle, numRows, 1).getValues();
  var artists = cols.sheet.getRange(headerRow + 1, cols.colArtist, numRows, 1).getValues();
  var trackIds = cols.sheet.getRange(headerRow + 1, cols.colTrackId, numRows, 1).getValues();
  var chorusVals = cols.sheet.getRange(headerRow + 1, cols.colChorusMs, numRows, 1).getValues();

  var needle = String(query).toLowerCase();
  var results = [];
  for (var i = 0; i < numRows; i++) {
    var title = String(titles[i][0] || '');
    var artist = String(artists[i][0] || '');
    var trackId = trackIds[i][0];
    if (!title && !trackId) continue; // skip blank rows
    if (title.toLowerCase().indexOf(needle) === -1 && artist.toLowerCase().indexOf(needle) === -1) continue;

    var chorusVal = chorusVals[i][0];
    results.push({
      row: headerRow + 1 + i,
      title: title,
      artist: artist,
      tagged: chorusVal !== '' && chorusVal !== null && chorusVal !== undefined,
    });
    if (results.length >= 25) break;
  }
  return results;
}

/**
 * Loads a specific row's song info (used by search/jump, mirrors the shape
 * returned by ctGetNextUntagged).
 * @param {number} row
 * @return {{row:number,trackId:string,title:string,artist:string,tagged:number,total:number}|null}
 */
function ctLoadRow(row) {
  var cols = ctResolveColumns_();
  var headerRow = CHORUS_TAGGER_CONFIG.HEADER_ROW;
  var lastRow = cols.lastRow;
  if (row <= headerRow || row > lastRow) {
    throw new Error('Row ' + row + ' is out of range.');
  }

  var numRows = lastRow - headerRow;
  var chorusVals = cols.sheet.getRange(headerRow + 1, cols.colChorusMs, numRows, 1).getValues();
  var trackIds = cols.sheet.getRange(headerRow + 1, cols.colTrackId, numRows, 1).getValues();
  var titles0 = cols.sheet.getRange(headerRow + 1, cols.colTitle, numRows, 1).getValues();

  var tagged = 0;
  var total = 0;
  for (var i = 0; i < numRows; i++) {
    var tid = trackIds[i][0];
    var title0 = titles0[i][0];
    if (!title0 && !tid) continue;
    total++;
    var cv = chorusVals[i][0];
    if (cv !== '' && cv !== null && cv !== undefined) tagged++;
  }

  var trackId = cols.sheet.getRange(row, cols.colTrackId).getValue();
  if (!trackId) {
    throw new Error('Row ' + row + ' has no Spotify ID.');
  }

  return {
    row: row,
    trackId: String(trackId),
    title: String(cols.sheet.getRange(row, cols.colTitle).getValue()),
    artist: String(cols.sheet.getRange(row, cols.colArtist).getValue()),
    tagged: tagged,
    total: total,
  };
}

/**
 * Writes max(0, progressMs - REACTION_OFFSET_MS) into the chorus_ms cell.
 * @param {number} row sheet row number
 * @param {number} progressMs captured playback position
 * @return {number} the saved value
 */
function ctMarkChorus(row, progressMs) {
  var cols = ctResolveColumns_();
  var value = Math.max(0, Math.round(progressMs - CHORUS_TAGGER_CONFIG.REACTION_OFFSET_MS));
  cols.sheet.getRange(row, cols.colChorusMs).setValue(value);
  return value;
}

/**
 * Reads the currently saved chorus_ms value for a row (used by "Test jump").
 * @param {number} row
 * @return {number|null}
 */
function ctGetSavedChorusMs(row) {
  var cols = ctResolveColumns_();
  var val = cols.sheet.getRange(row, cols.colChorusMs).getValue();
  return (val === '' || val === null || val === undefined) ? null : Number(val);
}

/**
 * Writes an absolute chorus_ms value directly (no offset applied, no
 * playback interaction). Used to fine-tune an already-marked value to
 * compensate for play/seek round-trip lag.
 * @param {number} row
 * @param {number} ms
 * @return {number} the saved value (clamped to >= 0)
 */
function ctSetChorusMs(row, ms) {
  var cols = ctResolveColumns_();
  var value = Math.max(0, Math.round(ms));
  cols.sheet.getRange(row, cols.colChorusMs).setValue(value);
  return value;
}

// ─── Spotify Web API helpers ────────────────────────────────────────────

/**
 * Structured error for the sidebar to react to. google.script.run only
 * preserves Error.message across the client/server boundary (custom
 * properties are dropped), so the structured payload is JSON-encoded into
 * the message; the sidebar JS parses it back out in its failure handler.
 * @param {string} type one of 'no_device' | 'reauth' | 'premium_required' | 'error'
 * @param {string} message
 * @param {*} [extra]
 * @return {Error}
 */
function ctError_(type, message, extra) {
  var payload = { ctError: true, type: type, message: message };
  if (extra !== undefined) payload.extra = extra;
  return new Error(JSON.stringify(payload));
}

/**
 * Low-level Spotify fetch with auth, 401 refresh-once, 403 premium message,
 * and 429 Retry-After handling (max 2 attempts total).
 * @param {string} method
 * @param {string} url
 * @param {Object} [payload]
 * @return {{code:number, data:Object}}
 */
function ctSpotifyFetch_(method, url, payload) {
  var service = ctGetSpotifyService_();
  if (!service.hasAccess()) {
    throw ctError_('reauth', 'Not authorized. Use Name That Tune → Authorize Spotify (Chorus Tagger).');
  }

  var options = {
    method: method,
    headers: { Authorization: 'Bearer ' + service.getAccessToken() },
    muteHttpExceptions: true,
    contentType: 'application/json',
  };
  if (payload !== undefined) {
    options.payload = JSON.stringify(payload);
  }

  var attempts = 0;
  var response;
  while (true) {
    attempts++;
    response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();

    if (code === 401 && attempts === 1) {
      service.reset();
      var service2 = ctGetSpotifyService_();
      if (service2.hasAccess()) {
        options.headers.Authorization = 'Bearer ' + service2.getAccessToken();
        continue;
      }
      throw ctError_('reauth', 'Spotify session expired. Please re-authorize.');
    }

    if (code === 429 && attempts <= 2) {
      var retryAfter = Number(response.getHeaders()['Retry-After'] || response.getHeaders()['retry-after'] || 1);
      Utilities.sleep(Math.min(retryAfter, 5) * 1000);
      continue;
    }

    break;
  }

  var code2 = response.getResponseCode();
  if (code2 === 403) {
    var reason = null;
    var bodyMessage = null;
    try {
      var errBody = JSON.parse(response.getContentText());
      reason = errBody && errBody.error && errBody.error.reason;
      bodyMessage = errBody && errBody.error && errBody.error.message;
    } catch (e) { /* non-JSON body */ }

    if (reason === 'PREMIUM_REQUIRED') {
      throw ctError_('premium_required', 'Spotify Premium is required for playback control.');
    }
    // Spotify returns 403 for many other PlayerErrorReason values too
    // (e.g. ALREADY_PAUSED, NOT_PAUSED, restricted device) — surface the
    // real reason instead of assuming it's always a Premium issue.
    throw ctError_('error', 'Spotify playback error' + (reason ? ' (' + reason + ')' : '') + ': ' + (bodyMessage || response.getContentText()));
  }
  if (code2 === 404) {
    throw ctError_('no_device', 'No active Spotify device found.', ctGetDevices());
  }
  if (code2 >= 400) {
    throw ctError_('error', 'Spotify API error ' + code2 + ': ' + response.getContentText());
  }

  var text = response.getContentText();
  var data = text ? (function () { try { return JSON.parse(text); } catch (e) { return null; } })() : null;
  return { code: code2, data: data };
}

/**
 * Starts playback of a track at an optional position.
 * @param {string} trackId
 * @param {number} [positionMs]
 */
function ctPlayTrack(trackId, positionMs) {
  ctSpotifyFetch_('put', 'https://api.spotify.com/v1/me/player/play', {
    uris: ['spotify:track:' + trackId],
    position_ms: positionMs || 0,
  });
  return { ok: true };
}

/**
 * Seeks the active device to a position.
 * @param {number} positionMs
 */
function ctSeek(positionMs) {
  var ms = Math.max(0, Math.round(positionMs));
  ctSpotifyFetch_('put', 'https://api.spotify.com/v1/me/player/seek?position_ms=' + ms);
  return { ok: true };
}

/** Pauses playback. */
function ctPause() {
  ctSpotifyFetch_('put', 'https://api.spotify.com/v1/me/player/pause');
  return { ok: true };
}

/** Resumes playback. */
function ctResume() {
  ctSpotifyFetch_('put', 'https://api.spotify.com/v1/me/player/play');
  return { ok: true };
}

/**
 * @return {{progressMs:number,durationMs:number,isPlaying:boolean,trackId:string,deviceName:string}|null}
 */
function ctGetPlayerState() {
  var result = ctSpotifyFetch_('get', 'https://api.spotify.com/v1/me/player');
  if (result.code === 204 || !result.data) return null;
  var d = result.data;
  return {
    progressMs: d.progress_ms || 0,
    durationMs: (d.item && d.item.duration_ms) || 0,
    isPlaying: !!d.is_playing,
    trackId: d.item ? d.item.id : null,
    deviceName: d.device ? d.device.name : null,
  };
}

/**
 * @return {Array<{id:string,name:string,type:string,isActive:boolean}>}
 */
function ctGetDevices() {
  var result = ctSpotifyFetch_('get', 'https://api.spotify.com/v1/me/player/devices');
  var devices = (result.data && result.data.devices) || [];
  return devices.map(function (d) {
    return { id: d.id, name: d.name, type: d.type, isActive: !!d.is_active };
  });
}

/**
 * Transfers playback to the given device (without starting playback).
 * @param {string} deviceId
 */
function ctTransferPlayback(deviceId) {
  ctSpotifyFetch_('put', 'https://api.spotify.com/v1/me/player', {
    device_ids: [deviceId],
    play: false,
  });
  return { ok: true };
}
