/*
 * JXON.js
 * Ratatosk
 *
 * Created by Alexander Ljungberg on March 15th, 2012.
 *
 * Public domain JXON implementation from algorithm #3 of:
 * https://developer.mozilla.org/en/Parsing_and_serializing_XML
 *
 * Any copyright is dedicated to the Public Domain.
 * 
 * Modified by Andrew (Pat) Patterson, 2015 from original at
 * https://github.com/wireload/Ratatosk/blob/master/jxon.js
 * to preserve case of element and attribute names
 */

JXON = function()
{

};

JXON.buildValue = function(sValue)
{
    if (/^\s*$/.test(sValue))
        return null;
    if (/^(true|false)$/i.test(sValue))
        return sValue.toLowerCase() === "true";
    if (isFinite(sValue))
        return parseFloat(sValue);
    // Don't do this - it'll parse anything that looks like a date and get the timezone wrong.
    // https://bugzilla.mozilla.org/show_bug.cgi?id=693077
    //if (isFinite(Date.parse(sValue)))
    //    return new Date(sValue);
    return sValue;
};

JXON.fromXML = function(xmlString)
{
    return JXON.getJXONData((new DOMParser()).parseFromString(xmlString, "text/xml"));
};

JXON.getJXONData = function(oXMLParent)
{
    var vResult = /* put here the default value for empty nodes! */ null,
        nLength = 0,
        sCollectedTxt = "";
    if (oXMLParent.hasAttributes && oXMLParent.hasAttributes())
    {
        vResult = {};
        for (nLength; nLength < oXMLParent.attributes.length; nLength++)
        {
            oItAttr = oXMLParent.attributes.item(nLength);
            vResult["@" + oItAttr.nodeName] = JXON.buildValue(oItAttr.value.replace(/^\s+|\s+$/g, ""));
        }
    }
    if (oXMLParent.hasChildNodes())
    {
        for (var oItChild, sItKey, sItVal, nChildId = 0; nChildId < oXMLParent.childNodes.length; nChildId++)
        {
            oItChild = oXMLParent.childNodes.item(nChildId);
            if (oItChild.nodeType === 4)
            {
                sCollectedTxt += oItChild.nodeValue;
            } /* nodeType is "CDATASection" (4) */
            else if (oItChild.nodeType === 3)
            {
                sCollectedTxt += oItChild.nodeValue.replace(/^\s+|\s+$/g, "");
            } /* nodeType is "Text" (3) */
            else if (oItChild.nodeType === 1 && !oItChild.prefix)
            { /* nodeType is "Element" (1) */
                if (nLength === 0)
                    vResult = {};
                sItKey = oItChild.nodeName;
                sItVal = JXON.getJXONData(oItChild);
                if (vResult.hasOwnProperty(sItKey))
                {
                    if (vResult[sItKey].constructor !== Array)
                        vResult[sItKey] = [vResult[sItKey]];
                    vResult[sItKey].push(sItVal);
                }
                else
                {
                    vResult[sItKey] = sItVal;
                    nLength++;
                }
            }
        }
    }
    if (sCollectedTxt)
        nLength > 0 ? vResult.keyValue = JXON.buildValue(sCollectedTxt) : vResult = JXON.buildValue(sCollectedTxt);
    /* if (nLength > 0) { Object.freeze(vResult); } */
    return vResult;
};

JXON.loadObj = function(oParentObj, oParentEl, oNewDoc)
{
    var nSameIdx,
        vValue,
        oChild;
    for (var sName in oParentObj)
    {
        vValue = oParentObj[sName];
        if (sName === "keyValue")
        {
            if (vValue !== null && vValue !== true)
                oParentEl.appendChild(oNewDoc.createTextNode(String(vValue)));
        }
        else if (sName.charAt(0) === "@")
            oParentEl.setAttribute(sName.slice(1), vValue);
        else
        {
            oChild = oNewDoc.createElement(sName);
            if (vValue && vValue.constructor === Date)
                oChild.appendChild(oNewDoc.createTextNode(vValue.toGMTString()));
            else if (vValue && vValue.constructor === Array)
            {
                for (nSameIdx = 0; nSameIdx < vValue.length; nSameIdx++)
                    JXON.loadObj(vValue[nSameIdx], oChild);
            }
            else if (vValue && vValue instanceof Object)
            {
                JXON.loadObj(vValue, oChild, oNewDoc);
            }
            else if (vValue !== null && vValue !== true)
                oChild.appendChild(oNewDoc.createTextNode(vValue.toString()));

            oParentEl.appendChild(oChild);
            // CPLog.error("Document: " + (new XMLSerializer()).serializeToString(oNewDoc));
        }
    }
};

JXON.toXML = function(oJXONObj, rootName)
{
    var oNewDoc = document.implementation.createDocument("", "", null),
        rootNode = oNewDoc.createElement(rootName || 'xml');
    oNewDoc.appendChild(rootNode);
    JXON.loadObj(oJXONObj, rootNode, oNewDoc);
    return (new XMLSerializer()).serializeToString(oNewDoc);
};
