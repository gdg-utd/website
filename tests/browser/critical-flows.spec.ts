import { test, expect, type Page } from '@playwright/test';

const backend = 'http://127.0.0.1:4319';
const password = 'BrowserTest123!';
const pageErrors = new WeakMap<Page, string[]>();
async function login(page: Page, role = 'member', next = '/dashboard/profile') {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel('Email', {exact:true}).fill(`${role}@utdallas.edu`);
  await page.getByLabel('Password', {exact:true}).fill(password);
  await page.getByRole('button', {name:'Log in',exact:true}).click();
  await expect(page).toHaveURL(new RegExp(next.replaceAll('/', '\\/')));
}
async function passwordFields(page: Page, value: string) {
  await page.getByLabel('New password', {exact:true}).fill(value);
  await page.getByLabel('Confirm new password', {exact:true}).fill(value);
}

test.beforeEach(async ({page,request}) => {
  await request.post(`${backend}/__reset`, {data:{}});
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (['127.0.0.1','localhost'].includes(url.hostname)) await route.continue();
    else await route.abort('blockedbyclient');
  });
});
test.afterEach(async ({page,request}) => {
  expect(pageErrors.get(page), 'Unexpected browser exceptions').toEqual([]);
  const state = await (await request.get(`${backend}/__state`)).json();
  expect(state.unexpected, 'The service double must not silently accept new API calls').toEqual([]);
});

