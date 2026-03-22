# ChapterCheck — App Store Submission Guide

Everything needed to submit ChapterCheck to the Apple App Store.

---

## 1. App Store Connect Metadata

### App Name

```
ChapterCheck
```

(12 characters — within 30-character limit)

### Subtitle

```
Your Audiobook Library
```

(22 characters — within 30-character limit)

### Promotional Text

_(Can be updated anytime without a new build — use for seasonal/timely messaging)_

```
Organize your DRM-free audiobooks, take timestamped notes, and listen anywhere — even offline and in CarPlay.
```

(110 characters — within 170-character limit)

### Description

```
ChapterCheck is a personal audiobook library for listeners who own DRM-free audio files. Add your books, organize them into shelves, and enjoy a premium listening experience across iPhone, iPad, and CarPlay.

LISTEN YOUR WAY
• Stream or download for offline playback
• Adjustable speed from 0.5× to 3.0×
• Voice Boost for crystal-clear narration
• Sleep timer with flexible presets
• Smart rewind that backs up a few seconds when you resume
• Momentum skipping — rapid taps increase skip distance
• Multi-part book support with automatic part advancement
• Lock screen and Control Center integration

ORGANIZE YOUR LIBRARY
• Browse by title, author, series, or genre
• Create custom shelves (public or private)
• Full-text search across your entire collection
• Series ordering with support for novellas and side stories
• Track your reading status and history

TAKE NOTES WHILE YOU LISTEN
• Tap to create a note anchored to the current timestamp
• Replay the exact moment from any note
• Tag, search, and filter notes across all your books
• Keep notes private or share them with the community

CONNECT WITH LISTENERS
• Follow friends and see what they're listening to
• Discover activity from the community
• Read and write reviews with star ratings
• Share shelves and notes publicly

DRIVE WITH CARPLAY
• Continue Listening, Library, and Downloads tabs
• Full playback controls on your car's display
• Browse and pick a new book without touching your phone

SYNC EVERYWHERE
• Real-time sync across all your devices
• Listening progress saved automatically
• Pick up exactly where you left off

MAKE IT YOURS
• Choose from 12 accent colors
• Light, Dark, or System theme
• Customize skip intervals and playback defaults

ChapterCheck is built for audiobook lovers who want full control of their library — no subscriptions, no DRM, just your books.
```

(1,518 characters — within 4,000-character limit)

### Keywords

```
audiobook,library,player,offline,bookshelf,listening,notes,series,author,drm-free
```

(82 characters — within 100-character limit. Comma-separated, no spaces.)

### Copyright

```
2026 ChapterCheck
```

### Primary Category

```
Books
```

### Secondary Category

```
Entertainment
```

### Support URL

**⚠️ ACTION REQUIRED** — You need a publicly accessible support page. Options:

- Create a simple page at `chaptercheck.app/support`
- Use a GitHub Discussions or Issues page
- Set up an email-based support page

### Marketing URL (Optional)

```
https://chaptercheck.app
```

_(Create if you want a landing page — not required)_

### Privacy Policy URL

**⚠️ ACTION REQUIRED** — Must be a public URL. See Section 7 below for content.

### Version

```
1.0.0
```

---

## 2. Age Rating Questionnaire Answers

| Content Descriptor                               | Answer |
| ------------------------------------------------ | ------ |
| Cartoon or Fantasy Violence                      | None   |
| Realistic Violence                               | None   |
| Prolonged Graphic or Sadistic Realistic Violence | None   |
| Profanity or Crude Humor                         | None   |
| Mature or Suggestive Themes                      | None   |
| Horror or Fear Themes                            | None   |
| Medical or Treatment Information                 | None   |
| Sexual Content or Nudity                         | None   |
| Graphic Sexual Content and Nudity                | None   |
| Alcohol, Tobacco, or Drug Use or References      | None   |
| Simulated Gambling                               | None   |
| Contests                                         | None   |

**Additional questions:**

- Unrestricted web access: **No**
- User-generated content (reviews, notes, social): **Yes** — you have reporting/blocking mechanisms
- AI/chatbot features: **No**

**Expected rating: 4+**

---

## 3. App Review Notes

Provide these to the App Review team:

