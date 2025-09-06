#!/bin/bash
# Direct Vercel deployment without GitHub

# First, we need to login interactively or use a valid token
# Since token is not working, use login flow:

npx vercel login --oob

# After login, deploy directly:
npx vercel --prod --yes --skip-domain
