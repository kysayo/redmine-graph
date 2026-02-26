## View Customize Setting

```
(function() {
  function insertGraph() {
    if (document.getElementById('graph-section')) return;

    var optionsFieldset = document.querySelector('fieldset#options.collapsible');
    if (!optionsFieldset) return;

    var graphFieldset = document.createElement('fieldset');
    graphFieldset.className = 'collapsible';
    graphFieldset.id = 'graph-section';

    var legend = document.createElement('legend');
    legend.setAttribute('onclick', 'toggleFieldset(this);');
    legend.textContent = 'Graph';

    var graphDiv = document.createElement('div');
    graphDiv.id = 'moca-react-graph-root';
    graphDiv.setAttribute('data-combo-left', 'cumulative');
    graphDiv.setAttribute('data-combo-right', 'daily');
    graphDiv.setAttribute('data-pie-group-by', 'status');

  graphDiv.setAttribute('data-api-key',
    (ViewCustomize && ViewCustomize.context &&
     ViewCustomize.context.user &&
     ViewCustomize.context.user.apiKey) || '');


    graphFieldset.appendChild(legend);
    graphFieldset.appendChild(graphDiv);

    optionsFieldset.parentNode.insertBefore(graphFieldset, optionsFieldset.nextSibling);

    var script = document.createElement('script');

    // jsDelivr経由で配信（GitHub Actionsでデプロイ時にキャッシュを自動パージ）
    script.src = 'https://cdn.jsdelivr.net/gh/kysayo/redmine-graph@master/dist/moca-react-graph.iife.js';

    document.head.appendChild(script);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', insertGraph);
  } else {
    insertGraph();
  }
})();
```
