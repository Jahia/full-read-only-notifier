package org.jahia.community.fullreadonlynotifier.build;

import org.junit.Assume;
import org.junit.Test;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.File;
import java.io.FilenameFilter;
import java.util.jar.JarFile;
import java.util.jar.Manifest;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

/**
 * Build/packaging verification guard (D6): jsoup MUST ship embedded (bundle-private) inside
 * the module bundle, because Jahia does not export {@code org.jsoup} as an OSGi package.
 *
 * <p>Two layers of protection:
 * <ol>
 *   <li>{@link #pomConfiguration_embedsJsoupAndExcludesItFromImports()} — always runs; parses
 *       {@code pom.xml} and pins the exact configuration triple that makes the embedding work:
 *       jsoup at (default) compile scope, {@code Embed-Dependency=jsoup;inline=true}, and
 *       {@code !org.jsoup.*} leading the {@code Import-Package} instruction. A well-meaning
 *       "cleanup" that switches jsoup to {@code provided} scope would be silently dropped by
 *       Embed-Dependency and break the bundle at runtime — this test catches it at build time.</li>
 *   <li>{@link #builtBundle_containsJsoupClasses_andDoesNotImportOrgJsoup()} — inspects the
 *       actual built artifact when one is present under {@code target/} (i.e. after
 *       {@code mvn package}); skipped via {@link Assume} when no jar has been built yet, so
 *       plain {@code mvn test} stays green.</li>
 * </ol>
 */
public class BundlePackagingTest {

    // ------------------------------------------------------------------
    // Layer 1 — pom.xml configuration (always runs)
    // ------------------------------------------------------------------

    @Test
    public void pomConfiguration_embedsJsoupAndExcludesItFromImports() throws Exception {
        // Arrange
        Document pom = parsePom();

        // Assert — jsoup dependency must NOT be provided-scoped (default compile is required
        // for Embed-Dependency to pick it up)
        Element jsoupDependency = findJsoupDependency(pom);
        assertNotNull("pom.xml must declare the org.jsoup:jsoup dependency", jsoupDependency);
        String scope = childText(jsoupDependency, "scope");
        assertTrue("jsoup must use compile scope (default); 'provided' would be silently "
                        + "excluded from Embed-Dependency and break the bundle at runtime",
                scope == null || scope.isEmpty() || "compile".equals(scope));

        // Assert — maven-bundle-plugin embeds jsoup inline
        String embedDependency = firstTagText(pom, "Embed-Dependency");
        assertNotNull("maven-bundle-plugin must declare an Embed-Dependency instruction",
                embedDependency);
        assertTrue("Embed-Dependency must inline jsoup (found: " + embedDependency + ")",
                embedDependency.contains("jsoup;inline=true"));

        // Assert — org.jsoup is excluded from Import-Package (it is bundle-private, and Jahia
        // does not export it, so importing it would leave the bundle unresolved)
        String importPackage = firstTagText(pom, "Import-Package");
        assertNotNull("maven-bundle-plugin must declare an Import-Package instruction",
                importPackage);
        assertTrue("Import-Package must exclude org.jsoup.* (found: " + importPackage + ")",
                importPackage.contains("!org.jsoup.*"));
    }

    // ------------------------------------------------------------------
    // Layer 2 — built artifact inspection (runs when target/*.jar exists)
    // ------------------------------------------------------------------

    @Test
    public void builtBundle_containsJsoupClasses_andDoesNotImportOrgJsoup() throws Exception {
        // Arrange — locate the built bundle jar; skip (not fail) when the module has not been
        // packaged yet, so this check is meaningful after `mvn package` without breaking
        // plain `mvn test`.
        File bundleJar = findBuiltBundleJar();
        Assume.assumeTrue("No built bundle jar under target/ — run `mvn package` first to "
                + "exercise this packaging check", bundleJar != null);

        try (JarFile jar = new JarFile(bundleJar)) {
            // Assert — jsoup classes are physically embedded in the bundle
            assertNotNull("org/jsoup/Jsoup.class must be embedded in the bundle jar "
                            + bundleJar.getName(),
                    jar.getEntry("org/jsoup/Jsoup.class"));
            assertNotNull("org/jsoup/safety/Safelist.class must be embedded in the bundle jar",
                    jar.getEntry("org/jsoup/safety/Safelist.class"));

            // Assert — the OSGi manifest does not import org.jsoup from the runtime
            Manifest manifest = jar.getManifest();
            assertNotNull("Bundle jar must contain a manifest", manifest);
            String importPackage = manifest.getMainAttributes().getValue("Import-Package");
            assertNotNull("Manifest must declare Import-Package", importPackage);
            assertFalse("Manifest Import-Package must NOT require org.jsoup from the OSGi "
                            + "runtime (Jahia does not export it): " + importPackage,
                    importPackage.contains("org.jsoup"));
        }
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private static Document parsePom() throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
        try {
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
        } catch (IllegalArgumentException e) {
            // Old Xerces on the test classpath does not know these JAXP properties —
            // acceptable for a local, trusted build file.
        }
        return factory.newDocumentBuilder().parse(new File("pom.xml"));
    }

    private static Element findJsoupDependency(Document pom) {
        NodeList dependencies = pom.getElementsByTagName("dependency");
        for (int i = 0; i < dependencies.getLength(); i++) {
            Element dependency = (Element) dependencies.item(i);
            if ("org.jsoup".equals(childText(dependency, "groupId"))
                    && "jsoup".equals(childText(dependency, "artifactId"))) {
                return dependency;
            }
        }
        return null;
    }

    /** Text of the first direct child with the given tag name, or {@code null}. */
    private static String childText(Element parent, String tagName) {
        NodeList children = parent.getChildNodes();
        for (int i = 0; i < children.getLength(); i++) {
            if (children.item(i).getNodeType() == org.w3c.dom.Node.ELEMENT_NODE
                    && tagName.equals(children.item(i).getNodeName())) {
                return children.item(i).getTextContent().trim();
            }
        }
        return null;
    }

    /** Text of the first element with the given tag name anywhere in the document, or null. */
    private static String firstTagText(Document doc, String tagName) {
        NodeList nodes = doc.getElementsByTagName(tagName);
        assertEquals("Expected exactly one <" + tagName + "> element in pom.xml",
                1, nodes.getLength());
        return nodes.getLength() > 0 ? nodes.item(0).getTextContent().trim() : null;
    }

    private static File findBuiltBundleJar() {
        File target = new File("target");
        if (!target.isDirectory()) {
            return null;
        }
        File[] jars = target.listFiles(new FilenameFilter() {
            @Override
            public boolean accept(File dir, String name) {
                return name.startsWith("full-read-only-notifier-") && name.endsWith(".jar")
                        && !name.contains("-sources") && !name.contains("-javadoc");
            }
        });
        return (jars != null && jars.length > 0) ? jars[0] : null;
    }
}
