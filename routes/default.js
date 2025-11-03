import Router from '@koa/router';

const router = new Router();

router.get('/', (ctx) => {
  ctx.render('index.html');
});

router.get('/donate', (ctx) => {
  ctx.render('donate.html');
});

router.get('/examples', (ctx) => {
  ctx.render('examples.html');
});

router.get('/writing', (ctx) => {
  ctx.render('writing.html');
});

router.get('/words', (ctx) => {
  ctx.render('words.html');
});

router.get('/encrypt', (ctx) => {
  ctx.render('encrypt.html');
});

router.get('/faq', (ctx) => {
  const qas = {
    'What is cryptocrypt?': `Cryptocrypt is a free webservice to set up a delayed email. You create this email now, telling your loved ones where they can find your recovery phrase.
    We'll then contact you regularly (once per month) to confirm you're still active.
    If you fail to answer, we'll assume the worst and send your message on your behalf.`,
    'Why is it free?': `I need this service for myself anyway, and it costs the same to run it for me or for thousands. If you like it, you can <a href="/donate">donate</a>.`,
    'Is it secure?': `Remember the golden rule of cold wallet storage: you should <strong>never</strong> share your recovery phrase online, or write it on a computer connected to the internet. You should <strong>not</strong> write it in this website: instead, give instructions that will help your loved ones figure out how to retrieve your stash. See <a href="/examples">examples</a>.
    If you follow those rules, you'll be safe.`,
    'Who is using this service?': `First and foremost, I am.
    I've been concerned for some time about how to pass on crypto if anything should happen to me, as my wife isn't technically inclined. I know she might forget technical instructions, so a written message delivered at the right time will be the most efficient way to help her in the process.`,
    "I'm never giving you my passphrase!": "Good! You should never share your recovery phrase online. You shouldn't be typing the actual words, instead you can tell your loved ones where they can find those words in the physical world. See <a href='/examples'>examples</a>.",
    "What's your privacy policy?": 'Everything you send here belongs to you and only you. You can delete it completely at any time and be assured it won\'t exist anywhere else. Data is not shared with third parties and is not accessed by us. The website does not use any external dependencies, anything you write here will only be visible to you and your trustee.',
    "Technically, what guarantees my data is safe?": 'This website uses HTTP Strict Transport Security (HSTS) to ensure all content is encrypted in transit. The SSL certificate is generated through the nonprofit LetsEncrypt for additional transparency. Each crypt page includes the strongest Content Security Policy headers to ensure only this domain can run code. No third party code can even be loaded, as your browser would refuse to run it. Finally, <a href="https://github.com/Neamar/cryptocrypt.online">the code is public</a> and kept simple for easier peer-review.',
    "Why is there no authentication?": `We want to keep things simple and easy to use for you for the next decade. Accounts are cumbersome, but we can assume your email will remain the most stable identifier.
    By using UUID, we guarantee that no one can ever find your crypt address. The level of security is roughly the same as the probability of finding a Bitcoin wallet by typing random words: there are <a href='https://download.wpsoftware.net/bitcoin-birthday.pdf'>2<sup>160</sup> possible Bitcoin wallets</a>, and there are 2<sup>122</sup> UUIDs. Additionally, this website includes heavy rate limiting, to limit even more enumeration attacks.`,
    'Can I have multiple crypts?': 'Yes. There is no limit to the number of crypts you can have.',
    'How can I trust that this service will still be running when I die, hopefully in years?': "I use this service for myself too, so it'll be running in the foreseeable future for sure. If you're really concerned, <a href=\"https://github.com/Neamar/cryptocrypt.online\">you can self-host</a> for free.",
  };
  ctx.render('faq.html', { title: 'Cryptocrypt FAQ', qas });
});
export default router;
