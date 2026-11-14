import { test, expect, type Page } from '@playwright/test';

const backend = 'http://127.0.0.1:4319';
const password = 'BrowserTest123!';
const pageErrors = new WeakMap<Page, string[]>();
const expectedRenderErrors = new WeakSet<Page>();
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
  page.on('pageerror', error => {
    // Deliberate SSR failures can also report recovery of an interrupted Suspense boundary.
    if(expectedRenderErrors.has(page)&&(error.message.startsWith('An error occurred in the Server Components render.')||error.message.startsWith('Minified React error #419;'))) return;
    errors.push(error.message);
  });
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
  await expect(page.getByLabel('Email',{exact:true})).toHaveValue('member@utdallas.edu');
  await expect(page.getByLabel('Password',{exact:true})).toHaveValue('WrongPassword123!');
  await page.getByLabel('Password',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Log in',exact:true}).click();
  await expect(page).toHaveURL('http://localhost:3100/');
  await page.goto('/dashboard');
  await page.getByRole('button',{name:'Log out'}).click();
  await expect(page).toHaveURL('http://localhost:3100/');
  await page.goto('/login');
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
    if(attempt===1) await page.getByLabel('UT Dallas email',{exact:true}).fill('member@utdallas.edu');
    await page.getByRole('button',{name:'Send reset link'}).click();
    if(attempt<4) await expect(page.getByRole('status')).toContainText('a reset link is on its way');
    else await expect(page.locator('main').getByRole('alert')).toContainText('3 per hour');
    await expect(page.getByRole('button',{name:'Send reset link'})).toBeEnabled();
    await expect(page.getByLabel('UT Dallas email',{exact:true})).toHaveValue('member@utdallas.edu');
  }
  await expect(page.getByText(/a reset link is on its way/)).toHaveCount(0);
});

test('profile saves persist and logout protects the dashboard again', async ({page}) => {
  await login(page);
  const firstName = page.getByLabel('First name');
  const originalName = await firstName.inputValue();
  const save = page.getByRole('button',{name:'Save changes',exact:true});
  await expect(save).toBeHidden();
  await firstName.fill('Updated');
  await expect(page.getByText('You have unsaved changes.',{exact:true})).toBeVisible();
  await firstName.fill(originalName);
  await expect(save).toBeHidden();
  const major = page.getByRole('region',{name:'Personal information'}).locator('select[name="major"]');
  await major.selectOption('Software Engineering');
  await expect(save).toBeVisible();
  await major.selectOption('Computer Science');
  await expect(save).toBeHidden();
  await firstName.fill('Updated');
  await save.click();
  await expect(save).toBeHidden();
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
  await page.getByRole('button',{name:'Save changes',exact:true}).click();
  await expect(page.locator('main').getByRole('alert')).toContainText('We could not update your profile');
  await expect(page.getByLabel('First name')).toHaveValue('Keep this name');
  await expect(page.getByRole('button',{name:'Save changes',exact:true})).toBeEnabled();
});

