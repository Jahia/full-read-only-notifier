<%@ page language="java" contentType="text/html;charset=UTF-8" %>
<%@ page import="org.jahia.registries.ServicesRegistry"%>
<%@ page import="org.jahia.services.templates.JahiaTemplateManagerService"%>
<%@ taglib prefix="template" uri="http://www.jahia.org/tags/templateLib" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="jcr" uri="http://www.jahia.org/tags/jcr" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="functions" uri="http://www.jahia.org/tags/functions" %>
<%@ taglib prefix="user" uri="http://www.jahia.org/tags/user" %>
<%@ taglib prefix="ui" uri="http://www.jahia.org/tags/uiComponentsLib" %>
<%--@elvariable id="currentNode" type="org.jahia.services.content.JCRNodeWrapper"--%>
<%--@elvariable id="out" type="java.io.PrintWriter"--%>
<%--@elvariable id="script" type="org.jahia.services.render.scripting.Script"--%>
<%--@elvariable id="scriptInfo" type="java.lang.String"--%>
<%--@elvariable id="workspace" type="java.lang.String"--%>
<%--@elvariable id="renderContext" type="org.jahia.services.render.RenderContext"--%>
<%--@elvariable id="currentResource" type="org.jahia.services.render.Resource"--%>
<%--@elvariable id="url" type="org.jahia.services.render.URLGenerator"--%>
<%--@elvariable id="mailSettings" type="org.jahia.services.mail.MailSettings"--%>
<%--@elvariable id="flowRequestContext" type="org.springframework.webflow.execution.RequestContext"--%>
<%--@elvariable id="flowExecutionUrl" type="java.lang.String"--%>
<%--@elvariable id="issueTemplate" type="org.jahia.services.content.JCRNodeWrapper"--%>
<%--@elvariable id="issue" type="org.jahia.services.content.JCRNodeWrapper"--%>

<template:addResources type="javascript" resources="jquery.min.js,jquery.form.js,jquery-ui.min.js,jquery.blockUI.js,workInProgress.js,admin-bootstrap.js"/>
<template:addResources type="css" resources="admin-bootstrap.css"/>
<template:addResources type="css" resources="jquery-ui.smoothness.css,jquery-ui.smoothness-jahia.css"/>

<fmt:message var="i18nUpdateFailed" key="robotstxt.errors.update.failed"/><c:set var="i18nUpdateFailed" value="${fn:escapeXml(i18nUpdateFailed)}"/>

<script type="text/javascript">

    function showFullReadOnlyNotifierErrors(message) {
        $("#fullReadOnlyNotifierFormErrorMessages").text(message);
        $("#fullReadOnlyNotifierFormErrorContainer").show();
    }

    function hideFullReadOnlyNotifierErrors() {
        $("#fullReadOnlyNotifierFormErrorMessages").empty();
        $("#fullReadOnlyNotifierFormErrorContainer").hide();
    }

    function submitFullReadOnlyNotifierForm(act, name, type) {
        $('#fullReadOnlyNotifierFormAction').val(act);
        if (name) {
            $('#fullReadOnlyNotifierActionName').val(name);
        }
        if (type) {
            $('#fullReadOnlyNotifierActionType').val(type);
        }

        $('#fullReadOnlyNotifierWebflowForm').submit();
    }

    $(document).ready(function () {
        $("#fullReadOnlyNotifierFormErrorClose").bind("click", function () {
            hideFullReadOnlyNotifierErrors();
        });
        var fullReadOnlyNotifierFormOptions = {
            beforeSubmit: function (arr, $form, options) {
            },
            success: function () {
                submitFullReadOnlyNotifierForm("actionPerformed", $("#fullReadOnlyNotifierName").val(), "${'updated'}");
            },
            error: function () {

                showFullReadOnlyNotifierErrors("${i18nUpdateFailed}");
            }
        };
        $('#fullReadOnlyNotifierForm').ajaxForm(fullReadOnlyNotifierFormOptions);
    });</script>

<div>

    <c:url var="actionUrl" value="${url.baseEdit}${fullReadOnlyNotifier.path}"/>
    <h2><fmt:message key="fullReadOnlyNotifier.edit"/>

        <div class="box-1">
            <div class="alert alert-error" style="display: none" id="fullReadOnlyNotifierFormErrorContainer">
                <button type="button" class="close" id="fullReadOnlyNotifierFormErrorClose">&times;</button>
                <span id="fullReadOnlyNotifierFormErrorMessages"></span>
            </div>

            <form action="${flowExecutionUrl}" method="post" style="display: inline;" id="fullReadOnlyNotifierWebflowForm">
                <input type="hidden" name="name" id="fullReadOnlyNotifierActionName"/>
                <input type="hidden" name="type" id="fullReadOnlyNotifierActionType"/>
                <input type="hidden" name="model" value="fullReadOnlyNotifier"/>
                <input type="hidden" name="_eventId" id="fullReadOnlyNotifierFormAction"/>


                <fieldset>
                    <div class="container-fluid">
                        <div class="row-fluid">
                            <div class="span4">
                                <c:set var="fullReadOnlyNotifierContentOff" value="${fullReadOnlyNotifier.properties['content_off']}"/>
                                <label for="fullReadOnlyNotifierContentOff"><fmt:message key="label.content_off"/>: <span class="text-error"></span></label>
                                <textarea rows="10" name="content_off" form="fullReadOnlyNotifierWebflowForm" class="span12" id="fullReadOnlyNotifierContentOff">${fn:escapeXml(fullReadOnlyNotifierContentOff)}</textarea>
                            </div>
                        </div>
                        <div class="row-fluid">
                            <div class="span4">
                                <c:set var="fullReadOnlyNotifierContentOn" value="${fullReadOnlyNotifier.properties['content_on']}"/>
                                <label for="fullReadOnlyNotifierContentOn"><fmt:message key="label.content_on"/>: <span class="text-error"></span></label>
                                <textarea rows="10" name="content_on" form="fullReadOnlyNotifierWebflowForm" class="span12" id="fullReadOnlyNotifierContentOn">${fn:escapeXml(fullReadOnlyNotifierContentOn)}</textarea>
                            </div>
                        </div>

                    </div>
                </fieldset>

                <fieldset>
                    <div class="container-fluid">
                        <div class="row-fluid">
                            <div class="span12">
                                <button class="btn btn-primary" onclick="submitFullReadOnlyNotifierForm('save');
                                        return false;">
                                    <i class="icon-${'share'} icon-white"></i>
                                    &nbsp;<fmt:message key="label.${'update'}"/>
                                </button>
                                <button class="btn" onclick="submitFullReadOnlyNotifierForm('cancel');
                                        return false;">
                                    <i class="icon-ban-circle"></i>
                                    &nbsp;<fmt:message key="label.cancel"/>
                                </button>
                            </div>
                        </div>
                    </div>
                </fieldset>
            </form>
        </div>
</div>