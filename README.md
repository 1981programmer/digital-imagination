# Digital Imagination 🚀

A full-stack digital game storefront and community platform, developed for CSCI 4650. This application serves as a "mini-Steam," allowing users to browse games, manage a shopping cart, build a personal library, and interact with a community review system.

## Developer
**Gregory Treinen** ## Tech Stack
* **Backend:** Node.js, Express.js
* **Database:** MySQL (Hosted on AWS RDS)
* **Frontend:** EJS (Embedded JavaScript templates), HTML5, Vanilla CSS

## Core Features
* **Secure Authentication:** User registration and login utilizing encrypted sessions and `bcrypt` password hashing.
* **Digital Storefront & Cart:** Browse available games and add items to a session-based shopping cart.
* **Personal Library:** Seamless checkout process that permanently binds purchased games to the user's database record.
* **Community Hub:** Users can write and edit reviews for games in their library using a custom 0-6 rating scale. These reviews populate a global, time-sorted community activity feed.

## Local Setup

1. **Clone the repository:**
   \`\`\`bash
   git clone https://github.com/1981programmer/digital-imagination.git
   \`\`\`
2. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`
3. **Environment Configuration:**
   Create a `.env` file in the root directory and add your AWS RDS credentials:
   \`\`\`env
   DB_HOST=your-rds-endpoint.amazonaws.com
   DB_USER=your_username
   DB_PASSWORD=your_password
   DB_NAME=digital_imagination
   PORT=3000
   \`\`\`
4. **Run the Application:**
   \`\`\`bash
   node app.js
   \`\`\`
   Navigate to `http://localhost:3000` in your browser.