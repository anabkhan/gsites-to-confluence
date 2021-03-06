# gsite-to-confluence
## Script to migrate pages from Google site to Confluence

## Installation

It requires [Node.js](https://nodejs.org/) v10+ to run.

Install the dependencies and devDependencies and start the server.

```sh
npm i puppeteer --save
```

Install chromium

```sh
sudo add-apt-repository ppa:saiarcot895/chromium-beta
sudo apt-get update
```

## Usage

### Edit gsite-to-confluence.js file and provide following values:

```js
// Replace with Google site homepage
const SITE_HOME = 'https://sites.google.com/view/adnananabgsite/home';
```
```js
// This the html element from home page of google site which is parent of elements which has list of menu heirarchy
const MENU_PARENT_SELECTOR = '.jYxBte.Fpy8Db';
```
![MenuParentExample](readme-images/GSiteMainSelector.png)

```js
// This the html element which has the text content as the title of the menu content
const MENU_SELECTOR = '.aJHbb.hDrhEe.HlqNPb';
```
![MenuParentExample](readme-images/GSiteMenuSelector.png)

### Edit file confluence-utility.js, and change following values

```js
// Change the value to atlassian url
const URL = "https://anabadnan.atlassian.net/wiki/rest/api";
```

```js
// Replace *** with the API token generated from https://id.atlassian.com/manage-profile/security/api-tokens
const API_TOKEN = 'Basic ***';
```

### Run the script

#### Sign in to Google site
```sh
node gsite-to-confluence.js signin
```
This command will open the browser to login to the google site using google account. Once logged in, close the browser

#### Print menu parsed from Google site
```sh
node gsite-to-confluence.js printmenu
```

The script will print the menu heirarchy also , so verify that the menu is properly parsed from the gsite, if its not parsed then check the selectors

#### Migrate single page. To test a single page migration before migrating entire site
```sh
#node gsite-to-confluence.js migratepage <page-title> <page-url> <confluence-api-key> > output.html
node gsite-to-confluence.js migratepage metricspipeline /exotel.in/tech/developer/development-platform/internals/metrics-pipeline nnffd > output.html
```

#### Once the menu printed from previous command is verified then run the migrate command
```sh
node gsite-to-confluence.js migrate
```
