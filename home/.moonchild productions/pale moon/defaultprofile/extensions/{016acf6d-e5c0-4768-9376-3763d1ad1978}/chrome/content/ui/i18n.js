/*
* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

var i18n;

if (typeof ext != "undefined")
  i18n = ext.i18n;
else if (typeof chrome != "undefined")
  // TODO: This check only exist for backwards compatibility, while the Safari
  // port isn't merged into the adblockpluschrome repo. So this branch should
  // be removed when the Safari port was merged.
  i18n = chrome.i18n;
else
{
  // Using Firefox' approach on i18n instead

  // Randomize URI to work around bug 719376
  var pageName = location.pathname.replace(/.*\//, '').replace(/\..*?$/, '');
  var stringBundle = Services.strings.createBundle("chrome://adblockplus/locale/" + pageName +
    ".properties?" + Math.random());

  function getI18nMessage(key)
  {
    return {
      "message": stringBundle.GetStringFromName(key)
    };
  }

  i18n = (function()
  {
    function getText(message, args)
    {
      var text = message.message;
      var placeholders = message.placeholders;

      if (!args || !placeholders)
        return text;

      for (var key in placeholders)
      {
        var content = placeholders[key].content;
        if (!content)
          continue;

        var index = parseInt(content.slice(1), 10);
        if (isNaN(index))
          continue;

        var replacement = args[index - 1];
        if (typeof replacement === "undefined")
          continue;

        text = text.split("$" + key + "$").join(replacement);
      }
      return text;
    }

    return {
      getMessage: function(key, args)
      {
        try{
          var message = getI18nMessage(key);
          return getText(message, args);
        }
        catch(e)
        {
          Cu.reportError(e);
          return "Missing translation: " + key;
        }
      }
    };
  })();
}

// Inserts i18n strings into matching elements. Any inner HTML already in the element is
// parsed as JSON and used as parameters to substitute into placeholders in the i18n
// message.
i18n.setElementText = function(element, stringName, arguments)
{
  function processString(str, element)
  {
    var match = /^(.*?)<(a|strong)>(.*?)<\/\2>(.*)$/.exec(str);
    if (match)
    {
      processString(match[1], element);

      var e = document.createElement(match[2]);
      processString(match[3], e);
      element.appendChild(e);

      processString(match[4], element);
    }
    else
      element.appendChild(document.createTextNode(str));
  }

  while (element.lastChild)
    element.removeChild(element.lastChild);
  processString(i18n.getMessage(stringName, arguments), element);
}

// Loads i18n strings
function loadI18nStrings()
{
  var nodes = document.querySelectorAll("[class^='i18n_']");
  for(var i = 0; i < nodes.length; i++)
  {
    var node = nodes[i];
    var arguments = JSON.parse("[" + node.textContent + "]");
    if (arguments.length == 0)
      arguments = null;

    var className = node.className;
    if (className instanceof SVGAnimatedString)
      className = className.animVal;
    var stringName = className.split(/\s/)[0].substring(5);

    i18n.setElementText(node, stringName, arguments);
  }
}

// Provides a more readable string of the current date and time
function i18n_timeDateStrings(when)
{
  var d = new Date(when);
  var timeString = d.toLocaleTimeString();

  var now = new Date();
  if (d.toDateString() == now.toDateString())
    return [timeString];
  else
    return [timeString, d.toLocaleDateString()];
}

// Fill in the strings as soon as possible
window.addEventListener("DOMContentLoaded", loadI18nStrings, true);
