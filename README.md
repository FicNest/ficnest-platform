
# FicNest 📚

**FicNest** is a modern, full-stack web application designed for authors and readers of fan fiction and web novels. It provides a seamless platform for publishing, reading, and interacting with a vibrant community of story lovers.

## ✨ Key Features

- **📖 For Readers:**
  - **Browse & Search:** Discover new novels by genre, title, or author.
  - **Seamless Reading Experience:** Enjoy an immersive, chapter-by-chapter reading interface.
  - **Personalized Library:** Keep track of your reading history and bookmark your favorite novels.
  - **Community Interaction:** Leave reviews and comments to share your thoughts with authors and other readers.
  - **Dark Mode:** Switch to a comfortable dark theme for nighttime reading.

- **✍️ For Authors:**
  - **Author Dashboard:** A dedicated space to manage your novels, chapters, and drafts.
  - **Easy Publishing Flow:** Create, edit, and publish novels and chapters with a user-friendly editor.
  - **Engagement Analytics:** View stats for your novels and interact with reader comments and reviews.
  - **Content Management:** Full control over your published works, including the ability to edit or delete chapters.

## 🚀 Tech Stack

- **Frontend:**
  - **Framework:** [React](https://reactjs.org/) with [Vite](https://vitejs.dev/)
  - **Language:** [TypeScript](https://www.typescriptlang.org/)
  - **Styling:** [Tailwind CSS](https://tailwindcss.com/) with [Shadcn/UI](https://ui.shadcn.com/)
  - **Data Fetching:** [TanStack Query (React Query)](https://tanstack.com/query/latest)
  - **Routing:** [Wouter](https://github.com/molefrog/wouter)

- **Backend:**
  - **Framework:** [Express.js](https://expressjs.com/)
  - **Language:** [TypeScript](https://www.typescriptlang.org/)
  - **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
  - **Database:** [PostgreSQL](https://www.postgresql.org/)

- **Authentication:**
  - Managed via [Supabase](https://supabase.io/) and integrated with the backend using Passport.js.

## 📂 Project Structure

The project is organized into a monorepo-like structure:

```
.
├── client/         # Contains the frontend React application
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/      # Application pages/views
│   │   ├── hooks/      # Custom React hooks
│   │   └── lib/        # Utility functions and libraries
│
├── server/         # Contains the backend Express.js server
│   ├── api-routes/ # Handlers for specific API endpoints
│   ├── lib/        # Backend libraries (e.g., Supabase)
│   ├── utils/      # Utility functions (e.g., password hashing)
│   └── routes.ts   # Main API route definitions
│
└── shared/         # Code shared between frontend and backend
    └── schema.ts   # Drizzle ORM database schema and types
```

## ⚙️ Getting Started

Follow these instructions to get a local copy up and running for development and testing.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [pnpm](https://pnpm.io/) (or your preferred package manager like npm or yarn)
- [PostgreSQL](https://www.postgresql.org/download/) installed and running.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/FicNest/ficnest-platform.git
    cd ficnest-platform
    ```

2.  **Install dependencies:**
    This project uses a single `package.json` in the root.
    ```bash
    pnpm install
    ```

3.  **Set up environment variables:**
    You will need to create two `.env` files for the project to run correctly: one in the `server/` directory and one in the `client/` directory.

    -   **In `server/.env`, add the following variables:**
        -   `DATABASE_URL`: Your full PostgreSQL connection string.
        -   `SUPABASE_URL`: The URL for your Supabase project.
        -   `SUPABASE_ANON_KEY`: The public anon key for your Supabase project.
        -   `SESSION_SECRET`: A strong, random string used to secure user sessions.

    -   **In `client/.env`, add the following variables:**
        -   `VITE_SUPABASE_URL`: The URL for your Supabase project.
        -   `VITE_SUPABASE_ANON_KEY`: The public anon key for your Supabase project.

4.  **Run database migrations:**
    Apply the database schema to your PostgreSQL instance.
    ```bash
    pnpm drizzle:push
    ```

### Running the Application

This project runs the frontend and backend servers concurrently.

-   **Run in development mode:**
    ```bash
    pnpm dev
    ```
    This will start:
    - The frontend Vite server on `http://localhost:5173`
    - The backend Express server on `http://localhost:3000`

-   **Run in production mode:**
    First, build the client application:
    ```bash
    pnpm build
    ```
    Then, start the production server:
    ```bash
    pnpm start
    ```
    The application will be served from `http://localhost:3000`.

---
