# Motorsport-DB - Website

Welcome to the **website repository** of Motorsport-DB! This is an open-source motorsport database featuring drivers, teams, championships, and races data with modern web technologies.

## 🏎️ **About**

MotorsportDB is a comprehensive database of motorsport information including:
- **Drivers:** Detailed profiles with statistics, career achievements, and performance analytics
- **Teams:** Team histories, results, and comparisons
- **Championships:** Race results, standings, and historical data
- **Games:** Interactive games like Guess Who and Driverdle

## 🚀 **Tech Stack**

- **Backend:** PHP 8+ (OOP, PSR-4)
- **Frontend:** Modern JavaScript (ES6+ modules), Tailwind CSS
- **Architecture:** MVC-like structure with service layer
- **Data:** JSON files for easy contribution, compiled into a read-only SQLite database
- **Charts:** Chart.js for analytics visualization

## 🚀 **Requires**
- **Serveur Web**: Apache2 2.4+
- **PHP**: 8.5.12+ (fixes PHP2Shell, CVE-2026-109618 / CVE-2026-109619) with extensions:
  - `pdo_sqlite`
  - `mbstring`, `iconv`
  - `apcu` (optional, recommended)
- **Node.js**: 18+ (for Tailwind CSS)
- **NPM**: 8+

## 📁 **Project Structure**

```
MotorsportDB/
├── public/              # Web-accessible pages
│   ├── index.php        # Homepage
│   ├── driver.php       # Driver profile page
│   ├── team.php         # Team profile page
│   ├── race.php         # Race/championship page
│   └── games/           # Interactive games
├── includes/            # Reusable PHP components (header, footer)
├── api/                 # API endpoints
├── src/                 # Backend logic (controllers, models, utils)
├── assets/              # Static resources (CSS, JS, images)
├── drivers/             # Driver data (JSON)
├── teams/               # Team data (JSON)
└── races/               # Race data (JSON)
```

## 🎯 **Features**

- ✅ Modern responsive design with dark mode
- ✅ Interactive charts and statistics
- ✅ Advanced search with autocomplete
- ✅ Head-to-head driver comparisons
- ✅ Performance analytics and radar charts
- ✅ RESTful API for data access
- ✅ Games: Guess Who and Driverdle

## 💻 **Getting Started**

1. Clone the repository:
   ```bash
   git clone https://github.com/Motorsport-DB/website.git
   cd website
   git clone https://github.com/motorsportdb/drivers.git
   git clone https://github.com/motorsportdb/teams.git
   git clone https://github.com/motorsportdb/races.git
   ```

2. Build the database (`var/`, regenerated only when the data changed):
   ```bash
   php bin/build.php            # --force to rebuild, --check to list data problems
   ```

3. Start development server with clean URLs:
   ```bash
   php -S localhost:8080 router.php
   ```

   Or with Docker/Podman (the build runs automatically at every start):
   ```bash
   docker compose up -d --build   # http://localhost:10001
   ```

4. Open your browser:
   ```
   http://localhost:8080
   ```

## 🗄️ **Data model**

`races/` is the **single source of truth** for results. `drivers/` and `teams/`
only describe identities (name, country, dates, aliases, lineage), so a result
can never disagree between a driver page, a team page and a race page.

`bin/build.php` reads the three repositories and generates, in `var/`:
- `motorsportdb.sqlite`: indexed database queried by the API (read-only);
- `search-index.json`: compact index used by the client-side search
  (accent/typo tolerant, follows team `aliases` and `previous`/`next`).

It also validates the data: unknown driver/team ids, duplicates differing only
by case/accents, empty teams… (`php bin/build.php --check`).

## 🤝 **Contributing**

Welcome to the **website repository** of Motorsport-DB! This project is open-source and welcomes **all contributions**, whether you're improving PHP, JavaScript, CSS, or adding new features.

## ✅ **General Contribution Rules**
- Contributions can be related to **functionality, performance, aesthetics, or new statistics/calculations**.
- **All images and assets must be free of copyright** or your own property.
- Code contributions must follow good **security and performance practices**.
- **Pull Requests (PRs) are mandatory** – **No direct push to `main`**.
- Contributions **do not need to be fully complete**, even partial improvements are welcome.

## 🚀 **How to Contribute**
1. **Fork the repository** to your GitHub account.
2. **Clone the repository** locally.
3. **Create a new branch** with a descriptive name.
4. **Modify/add PHP, JS, CSS, or other files** to improve the website.
5. **Ensure that your code is clean and follows good practices.**
6. **Commit your changes** (see commit rules below).
7. **Push your branch** and open a pull request (PR) targeting `main`.
8. **Await review and feedback before merging.**

## 📜 **Commit & PR Guidelines**
- **No direct push to `main`**, all changes must go through PRs.
- **Commit messages should be signed** (preferred) and structured as follows:
  - **First line:** A concise summary of changes (max 70 characters).
  - **Commit description:** A detailed breakdown of modifications.
  
Example commit message:
```
Improved homepage styling and optimized search feature

- Refactored CSS for better mobile responsiveness
- Enhanced search algorithm for faster queries
- Fixed a bug in JavaScript event handling
```

## 🛠 **Possible Contributions**
- **PHP Enhancements:** Improve backend logic, optimize database queries, add API endpoints.
- **JavaScript Features:** Enhance interactivity, improve search algorithms, create new UI components.
- **CSS & UI Enhancements:** Improve responsiveness, update the design, refine animations.
- **Statistical Tools:** Add new ways to visualize racing data, performance graphs, or rankings.
- **Bug Fixes & Security Enhancements:** Improve website performance and security.

## 🔍 **Testing & Best Practices**
- Ensure that **your changes do not break existing functionality**.
- Test across **multiple browsers and devices** to ensure compatibility.
- Keep your code **clean and documented** for future contributors.

## 🏁 **Need Help?**
If you're unsure about how to contribute or have any questions, feel free to **open an issue** in the repository. We appreciate all contributions, big or small, to make Motorsport-DB the best racing database possible!

## 📄 **License**

This project is open-source. All images and assets must be copyright-free or your own property.

## 🔗 **Links**

- **GitHub:** https://github.com/Motorsport-DB
- **Website:** https://motorsportdb.org

---

**Made with ❤️ by the motorsport community**

Thank you for your support! 🏎️