```
ChapterCheck is a personal audiobook library app. Users upload their own DRM-free audio files via a companion web app and listen on iOS.

DEMO ACCOUNT:
Email: [CREATE A TEST ACCOUNT]
OTP Code: [Clerk test mode — provide instructions or a static test code]

IMPORTANT NOTES FOR REVIEW:
- The app requires a Clerk email OTP login. A demo account is provided above.
- Books and audio files are uploaded via the web app (chaptercheck.app). The iOS app is for browsing and listening.
- The demo account has been pre-populated with sample books for testing.
- CarPlay can be tested in the Xcode Simulator via I/O > External Displays > CarPlay.
- The app uses background audio mode for continuous playback.

To test core features:
1. Sign in with the demo account
2. Browse books in the Library tab
3. Tap a book → tap Play to start the audio player
4. Try the mini player and full-screen Now Playing view
5. Create a note while listening (Notes tab)
6. Browse the Social tab to see community activity
7. Download a book for offline playback (book detail → download button)
```

**⚠️ ACTION REQUIRED:**

- Create a dedicated test account in Clerk with pre-populated books
- Ensure the test account has `editor` role for full functionality
- Verify the account works before submission

---

## 4. Screenshots

### Required Device Sets

**6.9" iPhone (iPhone 15/16 Pro Max)** — 1320 × 2868 px (portrait)
**13" iPad (if supporting iPad)** — 2064 × 2752 px (portrait)

### Recommended Screenshots (in order)

| #   | Screen                                   | Caption                                       | Why                                           |
| --- | ---------------------------------------- | --------------------------------------------- | --------------------------------------------- |
| 1   | **Home screen** with hero listening card | Your audiobook library, beautifully organized | First impression — shows the core experience  |
| 2   | **Now Playing** (full-screen player)     | A premium listening experience                | Showcases the audio player — the core feature |
| 3   | **Library** grid with genre filter       | Browse, search, and filter your collection    | Shows the catalog browsing experience         |
| 4   | **Book Detail** page                     | Everything about your book in one place       | Shows metadata, reviews, audio files          |
| 5   | **Notes** tab with timestamped notes     | Take notes anchored to the moment             | Differentiating feature                       |
| 6   | **Social** activity feed                 | See what your friends are listening to        | Social features                               |
| 7   | **Offline/Downloads** view               | Download and listen anywhere                  | Offline capability                            |
| 8   | **CarPlay** interface                    | Listen on the road with CarPlay               | Strong differentiator                         |
| 9   | **Shelves** with custom collections      | Organize with custom shelves                  | Organization feature                          |
| 10  | **Settings** with accent color picker    | Make it yours with 12 accent colors           | Customization/personality                     |

### How to Capture Screenshots

**Option A: Xcode Simulator (fastest)**

```bash
# Run on iPhone 16 Pro Max simulator
xcrun simctl io booted screenshot ~/Desktop/screenshot1.png
```

**Option B: Physical device**

- Press Side Button + Volume Up simultaneously
- Screenshots save to Photos app
- Transfer via AirDrop or Files

**Option C: Fastlane Snapshot (automated)**

```bash
# If you set up fastlane later
fastlane snapshot
```

### Screenshot Design Tips

- Use a clean, populated state (not empty screens)
- Pre-populate with recognizable audiobook titles/covers
- Show the app in Dark mode for at least 2-3 screenshots (variety)
- Add brief captions above/below the device frame (optional but professional)
- Tools like **Previewed.app**, **AppMockUp**, or **Figma** can add device frames and text overlays

---

## 5. App Icon

**Current icon:** `apps/ios/ChapterCheck/Assets.xcassets/AppIcon.appiconset/AppIcon.png`

Requirements:

- ✅ 1024 × 1024 px
- ✅ PNG format
- ✅ No transparency
- ✅ Square (system applies rounded corners)

**iOS 26 note:** Apple applies a "Liquid Glass" effect automatically. Your current design (dark navy with overlapping pages + checkmark) should work well with this — the bold, simple shapes are ideal.

**⚠️ Verify:** Open the icon and confirm it looks good with rounded corners applied. No important elements should be clipped at the edges.

---

## 6. Privacy Labels (App Privacy "Nutrition Labels")

You must declare these in App Store Connect:

### Data Collected

| Data Type               | Category       | Linked to Identity | Used for Tracking | Purpose                        |
| ----------------------- | -------------- | ------------------ | ----------------- | ------------------------------ |
| Email Address           | Contact Info   | Yes                | No                | App Functionality (Clerk auth) |
| User ID                 | Identifiers    | Yes                | No                | App Functionality              |
| Name / Display Name     | Contact Info   | Yes                | No                | App Functionality (profile)    |
| Photos (profile avatar) | User Content   | Yes                | No                | App Functionality              |
| Audio Files             | User Content   | Yes                | No                | App Functionality              |
| Reviews & Notes         | User Content   | Yes                | No                | App Functionality              |
| Listening Progress      | Usage Data     | Yes                | No                | App Functionality              |
| Search History          | Search History | Yes                | No                | App Functionality              |
| Crash Data              | Diagnostics    | No                 | No                | Analytics (Sentry)             |
| Performance Data        | Diagnostics    | No                 | No                | Analytics (Sentry)             |

