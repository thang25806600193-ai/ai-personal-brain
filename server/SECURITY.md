# Security Guide

## Secrets
All secrets must be in environment variables.

Required:
- JWT_SECRET
- GOOGLE_API_KEY
- GROQ_API_KEY
- HF_ACCESS_TOKEN

## Generate JWT_SECRET
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Git Hygiene
- .env is ignored by .gitignore
- Use .env.example for templates
