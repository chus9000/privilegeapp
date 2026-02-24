# Today's Privilege Spectrum

A full-featured web application for conducting privilege spectrum exercises with real-time results, user authentication, and event management.

## 🚀 Quick Start

Get deployed in 15 minutes! See [Quick Start Guide](docs/QUICK_START.md)

```bash
# 1. Setup Firebase
./setup-firebase.sh

# 2. Update firebase-config.js with your Firebase credentials

# 3. Test locally
open index.html

# 4. Deploy to GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main

# 5. Enable GitHub Pages in repo Settings > Pages
```

## 📚 Documentation

- **[Quick Start Guide](docs/QUICK_START.md)** - Get up and running fast
- **[Full Deployment Guide](docs/DEPLOYMENT_GUIDE.md)** - Comprehensive setup instructions
- **[Deployment Checklist](DEPLOYMENT_CHECKLIST.md)** - Track your progress
- **[Firebase Setup Guide](docs/FIREBASE_SETUP_GUIDE.md)** - Detailed Firebase configuration
- **[Security Rules Documentation](docs/FIREBASE_SECURITY_RULES_DOCUMENTATION.md)** - Understanding security

## ✨ Features

### Core Functionality
- Create events with unique 6-digit PINs
- Real-time participant tracking and results
- Question management (enable/disable questions)
- Persistent participant sessions
- Mobile-responsive design

### Authentication & User Management
- Email/password authentication via Firebase
- User dashboard with event management
- Secure event ownership and access control

### Analytics & Insights
- Real-time results visualization
- Spectrum positioning of participants
- Score distribution and percentiles
- Ally tips based on responses

### Technical Features
- Firebase Realtime Database integration
- Offline-first architecture with sync
- Comprehensive test suite (unit + property-based tests)
- GitHub Actions CI/CD pipeline

## 🏗️ Architecture

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Firebase Realtime Database
- **Authentication**: Firebase Authentication
- **Hosting**: GitHub Pages
- **CI/CD**: GitHub Actions
- **Testing**: Vitest + fast-check (property-based testing)

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui
```

Test coverage includes:
- Unit tests for all core modules
- Property-based tests for data integrity
- Integration tests for Firebase operations
- Security rules validation

## 📦 Project Structure

```
privilege-spectrum-app/
├── app/                    # Application pages
│   ├── create.html        # Event creation
│   ├── dashboard.js       # User dashboard
│   ├── event.html         # Event management
│   ├── questions.html     # Participant quiz
│   └── results.html       # Results and spectrum visualization
├── test/                  # Test suite
├── docs/                  # Documentation
├── firebase-config.js     # Firebase configuration
├── firebase-security-rules.json  # Database security rules
├── auth-manager.js        # Authentication logic
├── data-manager.js        # Data persistence
└── .github/workflows/     # CI/CD pipelines
```

## 🔒 Security

- Firebase Authentication for user management
- Realtime Database security rules enforce access control
- Event creators have exclusive write access to their events
- Participants can only write their own responses
- All data validated server-side via security rules

See [Security Documentation](docs/FIREBASE_SECURITY_RULES_DOCUMENTATION.md) for details.

## 🌐 Deployment

### GitHub Pages (Automatic)

Every push to `main` triggers automatic deployment via GitHub Actions.

Your app will be available at:
```
https://YOUR_USERNAME.github.io/YOUR_REPO/
```

### Custom Domain

1. Add `CNAME` file with your domain
2. Configure DNS:
   ```
   A     185.199.108.153
   A     185.199.109.153
   A     185.199.110.153
   A     185.199.111.153
   ```
3. Enable HTTPS in GitHub Pages settings

## 🛠️ Development

### Local Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Serve locally (requires http-server or similar)
npx serve .
```

### Firebase Emulator (Optional)

```bash
# Start Firebase emulators
firebase emulators:start

# App will connect to local emulator automatically
```

## 📊 Usage

### For Event Creators

1. **Sign up/Login** at the homepage
2. **Create Event** from dashboard
3. **Share** the questions URL and PIN with participants
4. **Monitor** results in real-time
5. **View Results** to see participant positioning and spectrum

### For Participants

1. **Visit** the questions URL
2. **Enter PIN** provided by event creator
3. **Answer** questions honestly
4. **View** your position on the spectrum

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.

## 🆘 Support

- Check [Troubleshooting Guide](docs/DEPLOYMENT_GUIDE.md#troubleshooting)
- Review [Firebase Documentation](https://firebase.google.com/docs)
- Open an issue on GitHub

## 🎯 Roadmap

- [ ] Multi-language support
- [ ] Export results to CSV/PDF
- [ ] Custom question sets
- [ ] Team/organization management
- [ ] Advanced analytics dashboard

---

Built with ❤️ for facilitating meaningful conversations about privilege and equity.