### Data NOT Collected

- Financial Info
- Health & Fitness
- Location
- Contacts
- Browsing History
- Purchase History
- Advertising Data

---

## 7. Privacy Policy

**⚠️ ACTION REQUIRED** — Host this at a public URL (e.g., `chaptercheck.app/privacy`).

### Draft Privacy Policy

```
CHAPTERCHECK PRIVACY POLICY
Last updated: [DATE]

ChapterCheck ("we", "our", "us") operates the ChapterCheck mobile application.
This policy describes how we collect, use, and protect your information.

INFORMATION WE COLLECT

Account Information
- Email address (for authentication via Clerk)
- Display name and profile photo (optional, user-provided)

Content You Create
- Audiobook files you upload
- Reviews, notes, and shelf collections
- Reading status and listening progress

Automatically Collected
- Crash reports and performance diagnostics (via Sentry)
- Device type and operating system version

HOW WE USE YOUR INFORMATION

- To provide and maintain the ChapterCheck service
- To sync your library, progress, and preferences across devices
- To enable social features (activity feeds, follows, public notes)
- To diagnose and fix crashes and performance issues

DATA STORAGE AND SECURITY

- Account data is stored securely via Convex (backend database)
- Audio files are stored in Cloudflare R2 cloud storage
- Authentication is handled by Clerk with encrypted tokens
- All data is transmitted over HTTPS/TLS

THIRD-PARTY SERVICES

- Clerk (clerk.com) — Authentication
- Convex (convex.dev) — Backend database and real-time sync
- Cloudflare R2 (cloudflare.com) — File storage
- Sentry (sentry.io) — Crash reporting and diagnostics

We do not sell your data to third parties.
We do not use your data for advertising.
We do not share your data with advertisers.

YOUR RIGHTS

- You can delete your account and all associated data from the app's Settings screen
- You can set your profile, notes, and shelves to private at any time
- You can request a copy of your data by contacting us

DATA RETENTION

We retain your data for as long as your account is active. When you delete your
account, all associated data (profile, books, notes, reviews, progress) is
permanently removed.

CHILDREN'S PRIVACY

ChapterCheck is not directed at children under 13. We do not knowingly collect
personal information from children under 13.

CHANGES TO THIS POLICY

We may update this policy from time to time. We will notify users of material
changes through the app.

CONTACT US

For privacy questions or data requests, contact:
[YOUR EMAIL ADDRESS]
```

---

## 8. Export Compliance

Already handled:

- ✅ `ITSAppUsesNonExemptEncryption = false` is set in `project.yml`
- The app only uses standard HTTPS/TLS — exempt from export compliance documentation

---

## 9. Privacy Manifest (PrivacyInfo.xcprivacy)

✅ **DONE** — `apps/ios/ChapterCheck/PrivacyInfo.xcprivacy` created.

Declares:

- No tracking
- Collected data: email, user ID, name, photos, audio, user content, search history, usage data, crash data, performance data
- Accessed APIs: UserDefaults (CA92.1), File Timestamps (C617.1)

---

## 10. Missing Items to Fix Before Submission

### Critical (Will Cause Rejection)

| #   | Issue                                 | Action                                                                                                                                          | Status  |
| --- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 1   | **Privacy Policy URL**                | Point to your existing `/privacy` route on the web app                                                                                          | ⬜ TODO |
| 2   | **Support URL**                       | Point to a `/support` or `/contact` route, or use an email link page                                                                            | ⬜ TODO |
| 3   | **Demo Account**                      | Create a Clerk test account with pre-populated books                                                                                            | ⬜ TODO |
| 4   | **NSPhotoLibraryUsageDescription**    | Added to Info.plist                                                                                                                             | ✅ DONE |
| 5   | **PrivacyInfo.xcprivacy**             | Created privacy manifest file                                                                                                                   | ✅ DONE |
| 6   | **User-generated content moderation** | Reviews, public notes, and social features need report & block mechanisms (Guideline 1.2). **Currently missing from both backend and iOS app.** | ⬜ TODO |
| 7   | **Screenshots**                       | Capture 10 screenshots on iPhone 16 Pro Max simulator + iPad if supporting iPad                                                                 | ⬜ TODO |

