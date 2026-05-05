# Suprimify Performance Lab 🏃‍♂️📊

![Suprimify Header Banner](./src/assets/hero.png) *(Preview placeholder)*

Welcome to the **Suprimify Performance Lab**, a fully-featured, production-grade Web Web Application designed to log every workout perfectly and act as your ultimate fitness dashboard. It completely reimagines what a browser-based fitness tracker can do.

---

## ✨ Key Features

### 1. **Premium & Dynamic UI/UX**
- Built entirely with **React** & **Vite**.
- **Theming Management:** Toggle between beautiful `Light` ☀️ and `Dark` 🌙 modes effortlessly. Themes are synchronized globally and saved to local storage via the `useTheme` hook.
- Beautiful custom aesthetics driven by vanilla CSS custom properties using cutting-edge glassmorphism, responsive grids, and subtle micro-animations.

### 2. **Real Web Bluetooth Integreation (IoT)** 📡
- Pair authentic **Bluetooth Low Energy (BLE)** Heart Rate Monitors directly to your web browser!
- Uses the standard `0x180D` GATT Heart Rate Service API. 
- Get real-time BPM values while exercising. 

### 3. **Specialized Modular Logging** 🏋️‍♀️
Logs adapt completely differently depending on the activity type selected. Track your details specifically:
-   **Running Track:** Pace, Distance, Calories, Duration, Live Heart Rate.
-   **Home Gym:** Sets, Reps, Exact Weight logic.
-   **Yoga & Mind:** Precise duration and Emoji mood scaling.
-   **Hydration & Sleep:** Log exact milliliter consumption and sleep hours.

### 4. **Smart Notification Reminders** 🔔
- Tell the app when you plan to work out.
- A background scheduler ensures that if you haven't logged activity by your set time, the browser dispatches a systemic OS-level Push Notification reminder.

### 5. **Goal Tracking System** 🎯
- Set weekly or monthly execution targets.
- Dynamic **Recharts** charts compare execution rates.
- Vector SVG progress rings animate as you close in on your targets.

### 6. **Account, Profile & Recovery** 👤
- "Remember email" checkbox on sign-in.
- Dedicated **Profile page** with customizable avatar color, name, and password change.
- **Secure Password Reset:** Time-limited reset recovery codes are generated and emailed to the user securely using NodeMailer. 
- **Recovery Phrase Fallback:** 4-word recovery phrases are generated at signup as an offline fallback.

### 7. **Per-Device Sync Timeline** 📡
- Every Bluetooth save (or manual import) auto-records a `sync_event`.
- Sync Timeline page groups events by device with "last synced" cards.
- Filter by success/failure, refresh, or clear history.

---

## 🛠️ Stack & Architecture

-   **Frontend:** React `19.x`, Vite, React Router, Recharts (for Data visualization)
-   **Backend:** Node.js, Express
-   **Database:** `better-sqlite3` embedded localized storage
-   **Security:** `bcryptjs` for encryption and JSON Web Tokens (`jsonwebtoken`) over Auth HTTP headers. 

---

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed along with `npm`.

### 1. Install dependencies (first time only)

```powershell
cd fitness-tracker
npm install
```

### 2. Start the Backend API
The database (`fitness.db`) is created automatically on first run with all tables and migrations applied.

```powershell
# Inside fitness-tracker/
npm run server
```
The server listens on `http://localhost:4100`. You can verify it by visiting that URL — it should respond with "Suprimify Fitness API is running."

### 3. Start the Frontend Application
In a **second** terminal:

```powershell
cd fitness-tracker
npm run dev
```
The UI binds to `http://localhost:5100`. Open it in Chrome or Edge for full Web Bluetooth support.

### 4. Try it end-to-end
1. Register an account — the toast shows your 4-word recovery phrase. Save it!
2. Pair a Bluetooth heart rate monitor → click "Start session" → "Stop & save".
3. Visit **Sync Timeline** to see the device card and event log.
4. Visit **Profile** to change your avatar color or password.
5. Sign out and try **Forgot password** — trigger an email or use the recovery phrase to set a new password.

### 5. Email Verification & Password Recovery Setup
- **Testing environment (Current):** The application currently uses \`Ethereal\`, a fake SMTP testing service. When a user requests a password reset, the backend terminal will log a **Preview URL** (e.g., \`Password reset preview URL: https://ethereal.email/...\`). You must click this link in the terminal to view the test email and retrieve the reset code.
- **Production environment:** For a real-world deployment, you MUST change the Nodemailer configuration in \`server/index.js\` to point to a production-ready SMTP provider (e.g., SendGrid, AWS SES, or Gmail SMTP). Remove the \`nodemailer.createTestAccount()\` logic and pass your provider's SMTP host, port, username, and password credentials.

---

## 🗂️ Project Structure Overivew

```
fitness-tracker/
├── presentation/          # Interactive Reveal.js presentation deck
├── server/
│   ├── db.js              # SQLite core configuration & auto-migrations
│   └── index.js           # REST API providing endpoints for auth, logs, goals
├── src/
│   ├── components/        # Isolated modular UI structure
│   ├── hooks/             # Custom useBluetooth, useStreak, useTheme, etc...
│   ├── App.jsx            # The root logical router & protection shell wrapper
│   └── index.css          # The master CSS token list orchestrating Theme Management
└── README.md
```

---

## 🎨 Setting & Theme Usage
By default, the Dashboard and UI responds to your OS `prefers-color-scheme`. You can swap it using the Sun/Moon toggle situated at the top right header space inside the Navigation Bar. The theme config gets saved automatically within LocalStorage under the element `theme` mapping to `light` or `dark`.

---

## 🤝 Contributing
Want to add cycling specific logs, add power meter API reads or push notifications via ServiceWorkers? Feel free to open a fork. Pull requests are welcomed.
