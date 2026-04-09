function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Name That Tune')
    .addItem('Fetch Spotify IDs', 'fetchSpotifyIds')
    .addSeparator()
    .addItem('Set Spotify Credentials', 'promptSpotifyCredentials')
    .build();
}
