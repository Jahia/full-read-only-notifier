import './commands';
import addContext from 'mochawesome/addContext';
import {jsErrorsLogger} from '@jahia/cypress';

jsErrorsLogger.enable();
jsErrorsLogger.setAllowedJsWarnings([
    'Unsatisfied version',
    'No satisfying version'
]);

require('cypress-terminal-report/src/installLogsCollector')();
require('@jahia/cypress/dist/support/registerSupport').registerSupport();

Cypress.on('uncaught:exception', () => false);

if (Cypress.browser.family === 'chromium') {
    Cypress.automation('remote:debugger:protocol', {
        command: 'Network.enable',
        params: {}
    });
    Cypress.automation('remote:debugger:protocol', {
        command: 'Network.setCacheDisabled',
        params: {cacheDisabled: true}
    });
}

Cypress.on('test:after:run', (test, runnable) => {
    let videoName = Cypress.spec.relative.replace('/.cy.*', '').replace('cypress/e2e/', '');
    const videoUrl = 'videos/' + videoName + '.mp4';
    addContext({test}, videoUrl);
    if (test.state === 'failed') {
        const screenshot = `screenshots/${Cypress.spec.relative.replace('cypress/e2e/', '')}/${runnable.parent.title} -- ${test.title} (failed).png`;
        addContext({test}, screenshot);
    }
});
