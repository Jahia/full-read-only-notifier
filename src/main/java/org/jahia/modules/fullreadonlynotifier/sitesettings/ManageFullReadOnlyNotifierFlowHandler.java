package org.jahia.modules.fullreadonlynotifier.sitesettings;

import java.io.Serializable;
import java.math.BigDecimal;
import javax.jcr.RepositoryException;
import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.decorator.JCRSiteNode;
import org.jahia.services.render.RenderContext;
import org.springframework.webflow.execution.RequestContext;

public class ManageFullReadOnlyNotifierFlowHandler implements Serializable {

    private static final String FULL_READ_ONLY_NOTIFIER = "fronotifier";
    private static final String FULL_READ_ONLY_NOTIFIER_NODE_TYPE = "jnt:fronotifier";
    private static final String PROP_CONTENT_OFF = "content_off";
    private static final String PROP_CONTENT_ON = "content_on";

    public JCRNodeWrapper getSiteFullReadOnlyMessage(RequestContext ctx) throws RepositoryException {
        final JCRSiteNode currentSite = getRenderContext(ctx).getSite();
        final JCRNodeWrapper fullReadOnlyNotifierNode;
        if (currentSite.hasNode(FULL_READ_ONLY_NOTIFIER)) {
            fullReadOnlyNotifierNode = currentSite.getNode(FULL_READ_ONLY_NOTIFIER);
        } else {
            fullReadOnlyNotifierNode = currentSite.addNode(FULL_READ_ONLY_NOTIFIER, FULL_READ_ONLY_NOTIFIER_NODE_TYPE);
            currentSite.getSession().save();
        }
        return fullReadOnlyNotifierNode;
    }

    public boolean saveFullReadOnlyMessage(RequestContext ctx, String contentOff, String contentOn) throws RepositoryException {
        final JCRSiteNode currentSite = getRenderContext(ctx).getSite();
        final JCRNodeWrapper fullReadOnlyNotifierNode;
        if (currentSite.hasNode(FULL_READ_ONLY_NOTIFIER)) {
            fullReadOnlyNotifierNode = currentSite.getNode(FULL_READ_ONLY_NOTIFIER);
        } else {
            fullReadOnlyNotifierNode = currentSite.addNode(FULL_READ_ONLY_NOTIFIER, FULL_READ_ONLY_NOTIFIER_NODE_TYPE);
            currentSite.getSession().save();
        }
        fullReadOnlyNotifierNode.setProperty(PROP_CONTENT_OFF, contentOff);
        fullReadOnlyNotifierNode.setProperty(PROP_CONTENT_ON, contentOn);
        fullReadOnlyNotifierNode.saveSession();

        return true;
    }

    private RenderContext getRenderContext(RequestContext ctx) {
        return (RenderContext) ctx.getExternalContext().getRequestMap().get("renderContext");
    }
}
