package org.jahia.community.fullreadonlynotifier.graphql;

import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.JCRSessionWrapper;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.BrokenBarrierException;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.junit.Assert.assertTrue;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * U3 — pins the FIXED concurrency contract of
 * {@link FullReadOnlyNotifierMutation#writeSettings}: the
 * {@code hasNode("fronotifier") → addNode → setProperty → save()} sequence is serialized
 * (class-level {@code SETTINGS_WRITE_LOCK}), so two concurrent first-writes for the same
 * site create the settings node exactly ONCE — the losing thread observes the winner's
 * node via {@code hasNode() == true} and still completes successfully against it.
 *
 * <p>History: this began as a characterization test for the unfixed race (both threads
 * passed the {@code hasNode} check and {@code addNode} fired twice); the race was fixed in
 * Stage 7 and the assertion inverted to {@code times(1)} per the original handoff note.
 *
 * <p>Determinism note (two barriers, two roles):
 * <ul>
 *   <li>The START barrier makes both writers enter {@code writeSettings} simultaneously,
 *       so they genuinely contend for the lock on every run.</li>
 *   <li>The barrier INSIDE the {@code hasNode} stub is a <em>serialization probe</em>:
 *       under the fix the two threads can never be inside the check-create window at the
 *       same time, so the barrier never trips — the first thread times out (breaking the
 *       barrier) and the second gets an immediate {@link BrokenBarrierException}; both are
 *       swallowed and the stub returns the current node state. If the lock ever regresses,
 *       both threads DO meet inside the window, the barrier trips, both observe
 *       {@code hasNode == false}, {@code addNode} fires twice, and the {@code times(1)}
 *       verification fails deterministically. The assertion is on the {@code addNode}
 *       invocation count only (not on ordering), per the Stage 4 flakiness guidance.</li>
 * </ul>
 */
@RunWith(MockitoJUnitRunner.class)
public class FullReadOnlyNotifierMutationConcurrencyTest {

    private static final String SITE_KEY = "testSite";
    private static final String SITE_PATH = FronotifierConstants.SITES_ROOT + SITE_KEY;
    private static final int THREADS = 2;
    private static final long TEST_TIMEOUT_SECONDS = 30;
    /** How long the serialization probe waits to (not) meet the other thread. */
    private static final long RACE_WINDOW_SECONDS = 2;

    @Mock
    private JCRSessionWrapper session;

    @Mock
    private JCRNodeWrapper siteNode;

    @Mock
    private JCRNodeWrapper froNode;

    @Test
    public void writeSettings_concurrentFirstWrites_createNodeExactlyOnce_loserUpdatesWinnersNode()
            throws Exception {
        // Arrange — both threads target the same site whose fronotifier node does not exist
        // yet. State is tracked like a real repository: hasNode reflects whether addNode has
        // already run, so the losing (serialized-out) thread sees the winner's node.
        final AtomicBoolean nodeCreated = new AtomicBoolean(false);
        final CyclicBarrier bothWritersStart = new CyclicBarrier(THREADS);
        final CyclicBarrier serializationProbe = new CyclicBarrier(THREADS);
        when(session.getNode(SITE_PATH)).thenReturn(siteNode);
        when(siteNode.hasNode(FronotifierConstants.FRONOTIFIER)).thenAnswer(invocation -> {
            try {
                serializationProbe.await(RACE_WINDOW_SECONDS, TimeUnit.SECONDS);
                // Reached only if BOTH threads are inside the check-create window at
                // once — i.e. the SETTINGS_WRITE_LOCK serialization has regressed.
            } catch (TimeoutException | BrokenBarrierException expectedWhenSerialized) {
                // Expected under the fix: the other thread is held outside the lock
                // (winner times out and breaks the barrier; loser arrives later and
                // gets the broken barrier immediately).
            }
            return nodeCreated.get();
        });
        when(siteNode.addNode(FronotifierConstants.FRONOTIFIER,
                FronotifierConstants.FRONOTIFIER_NODE_TYPE)).thenAnswer(invocation -> {
                    nodeCreated.set(true);
                    return froNode;
                });
        when(siteNode.getNode(FronotifierConstants.FRONOTIFIER)).thenReturn(froNode);

        // Act — run the exact production sequence concurrently on two threads
        ExecutorService executor = Executors.newFixedThreadPool(THREADS);
        try {
            List<Callable<Boolean>> writers = new ArrayList<>();
            for (int i = 0; i < THREADS; i++) {
                writers.add(() -> {
                    bothWritersStart.await(TEST_TIMEOUT_SECONDS, TimeUnit.SECONDS);
                    return FullReadOnlyNotifierMutation.writeSettings(
                            session, SITE_KEY, "<p>off</p>", "<p>on</p>");
                });
            }
            List<Future<Boolean>> results = executor.invokeAll(writers,
                    TEST_TIMEOUT_SECONDS, TimeUnit.SECONDS);

            // Assert — both writers succeed: the winner creates the node, the loser
            // updates the winner's node instead of failing or re-creating it.
            for (Future<Boolean> result : results) {
                assertTrue("each concurrent writeSettings call must return true",
                        result.get());
            }
        } finally {
            executor.shutdownNow();
        }

        // Assert — THE FIXED CONTRACT: node creation happens exactly ONCE for the same
        // site because SETTINGS_WRITE_LOCK serializes the hasNode -> addNode window; the
        // second writer takes the getNode branch. Each writer still saves its own update.
        verify(siteNode, times(1)).addNode(FronotifierConstants.FRONOTIFIER,
                FronotifierConstants.FRONOTIFIER_NODE_TYPE);
        verify(siteNode, times(1)).getNode(FronotifierConstants.FRONOTIFIER);
        verify(session, times(THREADS)).save();
    }
}