### Recommended (Won't Block Submission)

| #   | Issue                        | Action                                                   | Status  |
| --- | ---------------------------- | -------------------------------------------------------- | ------- |
| 9   | Privacy policy screen in-app | Add a link in Settings that opens the privacy policy URL | ⬜ TODO |
| 10  | Terms of Service             | Create and host ToS (recommended, not strictly required) | ⬜ TODO |
| 11  | TestFlight beta test         | Run a TestFlight beta before submitting for review       | ⬜ TODO |
| 12  | App preview video            | 15-30s screen recording showcasing the player + library  | ⬜ TODO |

---

## 11. Submission Checklist

### Before You Submit

- [ ] Apple Developer Program membership is active ($99/year)
- [ ] App Store Connect account is set up
- [ ] Tax and banking information configured (if planning paid features later)
- [ ] Privacy policy URL points to your `/privacy` web route
- [ ] Support URL points to a support/contact page
- [x] `PrivacyInfo.xcprivacy` added to the app bundle
- [x] `NSPhotoLibraryUsageDescription` added to Info.plist
- [x] Sign in with Apple — NOT required (email-only auth, no third-party social logins)
- [ ] Report/block mechanism for user-generated content (Guideline 1.2)
- [ ] Demo account created and functional
- [ ] App tested on physical device (not just simulator)
- [ ] No crashes, placeholder content, or broken features
- [ ] CarPlay tested in simulator

### In App Store Connect

- [ ] App name: `ChapterCheck`
- [ ] Subtitle: `Your Audiobook Library`
- [ ] Description pasted
- [ ] Promotional text pasted
- [ ] Keywords pasted
- [ ] Primary category: Books
- [ ] Secondary category: Entertainment
- [ ] Age rating questionnaire completed
- [ ] Privacy labels configured
- [ ] Privacy policy URL set
- [ ] Support URL set
- [ ] Copyright set
- [ ] Screenshots uploaded (6.9" iPhone mandatory, 13" iPad if universal)
- [ ] App icon verified (uploaded with build)
- [ ] Review notes with demo account details
- [ ] Contact information for App Review team
- [ ] Build uploaded via Xcode (Product → Archive → Distribute)

### After Submission

- [ ] Monitor App Store Connect for review status
- [ ] Respond promptly to any reviewer questions
- [ ] Typical review time: 24-48 hours (can be up to 7 days)

---

## 12. Files to Create/Modify

### Add to `apps/ios/project.yml` — Info.plist entry

```yaml
NSPhotoLibraryUsageDescription: "ChapterCheck uses your photo library to set a profile photo."
```

### Create `apps/ios/ChapterCheck/PrivacyInfo.xcprivacy`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>NSPrivacyTracking</key>
    <false/>
    <key>NSPrivacyTrackingDomains</key>
    <array/>
    <key>NSPrivacyCollectedDataTypes</key>
    <array>
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypeEmailAddress</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <true/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <false/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
            </array>
        </dict>
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypeUserID</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <true/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <false/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
            </array>
        </dict>
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypeCrashData</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <false/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <false/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAnalytics</string>
            </array>
        </dict>
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypePerformanceData</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <false/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <false/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAnalytics</string>
            </array>
        </dict>
    </array>
    <key>NSPrivacyAccessedAPITypes</key>
    <array>
        <dict>
            <key>NSPrivacyAccessedAPIType</key>
            <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
            <key>NSPrivacyAccessedAPITypeReasons</key>
            <array>
                <string>CA92.1</string>
            </array>
        </dict>
        <dict>
            <key>NSPrivacyAccessedAPIType</key>
            <string>NSPrivacyAccessedAPICategoryFileTimestamp</string>
            <key>NSPrivacyAccessedAPITypeReasons</key>
            <array>
                <string>C617.1</string>
            </array>
        </dict>
    </array>
</dict>
</plist>
```

---

## 13. Quick Reference — Character Limits

| Field            | Limit | Your Count          |
| ---------------- | ----- | ------------------- |
| App Name         | 30    | 12                  |
| Subtitle         | 30    | 22                  |
| Promotional Text | 170   | 110                 |
| Description      | 4,000 | 1,518               |
| Keywords         | 100   | 82                  |
| Review Notes     | 4,000 | ~600                |
| What's New       | 4,000 | N/A (first version) |