test('signed-in password changes validate current password and return to profile', async ({page}) => {
  await login(page);
  await page.getByRole('link',{name:'Reset password',exact:true}).click();
  await expect(page).toHaveURL(/\/dashboard\/profile\/password$/);
  await page.getByLabel('Current password',{exact:true}).fill('WrongPassword123!');
  await passwordFields(page,'ChangedBrowser123!');
  await page.getByRole('button',{name:'Update password'}).click();
  await expect(page.locator('main').getByRole('alert')).toContainText('current password is incorrect');
  await expect(page.getByLabel('Current password',{exact:true})).toHaveValue('WrongPassword123!');
  await expect(page.getByLabel('New password',{exact:true})).toHaveValue('ChangedBrowser123!');
  await expect(page.getByLabel('Confirm new password',{exact:true})).toHaveValue('ChangedBrowser123!');
  await page.getByLabel('Current password',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Update password'}).click();
  await expect(page).toHaveURL(/\/dashboard\/profile\?message=password-updated$/);
  await expect(page.getByRole('status')).toContainText('Your password was updated');
});

test('recovery requires email proof, resets the password, and returns to login', async ({page}) => {
  await page.goto('/reset-password');
  await expect(page.getByRole('heading',{name:'Reset link unavailable'})).toBeVisible();
  await page.goto('/auth/callback?token_hash=browser-recovery&type=recovery&next=/reset-password');
  await page.getByRole('button',{name:'Continue to reset password',exact:true}).click();
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

test('résumé defaults, per-application changes, and private submitted previews', async ({page,request,context}) => {
  const pdf = (name: string) => ({name, mimeType:'application/pdf', buffer:Buffer.from('%PDF-1.7\n%%EOF')});
  await login(page);
  const profileResume = page.getByRole('region',{name:'Personal information'}).getByRole('group',{name:'Resume',exact:true});
  const choosePdf = async (field: typeof profileResume, button: string, file: ReturnType<typeof pdf>) => {
    const chooser = page.waitForEvent('filechooser');
    await field.getByRole('button',{name:button,exact:true}).click();
    await (await chooser).setFiles(file);
  };
  const openPreview = async (field: typeof profileResume, filename: string) => {
    const originalUrl = page.url();
    await expect(field.getByText(filename,{exact:true}).filter({visible:true})).toBeVisible();
    await expect(field.getByRole('link',{name:filename,exact:true})).toHaveCount(0);
    const response = page.waitForResponse(res => res.url().includes('/api/resumes?') && res.url().endsWith('&preview=1'));
    await field.getByRole('button',{name:'Preview resume',exact:true}).click();
    const dialog = page.getByRole('dialog',{name:filename,exact:true});
    await expect(dialog).toBeVisible();
    const pdfResponse = await response;
    expect(pdfResponse.status()).toBe(200);
    expect(pdfResponse.headers()['content-type']).toBe('application/pdf');
    await expect(dialog.getByTitle('Resume PDF')).toHaveAttribute('src', /^blob:/);
    await expect(page).toHaveURL(originalUrl);
    return { dialog, previewUrl: pdfResponse.url() };
  };
  const firstName = page.getByLabel('First name');
  await firstName.fill('Unsaved profile edit');
  await choosePdf(profileResume, 'Upload PDF', pdf('Default résumé.pdf'));
  const profilePreview = profileResume.getByText('Default résumé.pdf',{exact:true}).filter({visible:true});
  const { dialog: profileDialog, previewUrl: defaultUrl } = await openPreview(profileResume, 'Default résumé.pdf');
  await profileDialog.getByRole('button',{name:'Close preview'}).click();
  await expect(profileDialog).toBeHidden();
  await expect(firstName).toHaveValue('Unsaved profile edit');
  await expect(page.getByRole('button',{name:'Save changes',exact:true})).toBeVisible();

  await page.goto('/apply/sprint-mentee');
  const firstSection = page.getByRole('region',{name:'About you'}).getByRole('group',{name:'Resume',exact:true});
  await expect(firstSection.getByText('Default résumé.pdf',{exact:true}).filter({visible:true})).toBeVisible();
  await firstSection.getByRole('button',{name:'Remove resume',exact:true}).click();
  await page.getByRole('button',{name:'Save draft',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Draft saved');
  await page.reload();
  await expect(firstSection.getByText('Default résumé.pdf',{exact:true}).filter({visible:true})).toHaveCount(0);
  await firstSection.getByRole('button',{name:'Use profile resume',exact:true}).click();
  await expect(firstSection.getByText('Default résumé.pdf',{exact:true}).filter({visible:true})).toBeVisible();

  await choosePdf(firstSection, 'Replace', {
    name:'Invalid.pdf', mimeType:'application/pdf', buffer:Buffer.from('Not a PDF'),
  });
  await expect(firstSection.getByRole('alert')).toContainText('Choose a valid PDF');
  await choosePdf(firstSection, 'Replace', pdf('Tailored.pdf'));
  const { dialog: applicationDialog } = await openPreview(firstSection, 'Tailored.pdf');
  await applicationDialog.getByRole('button',{name:'Close preview'}).press('Escape');
  await expect(applicationDialog).toBeHidden();
  await page.getByLabel('Why would you like to join?').fill('I want to build with a team.');
  await page.getByLabel('Web development',{exact:true}).check();
  await page.getByLabel('Agreement: I will attend team meetings.').check();
  await page.getByRole('button',{name:'Submit application'}).click();
  await page.getByRole('button',{name:'Yes, submit application'}).click();
  await expect(page).toHaveURL(/\/dashboard\/applications\?submitted=/);

  await page.goto('/dashboard/profile');
  await expect(profilePreview).toBeVisible();
  await profileResume.getByRole('button',{name:'Remove resume',exact:true}).click();
  await expect(profilePreview).toHaveCount(0);
  await page.goto('/apply/sprint-mentee');
  const { dialog: submittedDialog, previewUrl: attachmentUrl } = await openPreview(page.locator('main'), 'Tailored.pdf');
  await submittedDialog.getByRole('button',{name:'Close preview'}).click();
  expect((await request.get(attachmentUrl,{maxRedirects:0})).status()).toBe(401);

  await context.clearCookies();
  await login(page,'reviewer','/admin/applications');
  await page.getByRole('button',{name:'Review',exact:true}).first().click();
  const review = page.getByRole('dialog',{name:'Application review'});
  const resume = review.getByRole('button',{name:'Tailored.pdf',exact:true});
  await resume.click();
  const previewPane = review.getByRole('region',{name:'Resume preview'});
  await expect(previewPane.getByTitle('Resume PDF')).toHaveAttribute('src', /^blob:/);
  if (!test.info().project.name.includes('mobile')) {
    const pdfBounds = await previewPane.boundingBox();
    const reviewBounds = await review.locator('.admin-review-pane').boundingBox();
    expect(pdfBounds!.x + pdfBounds!.width).toBeLessThanOrEqual(reviewBounds!.x + 1);
  }
  await previewPane.getByRole('button',{name:'Close preview'}).click();
  await expect(previewPane).toBeHidden();
  await expect(resume).toBeFocused();
  expect((await context.request.get(defaultUrl,{maxRedirects:0})).status()).toBe(404);
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
  await expect(page.getByRole('region',{name:'Application summary'}).locator('strong').first()).toHaveText('27');
  await expect(page.getByText('Page 1 of 2',{exact:false})).toBeVisible();
  await expect(page.getByRole('row')).toHaveCount(26);
  await page.getByRole('link',{name:/Next/}).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByRole('row')).toHaveCount(3);
  await expect(page.getByRole('region',{name:'Application summary'}).locator('strong').first()).toHaveText('27');
  await page.getByRole('textbox',{name:/search/i}).fill('Applicant 27');
  await page.getByRole('button',{name:'Apply filters'}).click();
  await expect(page.getByRole('row')).toHaveCount(2);
  await expect(page.getByRole('region',{name:'Application summary'}).locator('strong').first()).toHaveText('1');
  await expect(page.getByRole('cell',{name:'Browser Applicant 27',exact:false})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test('portal summary totals follow combined filters and clearing restores all results', async ({page,request}) => {
  await request.post(`${backend}/__reset`,{data:{staffSummary:true}});
  await login(page,'reviewer','/admin/applications');
  const totals=page.getByRole('region',{name:'Application summary'}).locator('strong');
  await expect(totals).toHaveText(['27','9','9','9']);
  await page.getByRole('combobox',{name:'Position',exact:true}).selectOption('sprint-mentee');
  await page.getByRole('button',{name:'Apply filters'}).click();
  await expect(totals).toHaveText(['14','5','5','4']);
  await page.getByRole('combobox',{name:'Decision',exact:true}).selectOption('accepted');
  await page.getByRole('button',{name:'Apply filters'}).click();
  await expect(totals).toHaveText(['5','0','5','0']);
  await page.getByRole('textbox',{name:/search/i}).fill('Applicant 1');
  await page.getByRole('button',{name:'Apply filters'}).click();
  await expect(totals).toHaveText(['3','0','3','0']);
  await expect(page.getByRole('row')).toHaveCount(4);
  await page.screenshot({path:test.info().outputPath('filtered-summary.png')});
  await page.getByRole('textbox',{name:/search/i}).fill('no matching applicant');
  await page.getByRole('button',{name:'Apply filters'}).click();
  await expect(totals).toHaveText(['0','0','0','0']);
  await page.getByRole('link',{name:'Clear',exact:true}).click();
  await expect(totals).toHaveText(['27','9','9','9']);
});

test('clearing a staged decision refreshes the staged-filter totals', async ({page,request}) => {
  await request.post(`${backend}/__reset`,{data:{submitted:true,events:[{id:1,application_id:1,event_type:'decision_staged',details:{decision:'accepted'},created_at:'2026-01-02T00:00:00Z'}]}});
  await login(page,'admin','/admin/applications');
  await page.goto('/admin/applications?position=sprint-mentee&decision=staged');
  const totals=page.getByRole('region',{name:'Application summary'}).locator('strong');
  await expect(totals).toHaveText(['1','1','0','0']);
  await page.getByRole('button',{name:'Review',exact:true}).click();
  const review=page.getByRole('dialog',{name:'Application review'});
  await review.getByRole('button',{name:'Clear staged selection',exact:true}).click();
  await expect(review.getByRole('button',{name:'Stage acceptance',exact:true})).toBeEnabled();
  await review.getByRole('button',{name:'Close application review'}).click();
  await expect(totals).toHaveText(['0','0','0','0']);
});

test('expired recovery links lead back to requesting a new link', async ({page}) => {
  await page.goto('/auth/callback?token_hash=expired-fixture&type=recovery&next=/reset-password');
  await page.getByRole('button',{name:'Continue to reset password',exact:true}).click();
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
  const activity = review.getByRole('listitem').filter({hasText:'Acceptance staged'});
  await expect(activity.getByText('Browser admin',{exact:true})).toBeVisible();
  await page.reload();
  await expect(activity.getByText('Browser admin',{exact:true})).toBeVisible();
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

test('unsaved answers warn on navigation; cancelling keeps edits; manual save clears the warning', async ({page,request}) => {
  await login(page,'member','/apply/sprint-mentee');
  const answer = page.getByLabel('Why would you like to join?');
  await answer.fill('Unsaved answer');
  const untouched = await (await request.get(`${backend}/__state`)).json();
  expect(untouched.applications).toEqual([]);
  page.once('dialog', async dialog => {
    expect(dialog.type()).toBe('confirm');
    expect(dialog.message()).toContain('unsaved changes');
    await dialog.dismiss();
  });
  await page.getByRole('link',{name:'All applications'}).click();
  await expect(page).toHaveURL(/\/apply\/sprint-mentee$/);
  await expect(answer).toHaveValue('Unsaved answer');
  // Returning to the saved value is clean, including checkbox selections.
  await answer.fill('');
  await page.getByLabel('Web development',{exact:true}).check();
  await page.getByLabel('Web development',{exact:true}).uncheck();
  page.once('dialog', async dialog => { await dialog.dismiss(); throw new Error('Reverted answers must not warn'); });
  await page.getByRole('link',{name:'All applications'}).click();
  await expect(page).toHaveURL(/\/apply$/);
  page.removeAllListeners('dialog');
  await page.locator('.application-position-action').click();
  await answer.fill('Saved answer');
  await page.getByRole('button',{name:'Save draft',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Draft saved');
  await answer.fill('Saved again');
  await page.getByRole('button',{name:'Save draft',exact:true}).click();
  await expect(answer).toHaveValue('Saved again');
  await expect(page.getByRole('button',{name:'Save draft',exact:true})).toBeEnabled();
  page.once('dialog', async dialog => { await dialog.dismiss(); throw new Error('Saved answers must not warn'); });
  await page.getByRole('link',{name:'All applications'}).click();
  await expect(page).toHaveURL(/\/apply$/);
  page.removeAllListeners('dialog');
});

test('failed manual saves keep unsaved warnings and accepting leave discards edits', async ({page,request}) => {
  await request.post(`${backend}/__reset`,{data:{failApplicationSave:true}});
  await login(page,'member','/apply/sprint-mentee');
  await page.getByLabel('Why would you like to join?').fill('Keep after failure');
  await page.getByRole('button',{name:'Save draft',exact:true}).click();
  await expect(page.locator('main').getByRole('alert')).toContainText('We could not save');
  await expect(page.getByLabel('Why would you like to join?')).toHaveValue('Keep after failure');
  page.once('dialog', async dialog => { expect(dialog.type()).toBe('confirm'); await dialog.accept(); });
  await page.getByRole('link',{name:'All applications'}).click();
  await expect(page).toHaveURL(/\/apply$/);
});

test('unsaved answers warn on reload and closing the tab', async ({page}) => {
  await login(page,'member','/apply/sprint-mentee');
  await page.getByLabel('Why would you like to join?').fill('Keep this draft');
  const reloadDialog = page.waitForEvent('dialog');
  const reload = page.evaluate(() => window.location.reload());
  const dialog = await reloadDialog;
  expect(dialog.type()).toBe('beforeunload');
  await dialog.dismiss();
  await reload;
  await expect(page.getByLabel('Why would you like to join?')).toHaveValue('Keep this draft');
  const closeDialog = page.waitForEvent('dialog');
  await page.close({runBeforeUnload:true});
  const closing = await closeDialog;
  expect(closing.type()).toBe('beforeunload');
  await closing.dismiss();
  expect(page.isClosed()).toBe(false);
});

test('unsaved answers warn on browser Back without adding history entries', async ({page}) => {
  await login(page,'member','/apply');
  await page.locator('.application-position-action').click();
  await page.getByLabel('Why would you like to join?').fill('Unsaved back navigation');
  const cancelled = page.waitForEvent('dialog');
  const back = page.evaluate(() => window.history.back());
  await (await cancelled).dismiss();
  await back;
  await expect(page).toHaveURL(/\/apply\/sprint-mentee$/);
  page.once('dialog', async dialog => { await dialog.accept(); });
  await page.goBack();
  await expect(page).toHaveURL(/\/apply$/);
});

test('saving after logout in another tab redirects to login and returns to the application', async ({page,context}) => {
  await login(page,'member','/apply/sprint-mentee');
  const other = await context.newPage();
  await other.goto('/dashboard');
  await other.getByRole('button',{name:'Log out'}).click();
  await expect(other).toHaveURL('http://localhost:3100/');
  await page.getByLabel('Why would you like to join?').fill('An edit after logout');
  await page.getByRole('button',{name:'Save draft',exact:true}).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fapply%2Fsprint-mentee/);
  await expect(page.locator('main').getByRole('alert')).toHaveCount(0);
  await page.getByLabel('Email',{exact:true}).fill('member@utdallas.edu');
  await page.getByLabel('Password',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Log in',exact:true}).click();
  await expect(page).toHaveURL(/\/apply\/sprint-mentee$/);
  await expect(page.getByLabel('Why would you like to join?')).toHaveValue('');
  await other.close();
});

test('password recovery retains the requested application through links, reset, and login', async ({page,request}) => {
  const destination = '/apply/sprint-mentee';
  await page.goto(`/login?next=${encodeURIComponent(destination)}`);
  await page.getByRole('link',{name:'Forgot password?'}).click();
  await page.getByRole('link',{name:'Return to log in'}).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fapply%2Fsprint-mentee$/);
  await page.getByRole('link',{name:'Forgot password?'}).click();
  await page.getByLabel('UT Dallas email',{exact:true}).fill('member@utdallas.edu');
  await page.getByRole('button',{name:'Send reset link'}).click();
  await expect(page.getByRole('status')).toContainText('a reset link is on its way');
  const state = await (await request.get(`${backend}/__state`)).json();
  expect(state.resetNext).toBe(destination);
  await page.goto(`/auth/callback?token_hash=browser-recovery&type=recovery&returnTo=${encodeURIComponent(destination)}`);
  await page.getByRole('button',{name:'Continue to reset password',exact:true}).click();
  await expect(page).toHaveURL(/\/reset-password\?next=%2Fapply%2Fsprint-mentee$/);
  await passwordFields(page,'RecoveredBrowser123!');
  await page.getByRole('button',{name:'Update password'}).click();
  await expect(page).toHaveURL(/\/login\?password=updated&next=%2Fapply%2Fsprint-mentee$/);
  await page.getByLabel('Email',{exact:true}).fill('member@utdallas.edu');
  await page.getByLabel('Password',{exact:true}).fill('RecoveredBrowser123!');
  await page.getByRole('button',{name:'Log in',exact:true}).click();
  await expect(page).toHaveURL(/\/apply\/sprint-mentee$/);
});

test('returning to an application tab after logout redirects without an unsaved warning', async ({page,context}) => {
  await login(page,'member','/apply/sprint-mentee');
  await page.getByLabel('Why would you like to join?').fill('An unsaved answer');
  await context.clearCookies();
  // Focus is the browser event the guard listens for when revisiting a tab.
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page).toHaveURL(/\/login\?next=%2Fapply%2Fsprint-mentee$/);
  await expect(page.locator('main').getByRole('alert')).toHaveCount(0);
});

test('expired staff review requests return through login with the selected application', async ({page,context}) => {
  await login(page,'admin','/admin/applications');
  await context.clearCookies();
  await page.getByRole('button',{name:'Review',exact:true}).first().click();
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Fapplications%3Fapplication%3D1$/);
  await expect(page.locator('main').getByRole('alert')).toHaveCount(0);
});

test('expired offer responses redirect through login instead of showing a session error', async ({page,request,context}) => {
  await request.post(`${backend}/__reset`,{data:{offer:true}});
  await login(page,'member','/dashboard/applications');
  await page.getByRole('button',{name:'Respond to offer'}).click();
  await page.getByRole('button',{name:'Yes, confirm my spot'}).click();
  await page.getByRole('dialog').getByRole('checkbox').check();
  await context.clearCookies();
  await page.getByRole('button',{name:'Confirm my spot',exact:true}).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard%2Fapplications$/);
  await expect(page.locator('main').getByRole('alert')).toHaveCount(0);
});

test('administrator reopening uses the scoped action and the applicant can resubmit', async ({page,request}) => {
  await request.post(`${backend}/__reset`,{data:{submitted:true}});
  await login(page,'admin','/admin/applications');
  await page.getByRole('button',{name:'Review',exact:true}).first().click();
  const review=page.getByRole('dialog',{name:'Application review'});
  await review.getByText('Application corrections',{exact:true}).click();
  await review.getByRole('button',{name:'Reopen application',exact:true}).click();
  const confirmation=page.getByRole('dialog',{name:/Reopen .*application/});
  await expect(confirmation.getByRole('button',{name:'Reopen application',exact:true})).toBeDisabled();
  await confirmation.getByLabel('Reason for reopening').fill('   ');
  await expect(confirmation.getByRole('button',{name:'Reopen application',exact:true})).toBeDisabled();
  await expect(confirmation).toContainText('Emails already sent cannot be recalled');
  const reason='Please clarify your project experience.\nInclude your role on the team.';
  await confirmation.getByLabel('Reason for reopening').fill(reason);
  await page.screenshot({path:test.info().outputPath('reopen-confirmation.png')});
  await confirmation.getByRole('button',{name:'Reopen application',exact:true}).click();
  await expect(page).toHaveURL(/message=reopened/);
  const state=await (await request.get(`${backend}/__state`)).json();
  expect(state.applications[0].submission_state).toBe('draft');
  expect(state.applications[0].reopen_reason).toBe(reason);
  expect(state.events[0].details.reason).toBe(reason);
  await page.goto('/dashboard');
  await page.getByRole('button',{name:'Log out'}).click();
  await expect(page).toHaveURL('http://localhost:3100/');
  await login(page,'member','/dashboard/applications');
  await expect(page.locator('.application-reopening-notice')).toContainText(reason);
  await page.getByRole('link',{name:'Continue application'}).click();
  await expect(page.locator('.application-reopening-notice')).toContainText(reason);
  await page.getByLabel('Why would you like to join?').fill('A corrected application.');
  await page.getByRole('button',{name:'Submit application'}).click();
  await page.getByRole('button',{name:'Yes, submit application'}).click();
  await expect(page).toHaveURL(/\/dashboard\/applications\?submitted=/);
  await expect(page.locator('.application-reopening-notice')).toHaveCount(0);
  await page.goto('/dashboard');
  await page.getByRole('button',{name:'Log out'}).click();
  await expect(page).toHaveURL('http://localhost:3100/');
  await login(page,'admin','/admin/applications');
  await page.getByRole('button',{name:'Review',exact:true}).first().click();
  await expect(page.locator('.admin-reopen-reason')).toContainText(reason);
});

test('failed reopening keeps the reason and allows retry or cancellation', async ({page,request}) => {
  await request.post(`${backend}/__reset`,{data:{submitted:true,failReopen:true}});
  await login(page,'admin','/admin/applications');
  await page.getByRole('button',{name:'Review',exact:true}).first().click();
  const review=page.getByRole('dialog',{name:'Application review'});
  await review.getByText('Application corrections',{exact:true}).click();
  await review.getByRole('button',{name:'Reopen application',exact:true}).click();
  const confirmation=page.getByRole('dialog',{name:/Reopen .*application/});
  await confirmation.getByLabel('Reason for reopening').fill('Please add your availability.');
  await confirmation.getByRole('button',{name:'Reopen application',exact:true}).click();
  await expect(confirmation.getByRole('alert')).toContainText('could not be reopened');
  await expect(confirmation.getByLabel('Reason for reopening')).toHaveValue('Please add your availability.');
  expect((await (await request.get(`${backend}/__state`)).json()).applications[0].submission_state).toBe('submitted');
  await confirmation.getByRole('button',{name:'Cancel',exact:true}).click();
  await expect(confirmation).not.toBeVisible();
  await review.getByRole('button',{name:'Reopen application',exact:true}).click();
  await expect(confirmation.getByLabel('Reason for reopening')).toHaveValue('Please add your availability.');
  await request.post(`${backend}/__reset`,{data:{submitted:true}});
  await confirmation.getByRole('button',{name:'Reopen application',exact:true}).click();
  await expect(page).toHaveURL(/message=reopened/);
});

test('recovery link previews do not consume tokens; explicit confirmation is single use', async ({page,request}) => {
  await page.goto('/auth/callback?token_hash=browser-recovery&type=recovery&returnTo=%2Fapply%2Fsprint-mentee');
  await expect(page.getByRole('button',{name:'Continue to reset password',exact:true})).toBeVisible();
  expect((await (await request.get(`${backend}/__state`)).json()).recoveryVerifications ?? 0).toBe(0);
  await page.reload();
  expect((await (await request.get(`${backend}/__state`)).json()).recoveryVerifications ?? 0).toBe(0);
  await page.getByRole('button',{name:'Continue to reset password',exact:true}).click();
  await expect(page).toHaveURL(/\/reset-password\?next=%2Fapply%2Fsprint-mentee$/);
  expect((await (await request.get(`${backend}/__state`)).json()).recoveryVerifications).toBe(1);
  await page.goto('/auth/callback?token_hash=browser-recovery&type=recovery&returnTo=%2Fapply%2Fsprint-mentee');
  await page.getByRole('button',{name:'Continue to reset password',exact:true}).click();
  await expect(page).toHaveURL(/\/login\?forgot=1&error=recovery&next=%2Fapply%2Fsprint-mentee$/);
});

for(const scenario of [
  {name:'public applications',path:'/apply',table:'application_openings',label:'Loading applications…'},
  {name:'dashboard layout',path:'/dashboard',table:'profiles',label:'Loading page…'},
  {name:'dashboard applications',path:'/dashboard/applications',table:'applications',label:'Loading your dashboard…'},
  {name:'staff portal',path:'/admin/applications',table:'rpc/get_staff_application_page',label:'Loading the application portal…'},
]) {
  test(`loading screen: ${scenario.name} announces the wait and completes`, async ({page,request}) => {
    await login(page,scenario.path.startsWith('/admin')?'admin':'member');
    await request.post(`${backend}/__reset`,{data:{holdTables:[scenario.table]}});
    try {
      await page.goto(scenario.path,{waitUntil:'commit'});
      await expect(page.getByRole('heading',{name:scenario.label,exact:true})).toBeVisible();
      await expect(page.getByRole('status')).toHaveAttribute('aria-busy','true');
      await expect(page.getByRole('status')).toContainText('Please wait a moment.');
      if(scenario.name==='dashboard applications') await expect(page.getByRole('navigation',{name:'Applicant dashboard'})).toBeVisible();
      await page.screenshot({path:test.info().outputPath('loading-screen.png')});
    } finally {
      await request.post(`${backend}/__release`,{data:{}});
    }
    await expect(page.getByRole('heading',{name:scenario.label,exact:true})).toHaveCount(0);
    await expect(page.locator('main').getByRole('heading',{level:1})).toBeVisible();
  });
}

for(const scenario of [
  {name:'root layout child',path:'/dashboard',flag:'unexpectedLayout'},
  {name:'dashboard',path:'/dashboard/applications',flag:'unexpectedDashboardPage'},
  {name:'staff portal',path:'/admin/applications',flag:'unexpectedStaffPage'},
]) {
  test(`unexpected-error screen: ${scenario.name} hides details and retries the page`, async ({page,request}) => {
    await login(page,scenario.path.startsWith('/admin')?'admin':'member');
    expectedRenderErrors.add(page);
    await request.post(`${backend}/__reset`,{data:{[scenario.flag]:true}});
    await page.goto(scenario.path);
    await expect(page.getByRole('heading',{name:'This page couldn’t load.',exact:true})).toBeVisible();
    await expect(page.locator('main').getByRole('alert')).toContainText('Please try again.');
    await expect(page.locator('body')).not.toContainText('TypeError');
    await expect(page.locator('body')).not.toContainText('Do not display this fixture');
    await page.screenshot({path:test.info().outputPath('unexpected-error.png')});
    await request.post(`${backend}/__reset`,{data:{}});
    await page.getByRole('button',{name:'Try again',exact:true}).click();
    await expect(page.getByRole('heading',{name:'This page couldn’t load.',exact:true})).toHaveCount(0);
    await expect(page.locator('main').getByRole('heading',{level:1})).toBeVisible();
  });
}

test('missing pages and expected data failures keep their distinct recovery screens', async ({page,request}) => {
  await page.goto('/this-page-does-not-exist');
  await expect(page.getByRole('heading',{name:'We can’t find that page.',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'This page couldn’t load.',exact:true})).toHaveCount(0);
  await login(page);
  await request.post(`${backend}/__reset`,{data:{failApplicationsRead:true}});
  await page.goto('/dashboard/applications');
  await expect(page.getByRole('heading',{name:'We couldn’t load your applications.',exact:true})).toBeVisible();
  await expect(page.locator('body')).not.toContainText('Private fixture details');
  await expect(page.getByRole('heading',{name:'This page couldn’t load.',exact:true})).toHaveCount(0);
  await request.post(`${backend}/__reset`,{data:{}});
  await page.getByRole('link',{name:'Try again'}).click();
  await expect(page.getByRole('heading',{name:'Applications',exact:true})).toBeVisible();
});

test('a slow loading page can be left without waiting for its response', async ({page,request}) => {
  await request.post(`${backend}/__reset`,{data:{holdTables:['application_openings']}});
  try {
    await page.goto('/apply',{waitUntil:'commit'});
    await expect(page.getByRole('heading',{name:'Loading applications…',exact:true})).toBeVisible();
    await page.getByRole('link',{name:'GDG on Campus UTD home',exact:true}).click();
    await expect(page).toHaveURL('http://localhost:3100/');
    await expect(page.locator('main').getByRole('heading',{level:1})).toBeVisible();
  } finally {
    await request.post(`${backend}/__release`,{data:{}});
  }
});


test('email health is admin only and consolidates provider and queue reporting', async ({page,request}) => {
  await login(page, 'admin', '/admin/email-health');
  await expect(page.getByRole('heading', {name:'Email health',exact:true})).toBeVisible();
  await expect(page.getByRole('heading', {name:'Sending capacity'})).toBeVisible();
  await expect(page.getByRole('progressbar', {name:'Daily email allowance used'})).toHaveAttribute('value','50');
  await expect(page.getByRole('progressbar', {name:'Daily email allowance used'})).toHaveAttribute('max','300');
  await expect(page.locator('.email-usage-remaining')).toContainText('250');
  const beforeRefresh = (await (await request.get(`${backend}/__state`)).json()).healthReads;
  await page.getByRole('button', {name:'Refresh overview'}).click();
  await expect.poll(async () => (await (await request.get(`${backend}/__state`)).json()).healthReads).toBeGreaterThan(beforeRefresh);
  await expect(page.locator('.email-metric').filter({hasText:'Bounce rate'})).toContainText('2.5%');
  await expect(page.getByRole('heading', {name:'Application email queue',exact:true})).toHaveCount(0);
  await expect(page.getByText('Brevo metrics cover all transactional email', {exact:false})).toHaveCount(0);
  await page.getByRole('button', {name:'Delivery',exact:true}).click();
  await expect(page.getByRole('heading', {name:'Delivery overview'})).toBeVisible();
  await request.post(`${backend}/__reset`, {data:{emailHealthDelayMs:1000}});
  await page.getByRole('button', {name:'Last 30 days'}).click();
  await expect(page.getByRole('status').filter({hasText:'Loading 30-day email report'})).toBeVisible();
  await expect(page.getByText('Last 30 days · Brevo')).toBeVisible();
  await expect(page.getByRole('button', {name:'Delivery',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button', {name:'Application queue',exact:true}).click();
  await expect(page.getByText('Delivery unknown', {exact:true}).first()).toBeVisible();
  await page.getByText('Recent application emails · latest 50 in the last 30 days').click();
  await expect(page.locator('details table')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.getByRole('button', {name:'Activity',exact:true}).click();
  await expect(page.getByRole('heading', {name:'Sending activity'})).toBeVisible();
  await page.getByRole('button', {name:'Contacts & senders',exact:true}).click();
  await expect(page.getByRole('heading', {name:'Sender status'})).toBeVisible();
  await page.getByRole('button', {name:'Overview',exact:true}).click();
  await page.screenshot({path:`test-results/email-health-${test.info().project.name}.png`,fullPage:true});
});

test('email health excludes reviewers and handles an unavailable reporting service', async ({page,request}) => {
  await login(page, 'reviewer', '/admin/applications');
  await page.goto('/admin/email-health');
  await expect(page).toHaveURL(/admin\/applications\?message=admin-required/);
  await page.context().clearCookies();
  await request.post(`${backend}/__reset`, {data:{failEmailHealth:true}});
  await login(page, 'admin', '/admin/email-health');
  await expect(page.getByRole('heading', {name:'Reporting unavailable'})).toBeVisible();
});

test('portal sidebar owns email navigation and collapses across portal pages', async ({page,isMobile}) => {
  await login(page, 'admin', '/dashboard');
  await expect(page.getByRole('link', {name:'Email health',exact:true})).toHaveCount(0);
  await page.locator('a:visible').filter({hasText:'Application portal'}).click();
  const sidebar = page.getByRole('navigation', {name:'Portal navigation'});
  await expect(sidebar.getByRole('link', {name:'Applications',exact:true})).toHaveAttribute('aria-current','page');
  await page.getByRole('button', {name:'Collapse sidebar'}).click();
  await expect(page.getByRole('button', {name:'Expand sidebar'})).toHaveAttribute('aria-expanded','false');
  if(isMobile) {
    await expect(sidebar).toBeHidden();
    await page.getByRole('button', {name:'Expand sidebar'}).click();
  }
  await sidebar.getByRole('link', {name:'Email health',exact:true}).click();
  await expect(page.getByRole('heading', {name:'Email health',exact:true})).toBeVisible();
  await expect(sidebar.getByRole('link', {name:'Email health',exact:true})).toHaveAttribute('aria-current','page');
  if(!isMobile) {
    await expect(page.getByRole('button', {name:'Expand sidebar'})).toBeVisible();
    await page.getByRole('button', {name:'Expand sidebar'}).click();
  }
  await sidebar.getByRole('link', {name:'Applications',exact:true}).click();
  await expect(page.getByRole('heading', {name:'Applications',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({path:`test-results/portal-sidebar-${test.info().project.name}.png`,fullPage:true});
});

test('staff access grants, changes, removes and restores roles with confirmation', async ({page}) => {
  await login(page,'admin','/admin/staff-access');
  await expect(page.getByRole('heading',{name:'Staff access',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Add staff',exact:true}).click();
  await expect(page.locator('dialog[open]').getByLabel('Access level',{exact:true})).toHaveValue('reviewer');
  await page.getByLabel('Account email',{exact:true}).fill('member@utdallas.edu');
  await page.getByRole('button',{name:'Review access',exact:true}).click();
  await expect(page.locator('dialog[open]')).toContainText('member@utdallas.edu');
  await page.getByRole('button',{name:'Confirm access',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Reviewer access saved');
  const member=page.locator('.staff-members li').filter({hasText:'member@utdallas.edu'});
  await expect(member).toContainText('Reviewer');
  await member.getByRole('button',{name:'Change access',exact:true}).click();
  await expect(page.getByRole('button',{name:'Confirm access',exact:true})).toBeDisabled();
  await expect(page.locator('dialog[open]').getByLabel('Access level',{exact:true})).toHaveValue('reviewer');
  await page.locator('dialog[open]').getByLabel('Access level',{exact:true}).selectOption('admin');
  await page.getByRole('button',{name:'Confirm access',exact:true}).click();
  await expect(member).toContainText('Administrator');
  await member.getByRole('button',{name:'Remove access'}).click();
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await expect(member).toBeVisible();
  await member.getByRole('button',{name:'Remove access'}).click();
  await page.getByRole('button',{name:'Confirm removal'}).click();
  await expect(member).toHaveCount(0);
  await page.getByRole('button',{name:'Show removed staff'}).click();
  await member.getByRole('button',{name:'Restore as reviewer'}).click();
  await page.getByRole('button',{name:'Confirm access',exact:true}).click();
  await page.getByRole('button',{name:'Show current staff'}).click();
  await expect(member).toContainText('Reviewer');
  await expect(page.locator('.staff-history li')).toHaveCount(4);
  const self=page.locator('.staff-members li').filter({hasText:'admin@utdallas.edu'});
  await expect(self.getByRole('button')).toHaveCount(0);
  await page.getByRole('button',{name:'Add staff',exact:true}).click();
  await page.getByLabel('Account email',{exact:true}).fill('missing@utdallas.edu');
  await page.getByRole('button',{name:'Review access',exact:true}).click();
  await page.getByRole('button',{name:'Confirm access',exact:true}).click();
  await expect(page.locator('dialog[open]').getByRole('alert')).toContainText('No website account found');
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.screenshot({path:`test-results/staff-access-${test.info().project.name}.png`,fullPage:true});
});

test('reviewers cannot open staff access or see its sidebar entry',async({page})=>{
  await login(page,'reviewer','/admin/applications');
  await expect(page.getByRole('navigation',{name:'Portal navigation'}).getByRole('link',{name:'Staff access'})).toHaveCount(0);
  await page.goto('/admin/staff-access');
  await expect(page).toHaveURL(/admin\/applications\?message=admin-required/);
});
