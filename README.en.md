# Zappy Bitty

[日本語](README.md) | **English**

A one-tap game where bitty flaps through candlestick charts. Open source (MIT) and runs entirely on your phone.

- No account, no server, no ads, no data sent anywhere
- Plays offline
- Records, bitty and items are stored on the device only (the WebView's localStorage)
- Japanese / English

<p>
  <img src="docs/screenshots/1-start.png" width="200" alt="Start screen">
  <img src="docs/screenshots/2-play.png" width="200" alt="Playing">
  <img src="docs/screenshots/3-shop.png" width="200" alt="Shop">
  <img src="docs/screenshots/4-gameover.png" width="200" alt="Game over">
</p>

## How to play

- Tap to flap; each gap you pass is a point. Hit anything and the run is over
- 14 zones from Shibuya to the edge of the galaxy, each with its own scenery, music and obstacles
- Coins give you **bitty**, the in-game points. Spend them in the shop (colours, hats, faces, neckwear, trails) or on one continue per run (21 bitty)
- Missions reward more bitty

bitty are in-game points, not real bitcoin.

## Development

Requires Node.js 22 or newer.

```bash
npm install
npm run dev        # play in the browser at http://localhost:5173
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm test           # Vitest (difficulty, economy, missions, translations...)
npm run build      # static files in dist/
```

| Purpose | Choice |
| --- | --- |
| Rendering | [Phaser 3](https://phaser.io/) (Arcade Physics) |
| UI | React 19 + zustand |
| Build | Vite |
| Android app | [Capacitor](https://capacitorjs.com/) (ships `dist/` inside the APK) |
| Sound and music | Synthesised at runtime with the Web Audio API (no audio files) |
| Backgrounds, obstacles | Drawn with Phaser Graphics at start-up (no image files) |

Where things are:

- `src/game/` the game itself (scenes, obstacles, zones, difficulty, music and sound)
- `src/components/` React screens (start, game over, shop, settings...)
- `src/config/` tuning (`game.ts` name and links, `economy.ts` items and prices, `achievements.ts` missions)
- `src/i18n/translations.ts` Japanese and English text
- `android/` the Capacitor Android project
- `art/bitty.png` the original bitty artwork. `npm run assets:sprite` rebuilds the game sprites, `npm run assets:icons` the app icons and splash screens

### Support button

Put a Lightning Address in `lightningAddress` in `src/config/game.ts` and Settings shows "♥ Support". It only opens the player's wallet app with a `lightning:` link; the game itself never handles a payment. Left empty, the button is hidden.

## Building the Android app

Requires Android Studio (or the Android SDK) and JDK 21.

```bash
npm run android:sync          # build the web game and copy it into android/
cd android && ./gradlew assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk
```

`npx cap open android` opens the project in Android Studio to run it on a device or emulator.

The version comes from `version` in `package.json` (`1.2.3` → versionName `1.2.3`, versionCode `10203`).

## Releasing and publishing on Zapstore

### Once

1. **Create the signing keystore.** Back it up: without it you can never update the app. Never commit it.

   ```bash
   keytool -genkeypair -v -keystore zappybitty-release.jks -alias zappybitty \
     -keyalg RSA -keysize 4096 -validity 10000
   ```

2. **Add the GitHub secrets** (Settings → Secrets and variables → Actions).

   | Name | Value |
   | --- | --- |
   | `ANDROID_KEYSTORE_BASE64` | output of `base64 -w0 zappybitty-release.jks` |
   | `ANDROID_KEYSTORE_PASSWORD` | the keystore password |
   | `ANDROID_KEY_ALIAS` | `zappybitty` |
   | `ANDROID_KEY_PASSWORD` | the key password (same as the keystore's if you kept them equal) |

3. **Install zsp**, Zapstore's publishing tool.

   ```bash
   go install github.com/zapstore/zsp/cmd/zsp@latest
   ```

### Every release

1. Bump `version` in `package.json`, add a section for it to `CHANGELOG.md` (`## [1.0.1]`), and commit
2. Push a tag: `git tag v1.0.1 && git push origin v1.0.1`
3. GitHub Actions (`.github/workflows/release.yml`) builds the signed `zappybitty-1.0.1.apk` and attaches it to a GitHub Release
4. Publish to Zapstore from the repository folder
   - **First time:** run `zsp` with no arguments (the wizard). It proves that your keystore signed the APK and that you hold your Nostr key, then publishes that proof with the first release. Enter the keystore password and nsec only in the wizard; never hand them to anyone, AI agents included
   - **After that:** `SIGN_WITH=<nsec1… or bunker://…> zsp publish`

`zapstore.yaml` holds the store listing (name, description, icon, screenshots). zsp takes the latest APK from the GitHub Releases.

## License

The code, the bitty artwork and every other asset are under the [MIT License](LICENSE).

Third-party:

| Name | License |
| --- | --- |
| [DotGothic16](https://github.com/fontworks-fonts/DotGothic16) (Fontworks / The DotGothic16 Project Authors) | SIL Open Font License 1.1 ([`src/assets/fonts/DotGothic16-OFL.txt`](src/assets/fonts/DotGothic16-OFL.txt)) |
| [Phaser](https://github.com/phaserjs/phaser) | MIT |
| [React](https://github.com/facebook/react) | MIT |
| [zustand](https://github.com/pmndrs/zustand) | MIT |
| [Capacitor](https://github.com/ionic-team/capacitor) | MIT |
