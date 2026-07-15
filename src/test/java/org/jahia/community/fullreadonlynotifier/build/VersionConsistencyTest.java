package org.jahia.community.fullreadonlynotifier.build;

import org.junit.Test;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;

/**
 * Build-verification guard (D7): the module version is declared in three "source of truth"
 * files — {@code pom.xml} (Maven, authoritative), {@code package.json} (frontend build) and
 * {@code AGENTS.md} (AI-assistant key facts). These three values had silently drifted apart
 * (2.0.5 / 2.0.4 / 2.0.3-SNAPSHOT); this test pins them together so any future bump that
 * touches only one file fails loudly instead of drifting again.
 *
 * <p>Surefire runs with the module base directory as the working directory, so the three
 * files are read via relative paths.
 */
public class VersionConsistencyTest {

    private static final Pattern PACKAGE_JSON_VERSION =
            Pattern.compile("\"version\"\\s*:\\s*\"([^\"]+)\"");

    private static final Pattern AGENTS_MD_VERSION =
            Pattern.compile("\\*\\*version\\*\\*:\\s*`([^`]+)`");

    @Test
    public void versionNumber_isIdenticalAcrossPomPackageJsonAndAgentsMd() throws Exception {
        // Arrange — read the three declared versions
        String pomVersion = readPomProjectVersion();
        String packageJsonVersion = readFirstGroup(PACKAGE_JSON_VERSION, "package.json");
        String agentsMdVersion = readFirstGroup(AGENTS_MD_VERSION, "AGENTS.md");

        // Assert — pom.xml is the authoritative value; the other two must match it
        assertEquals("package.json \"version\" must match pom.xml <version>",
                pomVersion, packageJsonVersion);
        assertEquals("AGENTS.md **version** must match pom.xml <version>",
                pomVersion, agentsMdVersion);
    }

    /** Reads the direct {@code <version>} child of {@code <project>} (not the parent's). */
    private static String readPomProjectVersion() throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        // Hardened parser configuration (no external entities needed for pom.xml).
        // The JAXP access properties are best-effort: the old Xerces implementation on the
        // test classpath predates them and throws IllegalArgumentException.
        factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
        try {
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
        } catch (IllegalArgumentException e) {
            // Parser implementation does not know these properties — acceptable for a
            // local, trusted build file.
        }
        Document doc = factory.newDocumentBuilder().parse(new File("pom.xml"));
        Element project = doc.getDocumentElement();
        NodeList children = project.getChildNodes();
        for (int i = 0; i < children.getLength(); i++) {
            Node child = children.item(i);
            if (child.getNodeType() == Node.ELEMENT_NODE && "version".equals(child.getNodeName())) {
                return child.getTextContent().trim();
            }
        }
        throw new AssertionError("pom.xml has no direct <version> element under <project>");
    }

    private static String readFirstGroup(Pattern pattern, String relativePath) throws Exception {
        String content = new String(Files.readAllBytes(Paths.get(relativePath)),
                StandardCharsets.UTF_8);
        Matcher matcher = pattern.matcher(content);
        assertNotNull(relativePath + " must declare a version matching " + pattern,
                matcher.find() ? matcher : null);
        return matcher.group(1).trim();
    }
}
