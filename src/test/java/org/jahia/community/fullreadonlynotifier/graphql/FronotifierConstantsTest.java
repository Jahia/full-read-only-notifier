package org.jahia.community.fullreadonlynotifier.graphql;

import org.junit.Test;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertThrows;

/**
 * Unit tests for {@link FronotifierConstants#requireValidSiteKey(String)} — the security
 * boundary that prevents JCR path traversal / injection when a user-supplied siteKey is
 * concatenated into a JCR path.
 */
public class FronotifierConstantsTest {

    @Test
    public void requireValidSiteKey_simpleAlphanumericKey_returnsSameValue() {
        // Arrange
        final String siteKey = "mySite01";

        // Act
        final String result = FronotifierConstants.requireValidSiteKey(siteKey);

        // Assert
        assertEquals(siteKey, result);
    }

    @Test
    public void requireValidSiteKey_keyWithDashAndUnderscore_isAccepted() {
        // Arrange
        final String siteKey = "my-site_01";

        // Act
        final String result = FronotifierConstants.requireValidSiteKey(siteKey);

        // Assert
        assertEquals(siteKey, result);
    }

    @Test
    public void requireValidSiteKey_maxLengthKey_isAccepted() {
        // Arrange — exactly 150 chars (the upper bound)
        final StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 150; i++) {
            sb.append('a');
        }
        final String siteKey = sb.toString();

        // Act
        final String result = FronotifierConstants.requireValidSiteKey(siteKey);

        // Assert
        assertEquals(siteKey, result);
    }

    @Test
    public void requireValidSiteKey_null_throwsIllegalArgument() {
        assertThrows(IllegalArgumentException.class,
                () -> FronotifierConstants.requireValidSiteKey(null));
    }

    @Test
    public void requireValidSiteKey_empty_throwsIllegalArgument() {
        assertThrows(IllegalArgumentException.class,
                () -> FronotifierConstants.requireValidSiteKey(""));
    }

    @Test
    public void requireValidSiteKey_parentTraversalSequence_throwsIllegalArgument() {
        assertThrows(IllegalArgumentException.class,
                () -> FronotifierConstants.requireValidSiteKey("../../etc"));
    }

    @Test
    public void requireValidSiteKey_forwardSlash_throwsIllegalArgument() {
        assertThrows(IllegalArgumentException.class,
                () -> FronotifierConstants.requireValidSiteKey("sites/other"));
    }

    @Test
    public void requireValidSiteKey_jcrMetaCharacters_throwsIllegalArgument() {
        assertThrows(IllegalArgumentException.class,
                () -> FronotifierConstants.requireValidSiteKey("site[1]"));
    }

    @Test
    public void requireValidSiteKey_whitespace_throwsIllegalArgument() {
        assertThrows(IllegalArgumentException.class,
                () -> FronotifierConstants.requireValidSiteKey("my site"));
    }

    @Test
    public void requireValidSiteKey_newlineInjection_throwsIllegalArgument() {
        assertThrows(IllegalArgumentException.class,
                () -> FronotifierConstants.requireValidSiteKey("site\nkey"));
    }

    @Test
    public void requireValidSiteKey_exceedsMaxLength_throwsIllegalArgument() {
        // Arrange — 151 chars (one over the upper bound)
        final StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 151; i++) {
            sb.append('a');
        }

        // Act + Assert
        assertThrows(IllegalArgumentException.class,
                () -> FronotifierConstants.requireValidSiteKey(sb.toString()));
    }
}
