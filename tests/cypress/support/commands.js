Cypress.Commands.add('logAllCookies', () => {
    cy.getCookies().then(cookies => {
        cookies.forEach(cookie => cy.log(`Cookie: ${cookie.name} = ${cookie.value}`));
    });
});

Cypress.Commands.add('logCookie', cookieName => {
    cy.getCookie(cookieName).then(cookie => {
        cy.log(`Cookie ${cookieName}: ${cookie ? cookie.value : 'not found'}`);
    });
});

Cypress.Commands.add('clearCookiesByType', (type = 'session') => {
    cy.getCookies().then(cookies => {
        cookies
            .filter(c => (type === 'session' ? !c.expiry : !!c.expiry))
            .forEach(c => cy.clearCookie(c.name));
    });
});
