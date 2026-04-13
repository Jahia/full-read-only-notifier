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
        document.cookie = cookieName + '=' + cookieValue + expires + '; path=/';
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
     * Display an inline notification banner above the page content.
     *
     * @param {string} html HTML content to display inside the banner
     */
    function froShowNotification(html) {
        var banner = document.createElement('div');
        banner.style.cssText = [
            'position:fixed',
            'top:16px',
            'right:16px',
            'z-index:9999',
            'max-width:360px',
            'padding:12px 40px 12px 16px',
            'color:#3a87ad',
            'background-color:#d9edf7',
            'border:1px solid #bce8f1',
            'border-radius:6px',
            'font-family:sans-serif',
            'font-size:14px',
            'line-height:1.5',
            'box-shadow:0 2px 8px rgba(0,0,0,0.15)'
        ].join(';');

        var content = document.createElement('div');
        content.innerHTML = html;

        var close = document.createElement('button');
        close.innerHTML = '&times;';
        close.style.cssText = [
            'position:absolute',
            'top:50%',
            'right:12px',
            'transform:translateY(-50%)',
            'background:none',
            'border:none',
            'font-size:20px',
            'line-height:1',
            'color:#3a87ad',
            'cursor:pointer',
            'padding:0'
        ].join(';');
        close.addEventListener('click', function () {
            document.body.removeChild(banner);
        });

        banner.appendChild(content);
        banner.appendChild(close);
        document.body.appendChild(banner);
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
                    setCookie('full_read_only', 'Y', {expires: 1});
                }
            });
        </script>
    </c:otherwise>
</c:choose>
