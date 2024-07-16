# cryptocrypt

Cryptocrypt helps you set up a delayed message for your loved ones, to help them retrieve your crypto when you're gone.

## self-hosting
If you don't trust me and want perfect peace of mind, you can host this on your own server.

This is a very simple web app that you can install with `git clone` and `npm install`.

You'll need a Postgres Database. You can then set the `DATABASE_URL` environment variable to the Postgres connection string, `PORT` to the unix port you want to use, and run `npm start` from there.

The app is simple enough to be dockerized/run through pm2/deployed on Heroku within a couple minutes.
