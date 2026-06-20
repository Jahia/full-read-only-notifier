<%@ page language="java" contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="template" uri="http://www.jahia.org/tags/templateLib" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="jcr" uri="http://www.jahia.org/tags/jcr" %>
<%@ taglib prefix="ui" uri="http://www.jahia.org/tags/uiComponentsLib" %>
<%@ taglib prefix="functions" uri="http://www.jahia.org/tags/functions" %>
<%@ taglib prefix="query" uri="http://www.jahia.org/tags/queryLib" %>
<%@ taglib prefix="utility" uri="http://www.jahia.org/tags/utilityLib" %>
<%@ taglib prefix="s" uri="http://www.jahia.org/tags/search" %>
<%--@elvariable id="currentNode" type="org.jahia.services.content.JCRNodeWrapper"--%>
<%--@elvariable id="out" type="java.io.PrintWriter"--%>
<%--@elvariable id="script" type="org.jahia.services.render.scripting.Script"--%>
<%--@elvariable id="scriptInfo" type="java.lang.String"--%>
<%--@elvariable id="workspace" type="java.lang.String"--%>
<%--@elvariable id="renderContext" type="org.jahia.services.render.RenderContext"--%>
<%--@elvariable id="currentResource" type="org.jahia.services.render.Resource"--%>
<%--@elvariable id="url" type="org.jahia.services.render.URLGenerator"--%>
<c:if test="${renderContext.editMode}">
    <fmt:message key='jnt_full_read_only_notifier'/>
</c:if>

<script type="text/javascript">
    /**
     * This is an utility function to set a cookie
     *
     * @param {string} cookieName name of the cookie
     * @param {string} cookieValue value of the cookie
     * @param {number} [expireDays] number of days to set the expire date
     */
    function setCookie(cookieName, cookieValue, expireDays) {
        var expires = '';
        if (expireDays) {
            var d = new Date();
            d.setTime(d.getTime() + (expireDays * 24 * 60 * 60 * 1000));
            expires = '; expires=' + d.toUTCString();
        }
        var secure = (location.protocol === 'https:') ? '; Secure' : '';
        document.cookie = cookieName + '=' + encodeURIComponent(cookieValue) + expires + '; path=/; SameSite=Strict' + secure;
    }

    /**
     * This is an utility function to get a cookie
     *
     * @param {string} cookieName name of the cookie to get
     * @returns {*} the value of the first cookie with the corresponding name or null if not found
     */
    function getCookie(cookieName) {
        var name = cookieName + '=';
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) === ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) === 0) {
                return c.substring(name.length, c.length);
            }
        }
        return null;
    }

    /**
     * This is an utility function to remove a cookie
     *
     * @param {string} cookieName the name of the cookie to rename
     */
    function removeCookie(cookieName) {
        'use strict';
        setCookie(cookieName, '', -1);
    }

    /**
     * Sanitize an HTML string by removing script elements, event-handler attributes,
     * javascript: href/src values, and data: URIs before any DOM injection.
     *
     * IMPORTANT: This is a DEFENCE-IN-DEPTH (blocklist) measure only. The PRIMARY
     * security control is the AUTHORITATIVE server-side sanitization applied at
     * write-time in the GraphQL mutation, behind the siteAdminUsers permission.
     * A blocklist can never be exhaustive; do not rely on this function alone.
     *
     * @param {string} html Raw HTML string from JCR
     * @returns {string} Sanitized HTML string (text content preserved, dangerous markup removed)
     */
    function froSanitize(html) {
        var tmp = document.createElement('div');
        tmp.innerHTML = html;

        // Dangerous URL schemes for any href/src/action-like attribute
        var dangerousHref = /^\s*(javascript|vbscript|data)\s*:/i;
        // Event-handler attributes, inline style, and known scriptable attributes
        var dangerousAttrs = /^(on\w+|style|formaction|srcdoc|background|dynsrc|lowsrc)$/i;
        // URL-bearing attributes (includes SVG xlink:href, used for javascript: vectors)
        var urlAttrs = /^(href|src|action|formaction|xlink:href|poster|data)$/i;

        function cleanse() {
            // Remove element types that are scriptable or carry event/SVG/MathML surfaces
            var dangerous = tmp.querySelectorAll(
                'script,style,iframe,object,embed,form,input,button,select,textarea,' +
                'meta,link,base,svg,math,template,frame,frameset,applet,marquee'
            );
            var removed = false;
            for (var i = dangerous.length - 1; i >= 0; i--) {
                if (dangerous[i].parentNode) {
                    dangerous[i].parentNode.removeChild(dangerous[i]);
                    removed = true;
                }
            }

            // Walk all remaining elements and strip dangerous attributes
            var allElements = tmp.getElementsByTagName('*');
            for (var j = 0; j < allElements.length; j++) {
                var el = allElements[j];
                var attrs = Array.prototype.slice.call(el.attributes);
                for (var k = 0; k < attrs.length; k++) {
                    var attrName = attrs[k].name;
                    var attrValue = attrs[k].value;
                    if (dangerousAttrs.test(attrName)) {
                        el.removeAttribute(attrName);
                        removed = true;
                    } else if (urlAttrs.test(attrName) && dangerousHref.test(attrValue)) {
                        el.removeAttribute(attrName);
                        removed = true;
                    }
                }
            }
            return removed;
        }

        // Recurse after removals: stripping nodes/attributes can reveal new
        // dangerous surfaces that the previous pass did not visit.
        var guard = 0;
        while (cleanse() && guard < 10) {
            guard++;
        }

        return tmp.innerHTML;
    }

    // Accessible name for the close button, resolved server-side from i18n bundle.
    var FRO_CLOSE_LABEL = '<fmt:message key="full_read_only_notifier.close"/>';

    /**
     * Display an inline notification banner above the page content.
     *
     * @param {string} html HTML content to display inside the banner
     */
    function froShowNotification(html) {
        var banner = document.createElement('div');
        banner.setAttribute("id", "froBanner");
        // Announce to assistive technology. The message is informational (not an
        // error), so use a polite status region rather than an assertive alert.
        banner.setAttribute('role', 'status');
        banner.setAttribute('aria-live', 'polite');
        banner.setAttribute('tabindex', '-1');
        banner.setAttribute('lang', document.documentElement.lang || 'en');
        banner.style.cssText = [
            'position:fixed',
            'top:16px',
            'right:16px',
            'z-index:9999',
            'max-width:min(360px, calc(100vw - 32px))',
            'padding:12px 56px 12px 16px',
            'color:#0b3a52',
            'background-color:#e8f4fd',
            'border:1px solid #0b3a52',
            'border-radius:6px',
            'font-family:sans-serif',
            'font-size:14px',
            'line-height:1.5',
            'box-shadow:0 2px 8px rgba(0,0,0,0.15)',
            'outline:none'
        ].join(';');

        var content = document.createElement('div');
        content.innerHTML = froSanitize(html);

        function dismiss() {
            if (banner.parentNode) {
                banner.parentNode.removeChild(banner);
            }
            document.removeEventListener('keydown', onKeyDown);
        }

        function onKeyDown(e) {
            if (e.key === 'Escape' || e.keyCode === 27) {
                dismiss();
            }
        }

        var close = document.createElement('button');
        close.setAttribute('type', 'button');
        close.innerHTML = '&times;';
        close.setAttribute('aria-label', FRO_CLOSE_LABEL);
        close.setAttribute('title', FRO_CLOSE_LABEL);
        close.style.cssText = [
            'position:absolute',
            'top:8px',
            'right:8px',
            'display:flex',
            'align-items:center',
            'justify-content:center',
            'min-width:44px',
            'min-height:44px',
            'background:none',
            'border:none',
            'font-size:20px',
            'line-height:1',
            'color:#0b3a52',
            'cursor:pointer',
            'padding:8px'
        ].join(';');
        close.addEventListener('click', dismiss);

        banner.appendChild(content);
        banner.appendChild(close);
        document.body.appendChild(banner);

        // Dismiss on Escape from anywhere while the banner is shown.
        document.addEventListener('keydown', onKeyDown);

        // Move focus to the banner so keyboard / AT users reach it immediately.
        banner.focus();
    }