test('public navigation, mobile menu, gallery, and security headers', async ({page,isMobile}) => {
  const response = await page.goto('/sprints');
  expect(response?.headers()['x-frame-options']).toBe('DENY');
  expect(response?.headers()['content-security-policy']).toContain("'nonce-");
  await expect(page.getByRole('heading',{level:1})).toBeVisible();
  if (isMobile) {
    await page.locator('summary').filter({hasText:'Menu'}).click();
    await expect(page.getByRole('navigation',{name:'Mobile navigation'})).toBeVisible();
    await page.locator('summary').filter({hasText:'Menu'}).click();
    await expect(page.getByRole('navigation',{name:'Mobile navigation'})).toBeHidden();
    await expect(page.locator('summary').filter({hasText:'Menu'})).toBeVisible();
  }
  const gallery = page.getByRole('region',{name:'SPRINT photo row 1',exact:true});
  await gallery.scrollIntoViewIfNeeded();
  await expect.poll(() => gallery.locator('img').first().evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const track = gallery.locator('.sprint-photo-track');
  const originalTransform = await track.evaluate(element => getComputedStyle(element).transform);
  await expect.poll(() => track.evaluate(element => getComputedStyle(element).transform)).not.toBe(originalTransform);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});

test('protected pages require login and unsafe return URLs stay on this site', async ({page}) => {
  await page.goto('/dashboard/profile');
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.goto('/login?next=https%3A%2F%2Fexample.com');
  await page.getByLabel('Email',{exact:true}).fill('member@utdallas.edu');
  await page.getByLabel('Password',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Log in',exact:true}).click();
  await expect(page).toHaveURL('http://localhost:3100/');
});

test('incorrect credentials show an error; unconfirmed users go directly to OTP', async ({page}) => {
  await page.goto('/login');
  await page.getByLabel('Email',{exact:true}).fill('member@utdallas.edu');
  await page.getByLabel('Password',{exact:true}).fill('WrongPassword123!');
  await page.getByRole('button',{name:'Log in',exact:true}).click();
  await expect(page.getByText('The email or password is incorrect.')).toBeVisible();
  await page.getByLabel('Email',{exact:true}).fill('unconfirmed@utdallas.edu');
  await page.getByLabel('Password',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Log in',exact:true}).click();
  await expect(page).toHaveURL(/\/auth\/confirm\?/);
  await expect(page.getByRole('heading',{level:1})).toContainText('Enter your confirmation code.');
});

test('signup validates password confirmation and proceeds to email verification', async ({page}) => {
  await page.goto('/signup');
  await page.getByLabel('First name',{exact:true}).fill('Browser');
  await page.getByLabel('Last name',{exact:true}).fill('Member');
  await page.getByLabel('Email',{exact:true}).fill('newmember@utdallas.edu');
  await page.getByLabel('Password',{exact:true}).fill(password);
  await page.getByLabel('Confirm password',{exact:true}).fill('DifferentPassword123!');
  await expect(page.getByRole('button',{name:'Create account',exact:true})).toBeDisabled();
  await page.getByLabel('Confirm password',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Create account',exact:true}).click();
  await expect(page).toHaveURL(/\/auth\/confirm\?/);
});

test('reset requests display a quota error on the fourth request', async ({page}) => {
  await page.goto('/login?forgot=1');
  for (let attempt=1;attempt<=4;attempt++) {
    await page.getByLabel('UT Dallas email',{exact:true}).fill('member@utdallas.edu');
    await page.getByRole('button',{name:'Send reset link'}).click();
    if(attempt<4) await expect(page.getByRole('status')).toContainText('a reset link is on its way');
    else await expect(page.locator('main').getByRole('alert')).toContainText('3 per hour');
    await expect(page.getByRole('button',{name:'Send reset link'})).toBeEnabled();
  }
  await expect(page.getByText(/a reset link is on its way/)).toHaveCount(0);
});

test('profile saves persist and logout protects the dashboard again', async ({page}) => {
  await login(page);
  await page.getByLabel('First name').fill('Updated');
  await page.getByRole('button',{name:/save/i}).click();
  await expect(page.getByRole('status')).toContainText('Your profile was updated');
  await page.reload();
  await expect(page.getByLabel('First name')).toHaveValue('Updated');
  await page.getByRole('button',{name:'Log out'}).click();
  await expect(page).toHaveURL('http://localhost:3100/');
  await page.goto('/dashboard/profile');
  await expect(page).toHaveURL(/\/login\?/);
});

test('failed profile saves preserve entered fields', async ({page,request}) => {
  await request.post(`${backend}/__reset`,{data:{failProfileSave:true}});
  await login(page);
  await page.getByLabel('First name').fill('Keep this name');
  await page.getByRole('button',{name:/save/i}).click();
  await expect(page.locator('main').getByRole('alert')).toContainText('We could not update your profile');
  await expect(page.getByLabel('First name')).toHaveValue('Keep this name');
});

test('signed-in password changes validate current password and return to profile', async ({page}) => {
  await login(page);
  await page.getByRole('link',{name:'Reset password',exact:true}).click();
  await expect(page).toHaveURL(/\/dashboard\/profile\/password$/);
  await page.getByLabel('Current password',{exact:true}).fill('WrongPassword123!');
  await passwordFields(page,'ChangedBrowser123!');
  await page.getByRole('button',{name:'Update password'}).click();
  await expect(page.locator('main').getByRole('alert')).toContainText('current password is incorrect');
  await page.getByLabel('Current password',{exact:true}).fill(password);
  await passwordFields(page,'ChangedBrowser123!');
  await page.getByRole('button',{name:'Update password'}).click();
  await expect(page).toHaveURL(/\/dashboard\/profile\?message=password-updated$/);
  await expect(page.getByRole('status')).toContainText('Your password was updated');
});

test('recovery requires email proof, resets the password, and returns to login', async ({page}) => {
  await page.goto('/reset-password');
  await expect(page.getByRole('heading',{name:'Reset link unavailable'})).toBeVisible();
  await page.goto('/auth/callback?token_hash=browser-recovery&type=recovery&next=/reset-password');
  await expect(page.getByLabel('New password',{exact:true})).toBeVisible();
  await passwordFields(page,'RecoveredBrowser123!');
  await page.getByRole('button',{name:'Update password'}).click();
  await expect(page).toHaveURL(/\/login\?password=updated$/);
  await page.getByLabel('Email',{exact:true}).fill('member@utdallas.edu');
  await page.getByLabel('Password',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Log in',exact:true}).click();
  await expect(page.locator('main').getByRole('alert')).toContainText('incorrect');
  await page.getByLabel('Email',{exact:true}).fill('member@utdallas.edu');
  await page.getByLabel('Password',{exact:true}).fill('RecoveredBrowser123!');
  await page.getByRole('button',{name:'Log in',exact:true}).click();
  await expect(page).toHaveURL('http://localhost:3100/');
  await page.goto('/reset-password');
  await expect(page.getByRole('heading',{name:'Reset link unavailable'})).toBeVisible();
});

test('application draft, resume, required agreements, confirmation, and submitted lock', async ({page}) => {
  await login(page,'member','/apply/sprint-mentee');
  await page.getByLabel('Why would you like to join?').fill('I want to build with a team.');
  await page.getByRole('button',{name:'Save draft',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Draft saved');
  await page.reload();
  await expect(page.getByLabel('Why would you like to join?')).toHaveValue('I want to build with a team.');
  await page.getByRole('button',{name:'Submit application'}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByLabel('Web development',{exact:true}).check();
  await page.getByLabel('Agreement: I will attend team meetings.').check();
  await page.getByRole('button',{name:'Submit application'}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button',{name:'Keep editing'}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button',{name:'Submit application'}).click();
  await page.getByRole('button',{name:'Yes, submit application'}).click();
  await expect(page).toHaveURL(/\/dashboard\/applications\?submitted=/);
  await expect(page.getByRole('status')).toContainText('Your application was submitted');
  await page.goto('/apply/sprint-mentee');
  await expect(page.getByRole('heading',{name:'Your application is submitted.'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Save draft'})).toHaveCount(0);
});

test('RSVP confirmation stays disabled until every agreement is checked', async ({page,request}) => {
  await request.post(`${backend}/__reset`,{data:{offer:true}});
  await login(page,'member','/dashboard/applications');
  await page.getByRole('button',{name:'Respond to offer'}).click();
  await page.getByRole('button',{name:'Yes, confirm my spot'}).click();
  await expect(page.getByRole('button',{name:'Confirm my spot',exact:true})).toBeDisabled();
  await page.getByRole('dialog').getByRole('checkbox').check();
  await page.getByRole('button',{name:'Confirm my spot',exact:true}).click();
  await expect(page.getByText('Spot confirmed',{exact:true})).toBeVisible();
});

test('members cannot open the staff portal or read the staff review API', async ({page}) => {
  await login(page);
  await page.goto('/admin/applications');
  await expect(page).toHaveURL(/\/dashboard\?admin=denied/);
  const response=await page.request.get('/api/admin/applications/1');
  expect(response.status()).toBe(403);
});

test('admin pagination and search update the visible application list', async ({page}) => {
  await login(page,'admin','/admin/applications');
  await expect(page.getByText('Page 1 of 2',{exact:false})).toBeVisible();
  await expect(page.getByRole('row')).toHaveCount(26);
  await page.getByRole('link',{name:/Next/}).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByRole('row')).toHaveCount(3);
  await page.getByRole('textbox',{name:/search/i}).fill('Applicant 27');
  await page.getByRole('button',{name:'Apply filters'}).click();
  await expect(page.getByRole('row')).toHaveCount(2);
  await expect(page.getByRole('cell',{name:'Browser Applicant 27',exact:false})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test('expired recovery links lead back to requesting a new link', async ({page}) => {
  await page.goto('/auth/callback?token_hash=expired-fixture&type=recovery&next=/reset-password');
  await expect(page).toHaveURL(/\/login\?forgot=1&error=recovery/);
  await expect(page.locator('main').getByRole('alert')).toContainText('invalid or has expired');
  await expect(page.getByRole('button',{name:'Send reset link'})).toBeVisible();
});

test('administrators review, stage, cancel confirmation, and publish decisions', async ({page,request}) => {
  await request.post(`${backend}/__reset`,{data:{submitted:true}});
  await login(page,'admin','/admin/applications');
  await page.getByRole('button',{name:'Review',exact:true}).first().click();
  const review=page.getByRole('dialog',{name:'Application review'});
  await expect(review.getByText('A synthetic application for browser review.',{exact:true})).toBeVisible();
  await expect(review.getByText('Accepted by email provider',{exact:true})).toBeVisible();
  const publish = review.getByRole('button',{name:'Publish this decision',exact:true});
  await expect(publish).toBeDisabled();
  await review.getByRole('button',{name:'Stage acceptance',exact:true}).click();
  await expect(review.getByText('Acceptance is staged.',{exact:true})).toBeVisible();
  await publish.click();
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  const before = await (await request.get(`${backend}/__state`)).json();
  expect(before.applications[0].published_decision).toBe('undecided');
  await publish.click();
  await page.getByRole('button',{name:'Publish decision',exact:true}).click();
  await expect(page).toHaveURL(/message=published/);
  await expect(page.getByRole('status')).toContainText('Decision published');
  const after = await (await request.get(`${backend}/__state`)).json();
  expect(after.applications[0].published_decision).toBe('accepted');
});

test('reviewers can inspect responses but cannot export applications', async ({page,request}) => {
  await request.post(`${backend}/__reset`,{data:{submitted:true}});
  await login(page,'reviewer','/admin/applications');
  await expect(page.getByRole('link',{name:'Export CSV'})).toHaveCount(0);
  expect((await page.request.get('/admin/applications/export')).status()).toBe(403);
  await page.getByRole('button',{name:'Review',exact:true}).first().click();
  const review=page.getByRole('dialog',{name:'Application review'});
  await expect(review.getByText('A synthetic application for browser review.',{exact:true})).toBeVisible();
  await expect(review.getByRole('button',{name:/Publish this decision/})).toHaveCount(0);
});
