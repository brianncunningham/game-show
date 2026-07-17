function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Name That Tune')
    .addItem('Fetch Spotify IDs', 'fetchSpotifyIds')
    .addItem('Refresh Verify (rows missing it)', 'fetchMissingVerify')
    .addSeparator()
    .addItem('Set Spotify Credentials', 'promptSpotifyCredentials')
    .addSeparator()
    .addItem('Chorus Tagger', 'ctOpenSidebar')
    .addItem('Authorize Spotify (Chorus Tagger)', 'ctShowAuthorizationDialog')
    .addToUi();
}
