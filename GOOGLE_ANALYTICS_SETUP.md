# Google Analytics Setup Guide

## Setup Complete ✅

Google Analytics has been integrated into your Privilege Spectrum app. Here's what was done:

### Files Modified
- ✅ Created `google-analytics.js` - Main GA configuration file
- ✅ Updated `index.html` - Landing page
- ✅ Updated `app/index.html` - Dashboard
- ✅ Updated `app/create.html` - Event creation
- ✅ Updated `app/questions.html` - Event participation
- ✅ Updated `app/results.html` - Results/spectrum view
- ✅ Updated `app/score.html` - Personal results
- ✅ Updated `app/detailed-results.html` - Detailed results table

## Next Steps

### 1. Get Your Google Analytics Measurement ID

1. Go to [Google Analytics](https://analytics.google.com/)
2. Sign in with your Google account
3. Create a new property (or use an existing one):
   - Click "Admin" (gear icon in bottom left)
   - Under "Property" column, click "Create Property"
   - Fill in your website details
   - Choose "Web" as the platform
4. Copy your Measurement ID (format: `G-XXXXXXXXXX`)

### 2. Update the Configuration

Open `google-analytics.js` and replace the placeholder:

```javascript
const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX'; // Replace with your actual ID
```

With your actual Measurement ID:

```javascript
const GA_MEASUREMENT_ID = 'G-ABC123DEF4'; // Your real ID
```

### 3. Deploy and Test

1. Deploy your updated code to production
2. Visit your site in a browser
3. Open browser DevTools Console (F12)
4. Look for: `📊 Google Analytics initialized`
5. Check Google Analytics dashboard (data appears within 24-48 hours)

## Features Included

### Privacy-Focused Configuration
- ✅ IP anonymization enabled
- ✅ Respects "Do Not Track" browser setting
- ✅ Disabled on localhost (won't track during development)

### Automatic Tracking
- Page views on all pages
- User navigation between pages

### Custom Event Tracking (Optional)

You can track custom events using the helper functions:

```javascript
// Track a custom event
trackEvent('event_created', {
  event_category: 'engagement',
  event_label: 'new_event'
});

// Track a page view (useful for SPAs)
trackPageView('/app/custom-page', 'Custom Page Title');
```

### Example Custom Events to Add

You might want to track these events in your app:

```javascript
// When user starts free play
trackEvent('free_play_started');

// When user creates an event
trackEvent('event_created', {
  question_count: 10
});

// When user completes quiz
trackEvent('quiz_completed', {
  score: 15,
  mode: 'event' // or 'free_play'
});

// When user views results
trackEvent('results_viewed', {
  participant_count: 25
});
```

## Verification

### In Browser Console
Look for these messages:
- Development: `📊 Google Analytics disabled on localhost`
- Production: `📊 Google Analytics initialized`

### In Google Analytics Dashboard
1. Go to Reports → Realtime
2. Visit your site in another tab
3. You should see active users appear within seconds

### Using Google Tag Assistant
1. Install [Google Tag Assistant Chrome Extension](https://chrome.google.com/webstore/detail/tag-assistant-legacy-by-g/kejbdjndbnbjgmefkgdddjlbokphdefk)
2. Visit your site
3. Click the extension icon
4. Verify GA tag is firing correctly

## Privacy Compliance

The implementation includes:
- IP anonymization
- Do Not Track respect
- No tracking on localhost

For GDPR/CCPA compliance, you may want to add:
- Cookie consent banner
- Privacy policy update mentioning Google Analytics
- Option for users to opt-out

## Troubleshooting

### Not seeing data?
- Wait 24-48 hours for initial data
- Check Realtime reports for immediate feedback
- Verify Measurement ID is correct
- Check browser console for errors
- Ensure you're testing on production (not localhost)

### Console shows "gtag is not defined"?
- Check that `google-analytics.js` is loading before other scripts
- Verify the script path is correct relative to the HTML file

## Support

For issues or questions:
- Email: hi@jesusmartin.eu
- [Google Analytics Help Center](https://support.google.com/analytics)
