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
<template:addResources type="javascript" resources="notify.js"/>
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
</script>
<c:choose>
    <c:when test="${renderContext.readOnlyStatus eq 'OFF'}">
        <script type="text/javascript">
            $(document).ready(function () {
            var cookie = getCookie('full_read_only');

            if (cookie !== null) {
                $.notify("<fmt:message key='full_read_only_notifier.off.notification'/>", {
                    autoHide: false,
                    className: "info"
                    });
                    removeCookie('full_read_only');
                }
            });
    </script>
    </c:when>
    <c:otherwise>

            <script type="text/javascript">
                $(document).ready(function () {
                var cookie = getCookie('full_read_only');

                    if (cookie === null) {
                        $.notify("<fmt:message key='full_read_only_notifier.on.notification'/>", {
                            autoHide: false,
                            className: "info"
                        });
                        setCookie('full_read_only', 'Y', {expires: 1});
                    }
                });
            </script>
    </c:otherwise>
</c:choose>
