# cryptocrypt

Cryptocrypt helps you set up a delayed message for your loved ones, to help them retrieve your crypto when you're gone.

## self-hosting

If you don't trust me and want peace of mind, you can host this on your own server.

This is a very simple web app.
It was kept simple to make it easy for you to inspect and ensure the code only does what is advertised, not more.
Still, you'll need minimal development skills to be able to deploy your own instance, and confidence that what you're doing will work on the long term.

**You'll need to make sure that you deploy this app on a long-running server, that will still be running for at least a couple months after your disappearance, as you want your heir to be able to read the message you set up.**

### self-hosting: testing

To run your own instance, you'll need a Postgres database setup.
For development and testing only, you can use something like `docker run --name postgres -p 5432:5432 --env POSTGRES_USER=admin --env POSTGRES_DB=cryptocrypt --env POSTGRES_PASSWORD=admin -d postgres:16`.

Checkout the code and install the dependencies:

```sh
git clone "https://github.com/Neamar/cryptocrypt.online.git"
cd cryptocrypt.online
npm install
```

Move on to the section "Configuration".

### self-hosting: deploy

This app is made to be easy to deploy on Heroku-like systems.
You can use [dokku](https://dokku.com/) (recommended) and deploy on your own server, or deploy to [Heroku](https://heroku.com).

If you have the knowledge, you can also deploy this app on your own server using your preferred method, and then simply start it with `npm start`.
Don't forget to add a reverse proxy in front of your app to handle SSL termination.

### Configuration

You'll then need to set up the app config through environment variables.

- `DATABASE_URL`: a Postgres connection string

  - For local development, if using the Docker command above: `'postgres://admin:admin@localhost:5432/cryptocrypt'`
  - For Heroku, it'll be automatically provisioned for you as the addon is specified in `app.json`
  - For Dokku, you'll need to either use [dokku-postgres](https://github.com/dokku/dokku-postgres) or specify an alternative Postgres database that you own
  - For manual deployments, you'll need to provision a Postgres database and set it up accordingly.

- `PORT`: the UNIX port you want the app to listen to

  - For local development, it'll default to 3000
  - For Heroku, you don't need to do anything
  - For Dokku, you don't need to do anything
  - For manual deployments, use the port you configured in your reverse proxy.

- `SELF_URL`: the URL where you're deploying the app on. This will be used to generate valid email links.
- `SECRET_KEY`: a random generated string, length around 40 characters, that'll be used as a seed to generate signed link (for instance, for email validation)
- `SENDGRID_API_KEY`: a [Sendgrid](https://sendgrid.com/) key, to send emails. The free plan should be enough for a personal use-case. [Details here](https://www.twilio.com/docs/sendgrid/ui/account-and-settings/api-keys)

### Adding cron (scheduled tasks)

Dokku already includes a cron system, and you won't need to do anything.

For Heroku, you need to add the "Heroku Scheduler" add-on, and configure it to run:

- Run `crypt-healthcheck` _at 00:00 on day-of-month 1, 15, 22, 25, and 28_
- Run `crypt-release` _at 00:00 on day-of-month 5._

For manual deployments, set up two cron task:

```
0 0 1,15,22,25,28 * * npm run job crypt-healthcheck
0 0 5 * * npm run job crypt-release
```

### Running the app

For development, you can use `npm run dev`, which will auto reload your code.
Heroku and Dokku will run automatically after pushing your code, just follow the URL.
Manual deployments is left up to you.

## Philosophy

- Every design decision is made to maximize the likelihood that the same code will be running in ten, twenty years
- External dependencies are chosen based on their track record of reliability and stability
  - Postgres has been very stable, very efficient for the past 20 years
  - Sendgrid was founded in 2009, and is one of the major player for sending email reliably
  - Github has been the de-facto provider of Git repositories for the past decade

## History

This project started in 2009. Back then, it was called "in case of death". I still have [some of the code](https://github.com/Neamar/neamar.fr/blob/master/lib/cron/crons/incaseofdeath.php) from this period (moved to Git in 2017). The Archive machine has a snapshot from 2010, written in French: [Message post-mortem](https://web.archive.org/web/20100125114330/https://blog.neamar.fr/component/content/article/4-prog/31-message-post-mortem-0).

I originally used this to share an SSH key.
This was all in PHP, with no SSL. Email sending didn't need SPF and DKIM, everything was simpler and also less secure in those time.

I then moved on to something I called "Memento Mori", slightly more secure but still only for my own use case.

Multiple providers then started adding systems to protect your digital legacy: [Google Inactive Account manager](https://support.google.com/accounts/answer/3036546?hl=en), [Github's account successor](https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-personal-account-on-github/managing-access-to-your-personal-repositories/maintaining-ownership-continuity-of-your-personal-accounts-repositories)

Then crypto happened, and this became even more important for me.
I built a website called [capsulegacy](https://web.archive.org/web/20220307095601/http://capsulegacy.com/en/), but made a handful of bad decisions there, with a complicated setup (typing the private key into the browser for local encryption, and requiring a password for the trustee) that wasn't very elegant.

I finally moved on to cryptocrypt.online, and moved every willing user to this new system automatically.
The end (for now) to a 15 year journey, and hoping this will last 30 more.