</script>

<c:set var="siteNode" value="${renderContext.site}"/>
<fmt:message key='full_read_only_notifier.on.notification' var="content_on"/>
<fmt:message key='full_read_only_notifier.off.notification' var="content_off"/>

<c:forEach items="${jcr:getChildrenOfType(siteNode, 'jnt:fronotifier')}" var="fronotifier">
    <c:if test="${fronotifier.properties['content_off'] ne ''}">
        <c:set var="content_off" value="${fronotifier.properties['content_off']}"/>
    </c:if>
    <c:if test="${fronotifier.properties['content_on'] ne ''}">
        <c:set var="content_on" value="${fronotifier.properties['content_on']}"/>
    </c:if>
</c:forEach>

<c:choose>
    <c:when test="${renderContext.readOnlyStatus eq 'OFF'}">
        <div id="fron-content-off" style="display:none"><c:out value="${content_off}" escapeXml="false"/></div>
        <script type="text/javascript">
            document.addEventListener('DOMContentLoaded', function () {
                var cookie = getCookie('full_read_only');
                if (cookie !== null) {
                    froShowNotification(document.getElementById('fron-content-off').innerHTML);
                    removeCookie('full_read_only');
                }
            });
        </script>
    </c:when>
    <c:otherwise>
        <div id="fron-content-on" style="display:none"><c:out value="${content_on}" escapeXml="false"/></div>
        <script type="text/javascript">
            document.addEventListener('DOMContentLoaded', function () {
                var cookie = getCookie('full_read_only');
                if (cookie === null) {
                    froShowNotification(document.getElementById('fron-content-on').innerHTML);
                    setCookie('full_read_only', 'Y', 1);
                }
            });
        </script>
    </c:otherwise>
</c:choose>
