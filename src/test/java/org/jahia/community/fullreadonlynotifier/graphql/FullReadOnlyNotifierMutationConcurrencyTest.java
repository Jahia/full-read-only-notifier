package org.jahia.community.fullreadonlynotifier.graphql;

import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.JCRSessionWrapper;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.junit.Assert.assertTrue;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * U3 — CHARACTERIZATION TEST for a KNOWN, CURRENTLY-UNFIXED race condition in
 * {@link FullReadOnlyNotifierMutation#writeSettings}.
 *
 * <p><strong>This test documents CURRENT (buggy) behavior — it is NOT the desired
 * contract.</strong> The {@code hasNode("fronotifier") → addNode → setProperty → save()}
 * sequence runs with no synchronization, no JCR locking, and no unique-constraint recovery.
 * Two concurrent first-writes for the same site can therefore both observe
 * {@code hasNode() == false} and both call {@code addNode(...)} — on a real repository this
 * means either a duplicate {@code fronotifier} node (same-name sibling) or an
 * {@code ItemExistsException} at {@code save()}, depending on node-type constraints.
 *
 * <p><strong>Stage 7 handoff:</strong> when the race is actually fixed (e.g. by
 * synchronizing node creation per site, using {@code JCRTemplate} locking, or catching the
 * concurrent-create conflict and re-reading the winner's node), this test MUST be inverted:
 * assert {@code addNode} is invoked exactly {@code times(1)} across both threads and the
 * losing thread still completes successfully against the winner's node. Do not delete it —
 * repoint it at the fixed contract.
 *
 * <p>Determinism note: a {@link CyclicBarrier} inside the {@code hasNode} stub forces BOTH
 * threads to complete the "check" step before EITHER proceeds to the "act" step
 * ({@code addNode}), so the interleaving this test pins is reproduced on every run rather
 * than left to scheduler luck. The assertion is on the {@code addNode} invocation count
 * only (not on ordering), per the Stage 4 flakiness guidance.
 */
@RunWith(MockitoJUnitRunner.class)
public class FullReadOnlyNotifierMutationConcurrencyTest {

    private static final String SITE_KEY = "testSite";
    private static final String SITE_PATH = FronotifierConstants.SITES_ROOT + SITE_KEY;
    private static final int THREADS = 2;
    private static final long TEST_TIMEOUT_SECONDS = 30;

    @Mock
    private JCRSessionWrapper session;

    @Mock
    private JCRNodeWrapper siteNode;

    @Mock
    private JCRNodeWrapper froNode;

    @Test
    public void writeSettings_concurrentFirstWrites_bothThreadsCreateTheNode_documentsUnsynchronizedRace()
            throws Exception {
        // Arrange — both threads target the same site whose fronotifier node does not exist
        // yet. The barrier inside the hasNode stub guarantees both threads observe
        // hasNode == false before either one reaches addNode.
        final CyclicBarrier bothThreadsSawNodeAbsent = new CyclicBarrier(THREADS);
        when(session.getNode(SITE_PATH)).thenReturn(siteNode);
        when(siteNode.hasNode(FronotifierConstants.FRONOTIFIER)).thenAnswer(invocation -> {
            bothThreadsSawNodeAbsent.await(TEST_TIMEOUT_SECONDS, TimeUnit.SECONDS);
            return false;
        });
        when(siteNode.addNode(FronotifierConstants.FRONOTIFIER,
                FronotifierConstants.FRONOTIFIER_NODE_TYPE)).thenReturn(froNode);

        // Act — run the exact production sequence concurrently on two threads
        ExecutorService executor = Executors.newFixedThreadPool(THREADS);
        try {
            List<Callable<Boolean>> writers = new ArrayList<>();
            for (int i = 0; i < THREADS; i++) {
                writers.add(() -> FullReadOnlyNotifierMutation.writeSettings(
                        session, SITE_KEY, "<p>off</p>", "<p>on</p>"));
            }
            List<Future<Boolean>> results = executor.invokeAll(writers,
                    TEST_TIMEOUT_SECONDS, TimeUnit.SECONDS);

            // Assert — both writers "succeed" from their own point of view
            for (Future<Boolean> result : results) {
                assertTrue("each concurrent writeSettings call currently returns true",
                        result.get());
            }
        } finally {
            executor.shutdownNow();
        }

        // Assert — THE BUG: node creation happens TWICE for the same site because nothing
        // serializes the hasNode -> addNode window. A fixed implementation must make this
        // verify(siteNode, times(1)).addNode(...) — see the Stage 7 handoff note above.
        verify(siteNode, times(THREADS)).addNode(FronotifierConstants.FRONOTIFIER,
                FronotifierConstants.FRONOTIFIER_NODE_TYPE);
        verify(session, times(THREADS)).save();
    }
}
