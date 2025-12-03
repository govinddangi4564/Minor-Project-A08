# AI Resume Screener Backend

This is the backend service for the AI Resume Screener application. It provides APIs for resume parsing, job description management, candidate matching using SBERT (Sentence-BERT), and analytics dashboards.

## 🛠 Tech Stack

-   **Framework**: [FastAPI](https://fastapi.tiangolo.com/)
-   **Database**: [PostgreSQL](https://www.postgresql.org/)
-   **ORM**: [SQLAlchemy](https://www.sqlalchemy.org/)
-   **Migrations**: [Alembic](https://alembic.sqlalchemy.org/)
-   **Package Manager**: [uv](https://github.com/astral-sh/uv)
-   **AI/ML**: [Sentence-Transformers](https://www.sbert.net/) (SBERT) for semantic matching
-   **PDF Parsing**: [PyMuPDF](https://pymupdf.readthedocs.io/)
-   **Authentication**: JWT (JSON Web Tokens)

## 🚀 Prerequisites

Ensure you have the following installed on your system:

-   **Python 3.13+**
-   **PostgreSQL** (running locally or accessible remotely)
-   **uv** (fast Python package installer and resolver)

If you don't have `uv` installed, you can install it via curl or pip:
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
# or
pip install uv
```

## 📥 Installation & Setup

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd minor-project/backend
    ```

2.  **Install Dependencies**
    Using `uv` to sync dependencies from `uv.lock` or `pyproject.toml`:
    ```bash
    uv sync
    ```
    This will create a virtual environment in `.venv` and install all required packages.

3.  **Environment Configuration**
    Create a `.env` file in the `backend` directory. You can copy the example below:

    ```ini
    # Database Configuration
    POSTGRES_DB = ai_resume_db
    POSTGRES_USER = postgres_user
    POSTGRES_PASSWORD = postgres_pass
    POSTGRES_HOST = localhost
    POSTGRES_PORT = 5432

    # Security
    SECRET_KEY=your_super_secret_key_here
    ALGORITHM=HS256
    ACCESS_TOKEN_EXPIRE_MINUTES=30

    # Email Configuration (if applicable)
    MAIL_USERNAME=your_email@example.com
    MAIL_PASSWORD=your_email_password
    MAIL_FROM=your_email@example.com
    MAIL_PORT=587
    MAIL_SERVER=smtp.gmail.com
    ```

4.  **Database Setup**
    Make sure your PostgreSQL server is running and you have created the database mentioned in `DATABASE_URL`.

    Run migrations to set up the schema:
    ```bash
    uv run alembic upgrade head
    ```

## 🏃‍♂️ Running the Application

Start the development server using `uv`:

```bash
uv run uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`.

## 📚 API Documentation

FastAPI automatically generates interactive API documentation. Once the server is running, you can access:

-   **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
-   **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

## 📂 Project Structure

```
backend/
├── alembic/            # Database migration scripts
├── models/             # SQLAlchemy database models
├── routes/             # API route handlers
├── schemas/            # Pydantic models for request/response validation
├── services/           # Business logic and external services (AI, PDF parsing)
├── utils/              # Utility functions
├── uploads/            # Directory for storing uploaded resumes
├── main.py             # Application entry point
├── alembic.ini         # Alembic configuration
├── pyproject.toml      # Project dependencies and config
└── uv.lock             # Lock file for dependencies
```

## 🧪 Key Features

-   **Resume Parsing**: Extracts text and metadata from PDF resumes.
-   **Job Description Management**: Create and manage JDs.
-   **Semantic Matching**: Calculates similarity scores between candidates and JDs using SBERT.
-   **Dashboard Analytics**: Visualizes hiring trends and statistics.
-   **Shortlisting**: Manage candidate shortlists.
