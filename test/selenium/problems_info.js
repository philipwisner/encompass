// REQUIRE MODULES
const {
  Builder
} = require('selenium-webdriver');
const expect = require('chai').expect;

// REQUIRE FILES
const helpers = require('./helpers');
const problem = helpers.newProblem;
const dbSetup = require('../data/restore');
const css = require('./selectors');

const host = helpers.host;
const testUsers = require('./fixtures/users');
const topLink = css.topBar.problems;

describe('Problems New', async function () {
  function runTests(users) {
    function _runTests(user) {
      const {
        accountType,
        actingRole,
        testDescriptionTitle
      } = user;
      const isStudent = accountType === 'S' || actingRole === 'student';
      const isAdmin = accountType === 'A';

      describe(`As ${testDescriptionTitle}`, function () {
        this.timeout(helpers.timeoutTestMsStr);
        let driver = null;

        before(async function () {
          driver = new Builder()
            .forBrowser('chrome')
            .build();
          driver.manage().window().setRect({
            width: 1580,
            height: 1080
          });
          await dbSetup.prepTestDb();
          return helpers.login(driver, host, user);
        });

        after(function () {
          return driver.quit();
        });

        if (!isStudent) {
          describe('Visiting problem info', function () {
            before(async function () {
              await helpers.waitForAndClickElement(driver, topLink);

            });
            describe(`Viewing a problem's info`, function () {
              before(async function () {
                await helpers.waitForAndClickElement(driver, topLink);
                //click first problem name
              });

              it('should open problem new page from topbar', async function () {
                await helpers.waitForSelector(driver, '#problem-new');
                expect(await helpers.findAndGetText(driver, css.problemNew.problemNewHeading)).to.contain('Create New Problem');
              });

              it('should open problem new page from plus icon', async function () {
                await helpers.waitForAndClickElement(driver, '.remove-icon');
                await driver.sleep(800);
                await helpers.waitForAndClickElement(driver, css.problemNew.problemNewBtn);
                expect(await helpers.findAndGetText(driver, css.problemNew.problemNewHeading)).to.contain('Create New Problem');
              });

              it('should show a new problem form with 4 headers', async function () {
                let tabNames = ['general', 'categories', 'additional', 'legal'];
                let selectors = tabNames.map((tab) => {
                  return css.problemNew.menuTab + tab;
                });
                expect(await helpers.checkSelectorsExist(driver, selectors)).to.be.true;
              });

              it('the general page should have four inputs with labels', async function () {
                expect(await helpers.findAndGetText(driver, css.problemNew.inputLabel + 'title', true)).to.contain('problem title');
                expect(await helpers.isElementVisible(driver, css.problemNew.inputTextbox + '#title')).to.be.true;
                expect(await helpers.findAndGetText(driver, css.problemNew.inputLabel + 'statement', true)).to.contain('problem statement');
                expect(await helpers.isElementVisible(driver, css.problemNew.inputQuill + '#editor')).to.be.true;
                expect(await helpers.findAndGetText(driver, css.problemNew.inputLabel + 'author', true)).to.contain('author');
                expect(await helpers.isElementVisible(driver, css.problemNew.inputTextbox + '#author')).to.be.true;
                expect(await helpers.findAndGetText(driver, css.problemNew.inputLabel + 'privacy', true)).to.contain('privacy');
                expect(await helpers.getWebElements(driver, css.problemNew.inputContentBlock + ' ul li')).to.have.lengthOf(3);
              });

              it('should show an error if navigating to next page without filling in required fields', async function () {
                await helpers.waitForAndClickElement(driver, css.problemNew.primaryButton);
                await driver.sleep(800);
                await helpers.waitForTextInDom(driver, css.problemNew.errorMsgGeneral);
                expect(await helpers.findAndGetText(driver, '.error-box')).to.contain(css.problemNew.errorMsgGeneral);
                await helpers.waitForAndClickElement(driver, css.problemNew.errorBoxDismiss);
              });

              it('should show a modal if creating a public problem and go to next page', async function () {
                await helpers.findInputAndType(driver, css.problemNew.inputTextbox + '#title', problem.startTitle);
                await helpers.findInputAndType(driver, css.problemNew.inputQuill + '#editor .ql-editor', problem.text);
                await helpers.findInputAndType(driver, css.problemNew.inputTextbox + '#author', problem.author);
                await helpers.waitForAndClickElement(driver, css.problemNew.privacySetting);
                await helpers.waitForAndClickElement(driver, css.problemNew.primaryButton);
                expect(await helpers.findAndGetText(driver, css.sweetAlert.heading, true)).to.contain('are you sure you want to create a public problem');
                await helpers.waitForAndClickElement(driver, css.sweetAlert.confirmBtn);
                expect(await helpers.findAndGetText(driver, css.problemNew.inputLabel + 'categories', true)).to.contain('problem categories');
              });

            });
          });
        }

      });
    }
    return Promise.all(Object.keys(users).map(user => _runTests(users[user])));
  }
  await runTests(testUsers);
});

//Test following is always visible
  // Privacy Setting with tooltip
  // Close Icon
  // Problem Title
  // Problem Create Date
  // 4 meny headers (change active status) - be able to click any
  // Copy
  // Recommend (not teacher)
  // Edit btn
  // Assign btn

// Test visible for general
  // Problem Statement
  // Problem Status
  // Author (if applicable)
  // Organization (if applicable)
  // Flag reason - Admin

// Test visible for categories
  // Categories
    //If exists, should have url and description
  // Keywords

// Test visible for additional
  // Additional info textarea
  // Additional image (if applicable)
  // Created by as link to user profile
  // Problem origin (if copied)

// Test visible for legal
  // Copyright notice value
  // Sharing Auth value
  // Created by as link to user profile
  // Problem origin (if copied)

  // Test button functions
    // Copy
    // Recommend
    // Assign
    // Edit - new set of tests