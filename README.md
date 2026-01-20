# NightSafe / NightGuard

A comprehensive safety companion web application with real-time emergency alerts, virtual escort navigation, IoT sensor integration, and community safety features.

---

## 📋 Table of Contents
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Database Setup](#database-setup)
- [Environment Configuration](#environment-configuration)
- [How to Run](#how-to-run)
- [File Structure & Summaries](#file-structure--summaries)

---

## 🔧 Prerequisites

Before installing, ensure you have the following installed on your system:

- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **PostgreSQL** (v12 or higher) - [Download](https://www.postgresql.org/download/)
- **Git** - [Download](https://git-scm.com/)
- A modern web browser (Chrome, Firefox, Safari, Edge)

---

## 📦 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/emiliaaa25/NightGuard.git
cd NightSafe
```

### 2. Install Dependencies
```bash
npm install
```

This will install all required packages:
- `express` - Web server framework
- `pg` - PostgreSQL database client
- `bcrypt` / `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT authentication
- `socket.io` - Real-time WebSocket communication
- `cors` - Cross-origin resource sharing
- `dotenv` - Environment variable management
- `multer` - File upload handling
- `nodemon` - Development auto-reload (dev dependency)

---

## 🗄️ Database Setup

### 1. Create PostgreSQL Database
```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE nightsafe;

# Exit psql
\q
```

### 2. Initialize Database Schema
```bash
# Run the initialization script
psql -U postgres -d nightsafe -f database/init.sql
```

Or manually connect and run:
```bash
psql -U postgres -d nightsafe
\i database/init.sql
```

---

## ⚙️ Environment Configuration

### 1. Create .env File
Create a `.env` file in the root directory:

```bash
# .env
PORT=3000
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/nightsafe
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d
```

**Important:** Replace `your_password` with your PostgreSQL password and change `JWT_SECRET` to a secure random string.

### 2. Verify Database Connection
The app will automatically connect to PostgreSQL using the `DATABASE_URL` in your `.env` file.

---

## 🚀 How to Run

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3000` (or the PORT specified in your `.env` file).

### Access the Application
1. Open your browser and navigate to: `http://localhost:3000`
2. You'll see the landing page with login/register options
3. Create an account to start using the application

---

## 📁 File Structure & Summaries

### Root Files

#### `package.json`
- **Purpose:** NPM package configuration file
- **Contains:** Project metadata, dependencies, scripts, and repository information
- **Key Scripts:**
  - `npm start` - Runs the server in production mode
  - `npm run dev` - Runs the server with nodemon for development

---

### Database (`database/`)

#### `database/init.sql`
- **Purpose:** Database initialization and schema creation
- **What it does:**
  - **Users Table:** Authentication fields plus guardian-specific columns:
    - Basic: username, email, password, full_name, bio, avatar_url, phone
    - Guardian System: is_guardian (boolean), role (USER/SECURITY/POLICE/ADMIN/PENDING)
    - Location Tracking: last_latitude, last_longitude, last_seen timestamp
    - Applications: application_reason, experience (for guardian applications)
  - **Emergency Contacts Table:** User's emergency contacts with name, phone, relation
  - **Alerts Table:** SOS/PANIC emergency alerts with GPS coordinates and audio_url for evidence recordings
  - **Safety Reports Table:** Community hazard reporting (DARK, ACCIDENT, BROKEN_LIGHT, DANGEROUS_CROWD, SUSPICIOUS)
  - Sets up indexes on email and username for performance
  - Creates triggers for automatic `updated_at` timestamp updates
  - Establishes foreign key relationships between tables with CASCADE delete

---

### Server (`server/`)

#### `server/server.js` (Main Entry Point)
- **Purpose:** Main Express server and Socket.IO configuration
- **What it does:**
  - Creates Express HTTP server with Socket.IO for real-time communication
  - Configures CORS, JSON parsing, and static file serving
  - **WebSocket Events:**
    - `join_user_room` - User joins personal notification room on login
    - `escort_start` - Initiates virtual escort, queries emergency_contacts table, notifies contacts via `friend_journey_started` event
    - `escort_update` - Broadcasts GPS updates to watchers in `track_{userId}` room via `update_target_location` event
    - `join_watch_room` - Contact joins tracking room to watch friend's journey
    - `escort_end` - Notifies contacts via `friend_journey_ended` and cleans up tracking room
  - **Emergency Contact Logic:** Matches users.phone with emergency_contacts.phone to find contacts with NightGuard accounts
  - Routes incoming requests to appropriate API endpoints (auth, user, iot)
  - Serves static files from public/ and uploads/ directories
  - Fallback route serves index.html for SPA routing
  - Listens on configured PORT (default 3000)

---

### Server Config (`server/config/`)

#### `server/config/db.js`
- **Purpose:** PostgreSQL database connection configuration
- **What it does:**
  - Creates PostgreSQL connection pool using `pg` library
  - Reads `DATABASE_URL` from environment variables
  - Exports pool for use across all controllers and routes
  - Enables efficient database query execution with connection pooling

---

### Server Controllers (`server/controllers/`)

#### `server/controllers/authController.js`
- **Purpose:** Authentication logic (register/login)
- **What it does:**
  - **Register:** Creates new users with hashed passwords (bcrypt), validates unique email/username/phone
  - **Login:** Authenticates users, verifies passwords, generates JWT tokens
  - **Token Generation:** Creates JWT with user ID, email, username, and expiration time
  - Handles duplicate user detection and error responses
  - Returns user data and JWT token on successful authentication

#### `server/controllers/userController.js`
- **Purpose:** User profile, guardian system, and emergency contacts management
- **What it does:**
  - **Profile Management:**
    - getProfile: Returns user data including role (USER/SECURITY/POLICE/ADMIN/PENDING)
    - updateLocation: Updates user's GPS coordinates and last_seen timestamp (heartbeat for guardians)
  - **Guardian System:**
    - toggleGuardian: Activates/deactivates guardian status (ON/OFF DUTY) - restricted to SECURITY/POLICE/ADMIN roles
    - applyForGuardian: Allows USER role to apply for guardian status (sets role to PENDING)
    - getApplicants: ADMIN only - retrieves all PENDING applications
    - approveGuardian: ADMIN only - promotes applicant to SECURITY role
    - rejectGuardian: ADMIN only - reverts applicant back to USER role
  - **Emergency Contacts:**
    - getContacts: Retrieves user's emergency contacts list from emergency_contacts table
    - addContact: Adds new emergency contact with name, phone, relation
    - deleteContact: Removes emergency contact by ID
  - **Alert History:**
    - getAlertHistory: Returns last 20 alerts with audio_url, GPS, and timestamps

#### `server/controllers/iotController.js`
- **Purpose:** Emergency alerts, IoT sensor data, and community safety features
- **What it does:**
  - **Panic Alert Handler:** Saves SOS alerts to database with GPS coordinates
  - **Guardian Notification:** Finds nearby active guardians (within ~10km radius using lat/lng proximity)
  - **WebSocket Broadcasting:** Sends real-time emergency notifications to guardians
  - **Audio Evidence Upload:** Handles audio file uploads with unique naming (audio-{userId}-{timestamp}-{random}.mp4/webm)
  - **Hazard Reporting:** Allows users to report safety hazards (reportHazard function)
  - **Safety Map Data:** Retrieves all community-reported hazards for map display (getSafetyMapData)
  - Records trigger method (SHAKE_TRIGGER, BUTTON_PRESS)
  - Updates alerts table with audio_url after recording upload
  - Exported functions: handlePanicAlert, handleAudioUpload, reportHazard, getSafetyMapData

---

### Server Middleware (`server/middleware/`)

#### `server/middleware/authMiddleware.js`
- **Purpose:** JWT token verification and route protection
- **What it does:**
  - Intercepts requests to protected routes
  - Extracts JWT token from `Authorization` header
  - Verifies token validity and expiration
  - Decodes token and attaches user data to `req.user`
  - Rejects unauthorized requests with 401/403 status
  - Ensures only authenticated users can access protected endpoints

---

### Server Models (`server/models/`)

#### `server/models/User.js`
- **Purpose:** User data model and database operations
- **What it does:**
  - Defines user schema structure
  - Provides methods for user CRUD operations
  - Handles password hashing and validation
  - Manages user role assignments (USER, SECURITY, POLICE, ADMIN)
  - Implements user search and filtering logic
  - Contains helper methods for user data manipulation

---

### Server Routes (`server/routes/`)

#### `server/routes/authRoutes.js`
- **Purpose:** Authentication API endpoints
- **Routes:**
  - `POST /api/auth/register` - User registration
  - `POST /api/auth/login` - User login
  - Uses authController functions
  - No authentication middleware (public routes)

#### `server/routes/userRoutes.js`
- **Purpose:** User management, guardian system, and emergency contacts API endpoints
- **Routes:**
  - **Profile & Location:**
    - `GET /api/user/profile` - Get user profile with role (protected)
    - `POST /api/user/location` - Update GPS location and heartbeat (protected)
  - **Guardian Toggle:**
    - `POST /api/user/toggle-guardian` - Toggle ON/OFF duty for SECURITY/POLICE/ADMIN (protected)
  - **Guardian Application System:**
    - `POST /api/user/apply` - Apply for guardian status (USER role only) (protected)
    - `GET /api/user/applicants` - Get all pending applications (ADMIN only) (protected)
    - `POST /api/user/approve` - Approve guardian application (ADMIN only) (protected)
    - `POST /api/user/reject` - Reject guardian application (ADMIN only) (protected)
  - **Emergency Contacts:**
    - `GET /api/user/contacts` - Get emergency contacts list (protected)
    - `POST /api/user/contacts` - Add emergency contact (protected)
    - `DELETE /api/user/contacts/:id` - Delete emergency contact (protected)
  - **Alert History:**
    - `GET /api/user/history` - Get last 20 alerts with audio evidence (protected)
  - All routes require JWT authentication via authMiddleware

#### `server/routes/iotRoutes.js`
- **Purpose:** IoT sensor, alert, and community safety API endpoints
- **Routes:**
  - `POST /api/iot/panic` - Trigger emergency SOS alert (protected)
  - `POST /api/iot/upload-evidence` - Upload audio recording evidence with Multer (protected)
  - `POST /api/iot/report` - Report community safety hazard (protected)
  - `GET /api/iot/safety-map` - Get all hazard reports for map display (protected)
- **File Upload Configuration:**
  - Uses Multer with diskStorage to uploads/ directory
  - Automatic filename: `audio-{userId}-{timestamp}-{random}.{ext}`
  - Supports .mp4 and .webm audio formats
  - Creates uploads/ directory if it doesn't exist

#### `server/routes/buddyRoutes.js`
- **Purpose:** Walking companion/buddy system for group safety
- **Routes:**
  - `POST /api/buddy/post` - Create a new route post with departure time (protected)
  - `GET /api/buddy/nearby` - Find nearby active walkers looking for companions (protected)
  - `GET /api/buddy/chat/:routeId` - Retrieve chat history for a buddy journey (protected)
  - `GET /api/buddy/active-walk` - Get current active walk/journey (protected)
- **Features:**
  - Users can post walking routes with destination and departure time
  - Find other users with similar routes for companionship
  - Real-time messaging between buddies during journey
  - Status tracking (ACTIVE, MATCHED, COMPLETED)

---

### Public Frontend (`public/`)

#### `public/index.html`
- **Purpose:** Single-page application HTML structure
- **What it does:**
  - Defines app layout with views: landing, auth, map, escort, guardian, settings, history
  - Includes overlay screens for start/loading states
  - Loads external libraries:
    - Leaflet.js for interactive maps
    - Socket.IO client for real-time communication
    - Phosphor Icons for UI elements
  - Contains modals for alerts, escort setup, and notifications
  - Implements responsive mobile-first design with viewport settings
  - Provides bottom navigation bar for main app sections
  - Sets up manifest.json for PWA capabilities

---

### Frontend Styles (`public/css/`)

#### `public/css/style.css`
- **Purpose:** Complete application styling
- **What it does:**
  - Implements custom design system with CSS variables
  - Defines responsive layouts for mobile and desktop
  - Styles authentication forms with glass morphism effects
  - Creates animated loading states and transitions
  - Designs map overlays and route controls
  - Implements gradient backgrounds and glassmorphism panels
  - Styles buttons, inputs, cards, and navigation elements
  - Includes animations for pulse effects, rings, and alerts
  - Provides dark mode compatibility
  - Optimizes for touch interfaces and mobile gestures

---

### Frontend JavaScript (`public/js/`)

#### `public/js/main.js`
- **Purpose:** Application initialization and module coordination
- **What it does:**
  - DOMContentLoaded event handler - main entry point
  - Checks authentication status from localStorage
  - Initializes all modules: auth, socket, IoT sensors, settings
  - Controls bottom navigation visibility based on login state
  - Handles app startup sequence (start overlay button)
  - Coordinates between different app modules
  - Triggers sensor permission requests on user interaction

#### `public/js/auth.js`
- **Purpose:** Authentication UI and session management
- **What it does:**
  - Handles login/register form submissions
  - Stores JWT token in localStorage
  - Session validation and auto-login
  - Token expiration handling
  - Logout functionality
  - View switching between login/register/main app
  - Error display for failed authentication
  - Redirects authenticated users to app view

#### `public/js/socket-client.js`
- **Purpose:** WebSocket real-time communication
- **What it does:**
  - Establishes Socket.IO connection to server
  - Joins user-specific notification room on login
  - Listens for emergency alerts from nearby victims
  - Receives live location updates during escort mode
  - Handles guardian-victim communication
  - Displays real-time notifications with visual/audio alerts
  - Manages connection state and reconnection logic
  - Emits user events (escort start, location updates)

#### `public/js/map.js`
- **Purpose:** Dual map system (Safety Map & Rescue Map)
- **What it does:**
  - **Safety Map:** Community hazard reporting and route planning
    - Display user location marker
    - Allow destination selection via tap
    - Show hazard markers (broken lights, suspicious areas)
    - Calculate routes with Leaflet Routing Machine
    - Estimate trip duration
  - **Rescue Map:** Emergency response for guardians
    - Show victim location with pulsing red marker
    - Display guardian's blue marker
    - Auto-routing from guardian to victim
    - Real-time location updates via WebSocket
    - Distance calculation and ETA updates
  - Handles map initialization, cleanup, and state management
  - Custom marker icons for different roles

#### `public/js/escort.js`
- **Purpose:** Virtual escort feature with live navigation
- **What it does:**
  - Opens escort setup modal
  - Integrates with map for destination picking
  - Receives route estimates and calculates buffer time
  - Starts escort timer countdown
  - Broadcasts real-time GPS location to selected contacts via WebSocket
  - Tracks user movement with Geolocation API
  - Sends notifications to contacts with live location
  - Handles escort completion or manual cancellation
  - Provides "I'm Safe" button to end escort early

#### `public/js/guardian.js`
- **Purpose:** Guardian mode and admin panel management
- **What it does:**
  - Loads user role from API (USER, SECURITY, POLICE, ADMIN)
  - **Guardian Toggle:** Activates/deactivates guardian status for SECURITY/POLICE/ADMIN users
  - **Admin Panel:** 
    - Lists pending guardian applications
    - Approve/Reject applications
    - Manage user roles
  - **Application Panel:** Allows regular users to apply for guardian status
  - Displays application status (PENDING)
  - Sends location updates when in guardian mode
  - Manages visibility of role-specific UI elements

#### `public/js/history.js`
- **Purpose:** Alert history and activity log display
- **What it does:**
  - Fetches user's past emergency alerts from API
  - Displays alert cards with:
    - Alert type (SOS, PANIC)
    - Timestamp
    - GPS coordinates
    - Trigger method (SHAKE, BUTTON)
    - Status (ACTIVE, RESOLVED)
  - Provides "View on Map" functionality
  - Formats dates and times for readability
  - Handles empty state when no alerts exist
  - Allows filtering and sorting of alerts

#### `public/js/settings.js`
- **Purpose:** User profile settings and preferences
- **What it does:**
  - Loads and displays user profile data
  - **Profile Editing:**
    - Update full name, bio, email, phone
    - Upload and preview avatar image
    - Save changes to server
  - **Contact Management:**
    - Add/remove emergency contacts
    - Display contact list with avatars
    - Validate contact selections
  - **App Settings:**
    - Notification preferences
    - Sound/vibration toggles
    - Privacy settings
  - **Logout:** Clears token and returns to landing page

#### `public/js/iot-sensors.js`
- **Purpose:** IoT sensor integration (accelerometer + microphone)
- **What it does:**
  - **Shake Detection:**
    - Monitors device accelerometer (DeviceMotionEvent)
    - Detects sudden movements exceeding threshold
    - Requests motion permissions (iOS)
    - Configurable sensitivity settings
  - **Audio Recording:**
    - Starts recording automatically on shake detection
    - Uses MediaRecorder API to capture audio
    - Provides manual stop button
    - Uploads audio blob to server as evidence
  - **Emergency Triggering:**
    - Creates SOS alert in database when shake detected
    - Sends GPS coordinates with alert
    - Notifies nearby guardians via WebSocket
  - **Permission Handling:** Manages iOS/Android sensor permission flows
  - **Status Display:** Visual feedback for recording state

#### `public/js/buddy.js`
- **Purpose:** Walking companion matching and group safety feature
- **What it does:**
  - **Route Posting:**
    - User creates a walking route with destination and departure time
    - Route is published to nearby users
    - Displays departure time and current status
  - **Buddy Matching:**
    - Displays list of active walkers with similar routes (refreshes every 30s)
    - Shows walker's name, avatar, destination, and departure time
    - "JOIN" button to request companionship
  - **Journey Management:**
    - Tracks active walk/buddy pair status (ACTIVE, MATCHED, COMPLETED)
    - Can rejoin/reopen chat for current active journey
    - Duration tracking and estimated arrival
  - **Real-time Chat:**
    - Peer-to-peer messaging during shared journey
    - Socket.IO integration for instant delivery
    - Chat history retrieval and persistence
    - Message timestamps and sender identification
  - **Safety Benefit:** Multiple people traveling together increases security

---

### Uploads (`uploads/`)
- **Purpose:** Storage directory for user-uploaded files
- **What it stores:**
  - Audio recordings from emergency events
  - User avatar images
  - Evidence files from alerts
- **Note:** This directory is created automatically by Multer when files are uploaded

---

## 🔑 Key Features

1. **Authentication System**
   - Secure JWT-based authentication
   - Bcrypt password hashing
   - Session management with localStorage

2. **Real-Time Communication**
   - WebSocket connections for instant alerts
   - Live location tracking during escort mode
   - Emergency contact notifications
   - Guardian-victim messaging

3. **Virtual Escort**
   - Live GPS tracking with continuous updates
   - Route calculation with hazard awareness
   - Smart contact matching (phone number cross-reference)
   - Real-time location sharing with trusted contacts
   - "I'm Safe" quick completion button

4. **Emergency Alerts**
   - Shake-to-activate SOS (SHAKE_TRIGGER)
   - Manual panic button (BUTTON_PRESS)
   - Automatic audio recording (mp4/webm)
   - Nearby guardian notification system (10km radius)
   - GPS coordinate logging with timestamps
   - Audio evidence storage and playback

5. **Community Safety**
   - Hazard reporting (DARK, ACCIDENT, BROKEN_LIGHT, DANGEROUS_CROWD, SUSPICIOUS)
   - Safety map visualization with hazard markers
   - Community-driven safety data
   - Safety route planning avoiding reported hazards

6. **Guardian System**
   - Role-based access control (USER, PENDING, SECURITY, POLICE, ADMIN)
   - Guardian application workflow:
     - Users apply with phone, reason, experience
     - Status changes to PENDING
     - Admin reviews applications
     - Approval promotes to SECURITY role
     - Rejection reverts to USER role
   - ON/OFF duty toggle for active guardians
   - Location heartbeat tracking (last_latitude, last_longitude, last_seen)
   - Emergency response coordination

7. **Emergency Contacts**
   - Add/remove trusted contacts with phone numbers
   - Automatic matching with NightGuard users via phone
   - Contact relationship tracking
   - Integration with escort notification system

8. **IoT Integration**
   - Accelerometer-based panic detection
   - Automatic audio evidence collection
   - Device motion permission handling (iOS/Android)
   - Configurable shake sensitivity

9. **Admin Panel**
   - View pending guardian applications
   - Approve/reject applicants
   - User role management
   - System oversight

10. **Walking Buddy System**
   - Post routes with destination and departure time
   - Find nearby users with similar routes
   - Real-time buddy matching and notifications
   - In-journey messaging with buddies
   - Group travel for increased safety
   - Active journey tracking and management

---

## 🌐 API Endpoints Summary

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login to account

### User Management
- `GET /api/user/profile` - Get profile with role (protected)
- `POST /api/user/location` - Update GPS location heartbeat (protected)
- `POST /api/user/toggle-guardian` - Toggle ON/OFF duty (SECURITY/POLICE/ADMIN) (protected)
- `GET /api/user/history` - Get last 20 alerts (protected)

### Guardian Application System
- `POST /api/user/apply` - Apply for guardian status (protected)
- `GET /api/user/applicants` - Get pending applications (ADMIN only) (protected)
- `POST /api/user/approve` - Approve application (ADMIN only) (protected)
- `POST /api/user/reject` - Reject application (ADMIN only) (protected)

### Emergency Contacts
- `GET /api/user/contacts` - Get emergency contacts (protected)
- `POST /api/user/contacts` - Add emergency contact (protected)
- `DELETE /api/user/contacts/:id` - Delete emergency contact (protected)

### IoT & Alerts
- `POST /api/iot/panic` - Trigger SOS alert (protected)
- `POST /api/iot/upload-evidence` - Upload audio evidence (protected)

### Community Safety
- `POST /api/iot/report` - Report safety hazard (protected)
- `GET /api/iot/safety-map` - Get all hazard reports (protected)

### Walking Buddy System
- `POST /api/buddy/post` - Create a new walking route (protected)
- `GET /api/buddy/nearby` - Find nearby walkers for companionship (protected)
- `GET /api/buddy/chat/:routeId` - Get buddy chat history (protected)
- `GET /api/buddy/active-walk` - Get current active walk/journey (protected)

---

## 🔒 Security Features

- JWT token-based authentication
- Bcrypt password hashing (10 rounds)
- Protected routes with middleware
- SQL injection prevention via parameterized queries
- CORS configuration
- Secure file upload validation

---

## 📱 Mobile Support

- Responsive mobile-first design
- iOS and Android sensor support
- Touch-optimized interface
- PWA capabilities (manifest.json)
- Geolocation API integration
- Device motion/orientation support

---

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
# Windows
pg_isready

# Check connection string in .env
# Make sure DATABASE_URL is correct
```

### Port Already in Use
```bash
# Change PORT in .env file
PORT=3001
```

### Module Not Found Errors
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

### Sensor Permissions Not Working
- Ensure HTTPS or localhost (required for sensor APIs)
- Check browser console for permission errors
- iOS requires user gesture to request permissions (use START APP button)

---

## 📄 License

ISC

---

## 👤 Author

GitHub: [emiliaaa25](https://github.com/emiliaaa25/NightGuard)

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

**Made with ❤️ for safer communities**
